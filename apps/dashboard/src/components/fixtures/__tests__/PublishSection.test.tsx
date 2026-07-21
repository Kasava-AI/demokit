/**
 * Tests for PublishSection — publish/rollback UI (spec §6).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";

// Mock window.matchMedia for tests (useReducedMotion reads it via the Dialog primitives)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Collapsible components to always show content (mirrors FixtureDetail.test.tsx)
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-state={open ? "open" : "closed"}>{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const mockUseFixtureGenerations = vi.fn();
const mockUsePublishHistory = vi.fn();
const mockUsePublishGeneration = vi.fn();

vi.mock("@/hooks/use-fixtures", () => ({
  useFixtureGenerations: (...args: unknown[]) => mockUseFixtureGenerations(...args),
  usePublishHistory: (...args: unknown[]) => mockUsePublishHistory(...args),
  usePublishGeneration: (...args: unknown[]) => mockUsePublishGeneration(...args),
}));

import { PublishSection } from "../components/PublishSection";
import type { FixtureGeneration } from "@/hooks/use-fixtures";

function makeGeneration(overrides: Partial<FixtureGeneration> & { id: string }): FixtureGeneration {
  return {
    fixtureId: "fixture-1",
    label: null,
    level: "narrative-driven",
    data: null,
    code: null,
    validationValid: true,
    validationErrorCount: 0,
    validationWarningCount: 0,
    validationErrors: null,
    recordCount: null,
    recordsByModel: null,
    inputParameters: null,
    status: "completed",
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    errorDetails: null,
    durationMs: null,
    tokensUsed: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PublishSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders generation rows with Published/Draft status text", () => {
    const published = makeGeneration({ id: "gen-1", label: "v1" });
    const draft = makeGeneration({ id: "gen-2", label: "v2" });

    mockUseFixtureGenerations.mockReturnValue({
      data: [published, draft],
      isLoading: false,
      error: null,
    });
    mockUsePublishHistory.mockReturnValue({ data: [], error: null });
    mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });

    render(
      <PublishSection
        projectId="project-1"
        fixtureId="fixture-1"
        publishedGenerationId="gen-1"
        draftGenerationId="gen-2"
      />
    );

    expect(screen.getByText("v1")).toBeTruthy();
    expect(screen.getByText("Published")).toBeTruthy();
    expect(screen.getByText("v2")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
  });

  it("disables the Publish button with a validation tooltip when the generation failed validation", () => {
    const invalidGeneration = makeGeneration({
      id: "gen-3",
      label: "v3",
      validationValid: false,
    });

    mockUseFixtureGenerations.mockReturnValue({
      data: [invalidGeneration],
      isLoading: false,
      error: null,
    });
    mockUsePublishHistory.mockReturnValue({ data: [], error: null });
    mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });

    render(
      <PublishSection
        projectId="project-1"
        fixtureId="fixture-1"
        publishedGenerationId={null}
        draftGenerationId={null}
      />
    );

    const publishButton = screen.getByRole("button", { name: /publish/i });
    expect(publishButton).toBeDisabled();
    expect(publishButton).toHaveAttribute("title", "Fix validation errors before publishing");
  });

  it("publishes on confirm and renders the returned warnings and linter findings", async () => {
    const draft = makeGeneration({ id: "gen-4", label: "v4" });
    const mutateAsync = vi.fn().mockResolvedValue({
      publish: {
        id: "publish-1",
        generationId: "gen-4",
        previousGenerationId: null,
        publishedById: "user-1",
        note: null,
        publishedAt: "2026-07-20T00:00:00.000Z",
      },
      fixture: { id: "fixture-1" },
      warnings: ["2 generated rows have not been reviewed"],
      linterFindings: [
        { severity: "warning" as const, message: "Story lacks a resolution beat", path: "events" },
      ],
    });

    mockUseFixtureGenerations.mockReturnValue({
      data: [draft],
      isLoading: false,
      error: null,
    });
    mockUsePublishHistory.mockReturnValue({ data: [], error: null });
    mockUsePublishGeneration.mockReturnValue({ mutateAsync, isPending: false });

    render(
      <PublishSection
        projectId="project-1"
        fixtureId="fixture-1"
        publishedGenerationId={null}
        draftGenerationId="gen-4"
      />
    );

    // Opens the confirm dialog
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    expect(screen.getByText("Publish this generation?")).toBeTruthy();

    // Confirm inside the dialog (scoped — the row's Publish button is still in the DOM behind it)
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        fixtureId: "fixture-1",
        generationId: "gen-4",
        note: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByText("2 generated rows have not been reviewed")).toBeTruthy();
      expect(screen.getByText(/Story lacks a resolution beat/)).toBeTruthy();
    });
  });
});
