/**
 * Tests for the generate-story route (Phase 4 Task 8 extraction) — this is
 * the parity oracle for the route's HTTP-layer responsibilities now that
 * the actual persistence logic (generation insert, unreviewedRows,
 * draft/publish split, linter) lives in createStoryDraftGeneration
 * (lib/services/story-draft.ts). The route's job, post-extraction, is just:
 * parse/authz -> resolve schema+spec -> call the service -> shape the
 * HTTP response. These tests assert the route calls the service with
 * `source: 'dashboard'` and `allowBootstrapPublish: true` (today's
 * behavior) and that existing 404/409 guards are untouched.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateStoryDraftGeneration = vi.fn();
vi.mock("@/lib/services/story-draft", () => ({
  createStoryDraftGeneration: (...args: unknown[]) => mockCreateStoryDraftGeneration(...args),
}));

const findFirstProjects = vi.fn();
const findFirstFixtures = vi.fn();
const findFirstDemoVariants = vi.fn();
const findFirstDemos = vi.fn();
const findManyProjectSources = vi.fn();
const findFirstFixtureGenerations = vi.fn();

vi.mock("@/lib/api/db", () => ({
  getDb: () => ({
    query: {
      projects: { findFirst: (...args: unknown[]) => findFirstProjects(...args) },
      fixtures: { findFirst: (...args: unknown[]) => findFirstFixtures(...args) },
      demoVariants: { findFirst: (...args: unknown[]) => findFirstDemoVariants(...args) },
      demos: { findFirst: (...args: unknown[]) => findFirstDemos(...args) },
      projectSources: { findMany: (...args: unknown[]) => findManyProjectSources(...args) },
      fixtureGenerations: { findFirst: (...args: unknown[]) => findFirstFixtureGenerations(...args) },
    },
  }),
}));

import { POST } from "../projects/[id]/fixtures/[fixtureId]/generate-story/route";

const schemaWithModels = {
  models: {
    Customer: { properties: { tier: {} } },
  },
  relationships: [],
};

const baseSpec = {
  version: 1,
  scenario: "A churn-risk enterprise account",
  seed: 42,
  counts: {},
  pins: [],
  anchors: [],
  trends: [],
  events: [],
  fieldRules: {},
};

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/projects/project-1/fixtures/fixture-1/generate-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function callRoute(body: Record<string, unknown>) {
  return POST(makeRequest(body), {
    params: Promise.resolve({ id: "project-1", fixtureId: "fixture-1" }),
  });
}

describe("POST .../fixtures/[fixtureId]/generate-story", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: schemaWithModels });
    findFirstFixtures.mockResolvedValue({ id: "fixture-1", projectId: "project-1", publishedGenerationId: null });
    findManyProjectSources.mockResolvedValue([]);
    mockCreateStoryDraftGeneration.mockResolvedValue({
      generationId: "gen-1",
      warnings: [],
      linterFindings: [],
      unreviewedRowCount: 0,
    });
    findFirstFixtureGenerations.mockResolvedValue({
      id: "gen-1",
      fixtureId: "fixture-1",
      validationValid: true,
      validationErrors: null,
    });
  });

  it("delegates to createStoryDraftGeneration with source: 'dashboard' and allowBootstrapPublish: true", async () => {
    const response = await callRoute({ storySpec: baseSpec, baseTimestamp: 12345 });

    expect(mockCreateStoryDraftGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        fixtureId: "fixture-1",
        schema: schemaWithModels,
        spec: baseSpec,
        source: "dashboard",
        allowBootstrapPublish: true,
        baseTimestamp: 12345,
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.generation).toEqual(
      expect.objectContaining({ id: "gen-1", linterFindings: [] })
    );
    expect(body.validation).toEqual({ valid: true, errors: [] });
    expect(body.warnings).toEqual([]);
  });

  it("resolves the spec from the linked variant when storySpec is omitted but variantId is given", async () => {
    findFirstDemoVariants.mockResolvedValue({
      id: "variant-1",
      demoId: "demo-1",
      storySpec: baseSpec,
    });
    findFirstDemos.mockResolvedValue({ id: "demo-1", projectId: "project-1" });

    await callRoute({ variantId: "00000000-0000-0000-0000-000000000000" });

    expect(mockCreateStoryDraftGeneration).toHaveBeenCalledWith(
      expect.objectContaining({ spec: baseSpec, source: "dashboard", allowBootstrapPublish: true })
    );
  });

  it("404s when the fixture doesn't exist", async () => {
    findFirstFixtures.mockResolvedValue(null);

    const response = await callRoute({ storySpec: baseSpec });

    expect(response.status).toBe(404);
    expect(mockCreateStoryDraftGeneration).not.toHaveBeenCalled();
  });

  it("409s when the project has no parsed schema to generate against", async () => {
    findFirstProjects.mockResolvedValue({ id: "project-1", schema: null });
    findManyProjectSources.mockResolvedValue([]);

    const response = await callRoute({ storySpec: baseSpec });

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe("NO_SCHEMA");
    expect(mockCreateStoryDraftGeneration).not.toHaveBeenCalled();
  });
});
