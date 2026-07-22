/**
 * Tests for the coverage route's shape-drift addition (Phase 5 Task 6).
 * Task 6 lands the read side of Task 5's classifier: the route now also
 * selects recent shape-observed `unmatched_request` rows, reduces them to
 * one observation per distinct method+path pair, runs `detectShapeDrift`
 * against the project's synced schema, and returns the rolled-up result as
 * an additive `drift` field alongside the existing `totals`/`topPaths`.
 *
 * Latest-per-pair dedup and the 200-distinct-pair cap are expressed in SQL
 * (`DISTINCT ON`, wrapped in a recency-ordered outer query — see the route's
 * comments) rather than in a bounded raw-row select + JS reduction. A mocked
 * DB can't exercise real `DISTINCT ON` semantics, so this file verifies two
 * things instead: (1) the query is *wired* correctly — `selectDistinctOn` is
 * called with the right distinct/order columns, and the outer query orders
 * by recency and caps at the right number — and (2) the route's data
 * handling is correct *given* what such a query would return (a data set
 * already deduped to one row per pair, ordered latest-first).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DemokitSchema } from "@demokit-ai/core";
import { apiCallLogs } from "@db";

const findFirstProjects = vi.fn();
const findFirstFixtures = vi.fn();

// Queue of row-sets consumed in call order by the route's `db.select` calls
// when a schema is present (totals, topPaths, then the outer recency-capped
// shape-rows query) or the first two only when it isn't (the route skips
// the shape query entirely when there's no schema to diff against).
// `db.selectDistinctOn` (the inner per-pair subquery) is mocked separately
// below and never consumes this queue — its chain is only ever fed into
// `.as(...)`/`.from(...)`, never awaited directly.
const selectQueue: unknown[][] = [];

function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    as: vi.fn(() => ({})),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

const select = vi.fn(() => makeChain(selectQueue.shift() ?? []));
const selectDistinctOn = vi.fn(() => makeChain([]));

vi.mock("@/lib/api/db", () => ({
  getDb: () => ({
    query: {
      projects: { findFirst: (...args: unknown[]) => findFirstProjects(...args) },
      fixtures: { findFirst: (...args: unknown[]) => findFirstFixtures(...args) },
    },
    select: (...args: unknown[]) => select(...args),
    selectDistinctOn: (...args: unknown[]) => selectDistinctOn(...args),
  }),
}));

import { GET } from "../projects/[id]/fixtures/[fixtureId]/coverage/route";

function callRoute() {
  return GET(new Request("http://localhost/api/projects/project-1/fixtures/fixture-1/coverage"), {
    params: Promise.resolve({ id: "project-1", fixtureId: "fixture-1" }),
  });
}

const USER_ENDPOINT_SCHEMA: DemokitSchema = {
  info: { title: "Test API", version: "1.0.0" },
  endpoints: [
    {
      method: "GET",
      path: "/users/{id}",
      pathParams: [],
      queryParams: [],
      tags: [],
      responses: {
        "200": {
          statusCode: "200",
          content: {
            "application/json": {
              name: "User",
              type: "object",
              properties: {
                id: { name: "id", type: "string" },
                email: { name: "email", type: "string", required: true },
              },
            },
          },
        },
      },
    },
  ],
  models: {},
  relationships: [],
};

describe("GET .../fixtures/[fixtureId]/coverage — shape drift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    findFirstFixtures.mockResolvedValue({ id: "fixture-1", projectId: "project-1" });
  });

  it("returns drift: null when the project has no synced schema", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: null });
    selectQueue.push([], []); // totals, topPaths — no shape query when there's no schema

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift).toBeNull();
    // Existing fields stay intact — additive response change only.
    expect(body.totals).toEqual([]);
    expect(body.topPaths).toEqual([]);
    expect(body.since).toEqual(expect.any(String));
  });

  it("computes drift from seeded shape rows against the project's synced schema", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    selectQueue.push(
      [], // totals
      [], // topPaths
      [
        {
          method: "GET",
          path: "/users/1",
          shape: { t: "object", keys: { id: { t: "string" } } }, // email missing
        },
      ]
    );

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift).not.toBeNull();
    expect(body.drift.observedCount).toBe(1);
    expect(body.drift.matchedCount).toBe(1);
    expect(body.drift.findings).toEqual([
      expect.objectContaining({
        kind: "missing_key",
        key: "email",
        endpointPath: "/users/{id}",
        occurrences: 1,
      }),
    ]);
  });

  it("rolls up findings that differ only by concrete path into one row with an occurrences count", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    selectQueue.push(
      [],
      [],
      [
        { method: "GET", path: "/users/1", shape: { t: "object", keys: { id: { t: "string" } } } },
        { method: "GET", path: "/users/2", shape: { t: "object", keys: { id: { t: "string" } } } },
        { method: "GET", path: "/users/3", shape: { t: "object", keys: { id: { t: "string" } } } },
      ]
    );

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift.findings).toHaveLength(1);
    expect(body.drift.findings[0]).toEqual(
      expect.objectContaining({ kind: "missing_key", key: "email", occurrences: 3 })
    );
    expect(body.drift.observedCount).toBe(3);
    expect(body.drift.matchedCount).toBe(3);
  });

  it("keeps only the latest observation per distinct method+path pair (defense-in-depth if two rows for the same pair ever reach this layer)", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    // In production `DISTINCT ON` guarantees exactly one row per pair before
    // this ever runs; this proves the route's own reduction (kept as a
    // defensive belt-and-suspenders layer — see latestShapePerPath's doc
    // comment) still resolves correctly if that invariant were ever
    // violated. Rows are recency-ordered latest-first (matching what the
    // outer query's `orderBy(desc(timestamp))` produces); the older
    // duplicate for the same pair must not also get diffed.
    selectQueue.push(
      [],
      [],
      [
        {
          method: "GET",
          path: "/users/1",
          shape: { t: "object", keys: { id: { t: "string" }, email: { t: "string" } } }, // latest: clean
        },
        {
          method: "GET",
          path: "/users/1",
          shape: { t: "object", keys: { id: { t: "string" } } }, // older: missing email — must be ignored
        },
      ]
    );

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift.observedCount).toBe(1);
    expect(body.drift.findings).toEqual([]);
  });

  it("requests DISTINCT ON (method, path) ordered by (method, path, timestamp DESC) — the latest-wins tiebreaker", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    selectQueue.push([], [], []);

    await callRoute();

    expect(selectDistinctOn).toHaveBeenCalledTimes(1);
    const [distinctColumns] = selectDistinctOn.mock.calls[0]!;
    expect(distinctColumns).toEqual([apiCallLogs.method, apiCallLogs.path]);

    const innerChain = selectDistinctOn.mock.results[0]!.value as { orderBy: ReturnType<typeof vi.fn> };
    expect(innerChain.orderBy).toHaveBeenCalledTimes(1);
    const orderByArgs = innerChain.orderBy.mock.calls[0]!;
    // DISTINCT ON's own leading ORDER BY columns must match the distinct
    // list (method, path); the third arg is desc(timestamp) — a fresh SQL
    // wrapper object each call, so asserted for presence, not identity.
    expect(orderByArgs[0]).toBe(apiCallLogs.method);
    expect(orderByArgs[1]).toBe(apiCallLogs.path);
    expect(orderByArgs[2]).toBeDefined();
  });

  it("orders the outer (recency-capping) query by timestamp DESC and caps it at 200", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    selectQueue.push([], [], []);

    await callRoute();

    // select() calls: #1 totals, #2 topPaths, #3 the outer shape-rows query.
    expect(select).toHaveBeenCalledTimes(3);
    const outerChain = select.mock.results[2]!.value as {
      orderBy: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
    };
    expect(outerChain.orderBy).toHaveBeenCalledTimes(1);
    expect(outerChain.limit).toHaveBeenCalledWith(200);
  });

  it("keeps exactly the 200 most recent distinct pairs when more are observed", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    // Simulates what a DISTINCT-ON + recency-ordered query returns: one row
    // per pair, already sorted latest-first. Index 0 is the most recent;
    // index 204 is the oldest of this batch (still within the 7-day window
    // the WHERE clause enforces, just not among the 200 most recent pairs).
    const rows = Array.from({ length: 205 }, (_, i) => ({
      method: "GET",
      path: `/pair-${i}`,
      shape: { t: "object", keys: {} },
    }));
    selectQueue.push([], [], rows);

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift.observedCount).toBe(200);
    expect(body.drift.findings).toHaveLength(200); // each pair is unmatched -> one finding each, no rollup collapse
    // The 200 most recent (indices 0-199) survive...
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/pair-0")).toBe(true);
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/pair-199")).toBe(true);
    // ...the oldest 5 of this batch (indices 200-204) do not.
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/pair-200")).toBe(false);
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/pair-204")).toBe(false);
  });

  it("a low-frequency, older-but-in-window pair survives alongside a high-volume pair (the eviction case DISTINCT ON fixes)", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    // Under the old bounded-raw-row-select design, a chatty endpoint's sheer
    // volume of recent rows could push a genuinely-recent-but-infrequent
    // pair's only row past the raw-row window before dedup ever ran.
    // DISTINCT ON operates over the full filtered set, so a high-volume pair
    // contributes exactly ONE row here regardless of how many thousands of
    // raw events it generated — leaving plenty of room under the 200 cap
    // for every other distinct pair, however infrequent or comparatively
    // old (but still in-window). Simulated directly as what such a query
    // returns: two rows, one per pair.
    selectQueue.push(
      [],
      [],
      [
        // The high-volume pair's single (latest) row — recent.
        { method: "GET", path: "/users/1", shape: { t: "object", keys: { id: { t: "string" } } } },
        // The low-frequency pair's single row — older, but still in the
        // 7-day window (the WHERE clause, not this test, enforces that).
        { method: "GET", path: "/rare-endpoint", shape: { t: "object", keys: {} } },
      ]
    );

    const response = await callRoute();
    const body = await response.json();

    expect(body.drift.observedCount).toBe(2);
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/users/1")).toBe(true);
    expect(body.drift.findings.some((f: { path: string }) => f.path === "/rare-endpoint")).toBe(true);
  });

  it("404s when the fixture doesn't exist", async () => {
    findFirstFixtures.mockResolvedValue(null);

    const response = await callRoute();

    expect(response.status).toBe(404);
  });
});
