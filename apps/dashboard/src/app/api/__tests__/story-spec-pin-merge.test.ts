/**
 * Tests for the StorySpec writer route (spec §5.2 step 1) — specifically the
 * pin-merge fix: a prose revision must not silently discard pins Task 9's
 * entity-form edits persisted onto the variant.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockWriteStorySpec = vi.fn();
vi.mock("@demokit-ai/ai", () => ({
  writeStorySpec: (...args: unknown[]) => mockWriteStorySpec(...args),
}));

const findFirstDemo = vi.fn();
const findFirstVariant = vi.fn();
const findFirstProject = vi.fn();
const findManySources = vi.fn();
const whereMock = vi.fn().mockResolvedValue(undefined);
const setMock = vi.fn(() => ({ where: whereMock }));
const updateMock = vi.fn(() => ({ set: setMock }));

vi.mock("@/lib/api/db", () => ({
  getDb: () => ({
    query: {
      demos: { findFirst: (...args: unknown[]) => findFirstDemo(...args) },
      demoVariants: { findFirst: (...args: unknown[]) => findFirstVariant(...args) },
      projects: { findFirst: (...args: unknown[]) => findFirstProject(...args) },
      projectSources: { findMany: (...args: unknown[]) => findManySources(...args) },
    },
    update: (...args: unknown[]) => updateMock(...args),
  }),
}));

import { POST } from "../projects/[id]/demos/[demoId]/variants/[variantId]/story-spec/route";

const schemaWithModels = {
  models: {
    Customer: { properties: { tier: {} } },
    Order: { properties: { status: {} } },
  },
  relationships: [],
};

function makeRequest(prose: string): Request {
  return new Request(
    "http://localhost/api/projects/project-1/demos/demo-1/variants/variant-1/story-spec",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prose }),
    }
  );
}

function callRoute(prose: string) {
  return POST(makeRequest(prose), {
    params: Promise.resolve({ id: "project-1", demoId: "demo-1", variantId: "variant-1" }),
  });
}

describe("POST .../variants/[variantId]/story-spec — pin merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereMock.mockResolvedValue(undefined);
    setMock.mockImplementation(() => ({ where: whereMock }));
    updateMock.mockImplementation(() => ({ set: setMock }));
    process.env.ANTHROPIC_API_KEY = "test-key";

    findFirstDemo.mockResolvedValue({ id: "demo-1", projectId: "project-1" });
    findFirstProject.mockResolvedValue({ id: "project-1", schema: schemaWithModels });
    findManySources.mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("carries forward existing pins whose paths the new spec does not define", async () => {
    findFirstVariant.mockResolvedValue({
      id: "variant-1",
      demoId: "demo-1",
      storySpec: {
        version: 1,
        scenario: "old scenario",
        seed: 7,
        counts: {},
        pins: [{ path: "Customer.tier", value: "silver" }],
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
      },
    });
    mockWriteStorySpec.mockResolvedValue({
      spec: {
        version: 1,
        scenario: "new scenario",
        seed: 7,
        counts: { Customer: 5 },
        pins: [{ path: "Order.status", value: "shipped" }],
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
      },
      warnings: [],
    });

    const response = await callRoute("Tell a new story");
    const body = await response.json();

    expect(body.spec.pins).toEqual(
      expect.arrayContaining([
        { path: "Customer.tier", value: "silver" },
        { path: "Order.status", value: "shipped" },
      ])
    );
    expect(body.spec.pins).toHaveLength(2);

    // Persisted spec (what's written to the DB) matches what's returned.
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storySpec: expect.objectContaining({
          pins: expect.arrayContaining([
            { path: "Customer.tier", value: "silver" },
            { path: "Order.status", value: "shipped" },
          ]),
        }),
      })
    );
  });

  it("lets the new spec's pin win on a path collision", async () => {
    findFirstVariant.mockResolvedValue({
      id: "variant-1",
      demoId: "demo-1",
      storySpec: {
        version: 1,
        scenario: "old scenario",
        seed: 7,
        counts: {},
        pins: [{ path: "Customer.tier", value: "silver" }],
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
      },
    });
    mockWriteStorySpec.mockResolvedValue({
      spec: {
        version: 1,
        scenario: "new scenario",
        seed: 7,
        counts: {},
        pins: [{ path: "Customer.tier", value: "gold" }],
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
      },
      warnings: [],
    });

    const response = await callRoute("Tell a new story");
    const body = await response.json();

    expect(body.spec.pins).toEqual([{ path: "Customer.tier", value: "gold" }]);
  });

  it("does not crash when the variant has no existing storySpec (or a missing pins array)", async () => {
    findFirstVariant.mockResolvedValue({ id: "variant-1", demoId: "demo-1", storySpec: null });
    mockWriteStorySpec.mockResolvedValue({
      spec: {
        version: 1,
        scenario: "brand new scenario",
        seed: 42,
        counts: {},
        pins: [{ path: "Order.status", value: "shipped" }],
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
      },
      warnings: [],
    });

    const response = await callRoute("Tell a story");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.spec.pins).toEqual([{ path: "Order.status", value: "shipped" }]);

    // Also exercise a storySpec present but missing a `pins` array entirely
    // (malformed/legacy row) — `existing?.pins ?? []` must not throw.
    findFirstVariant.mockResolvedValue({
      id: "variant-1",
      demoId: "demo-1",
      storySpec: {
        version: 1,
        scenario: "old",
        seed: 1,
        counts: {},
        anchors: [],
        trends: [],
        events: [],
        fieldRules: {},
        // pins intentionally omitted
      },
    });

    const secondResponse = await callRoute("Tell another story");
    const secondBody = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondBody.spec.pins).toEqual([{ path: "Order.status", value: "shipped" }]);
  });
});
