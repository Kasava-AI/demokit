/**
 * Tests for the coverage route's shape-drift addition (Phase 5 Task 6).
 * Task 6 lands the read side of Task 5's classifier: the route now also
 * selects recent shape-observed `unmatched_request` rows, reduces them to
 * one observation per distinct method+path pair, runs `detectShapeDrift`
 * against the project's synced schema, and returns the rolled-up result as
 * an additive `drift` field alongside the existing `totals`/`topPaths`.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DemokitSchema } from "@demokit-ai/core";

const findFirstProjects = vi.fn();
const findFirstFixtures = vi.fn();

// Queue of row-sets consumed in call order by the route's three `db.select`
// calls when a schema is present (totals, topPaths, shape rows) or the
// first two only when it isn't (the route skips the shape query entirely
// when there's no schema to diff against).
const selectQueue: unknown[][] = [];

function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    groupBy: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

const select = vi.fn(() => makeChain(selectQueue.shift() ?? []));

vi.mock("@/lib/api/db", () => ({
  getDb: () => ({
    query: {
      projects: { findFirst: (...args: unknown[]) => findFirstProjects(...args) },
      fixtures: { findFirst: (...args: unknown[]) => findFirstFixtures(...args) },
    },
    select: (...args: unknown[]) => select(...args),
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

  it("keeps only the latest observation per distinct method+path pair", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: USER_ENDPOINT_SCHEMA });
    // Rows are returned latest-first (route orders by timestamp desc); the
    // older duplicate for the same pair must not also get diffed.
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

  it("404s when the fixture doesn't exist", async () => {
    findFirstFixtures.mockResolvedValue(null);

    const response = await callRoute();

    expect(response.status).toBe(404);
  });
});
