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
const mockUseMintPreviewToken = vi.fn();

vi.mock("@/hooks/use-fixtures", () => ({
  useFixtureGenerations: (...args: unknown[]) => mockUseFixtureGenerations(...args),
  usePublishHistory: (...args: unknown[]) => mockUsePublishHistory(...args),
  usePublishGeneration: (...args: unknown[]) => mockUsePublishGeneration(...args),
  useMintPreviewToken: (...args: unknown[]) => mockUseMintPreviewToken(...args),
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
    mockUseMintPreviewToken.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
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
        previewUrl={null}
        onSavePreviewUrl={vi.fn()}
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
        previewUrl={null}
        onSavePreviewUrl={vi.fn()}
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
        previewUrl={null}
        onSavePreviewUrl={vi.fn()}
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

  it("does not show a stale Published result when the dialog is cancelled and reopened for the same generation before the first publish resolves", async () => {
    const draft = makeGeneration({ id: "gen-5", label: "v5" });

    // A deferred mutateAsync so we control exactly when the first (later
    // cancelled) publish resolves, relative to the cancel + reopen.
    let resolvePublish: (value: unknown) => void = () => {};
    const deferredPublish = new Promise((resolve) => {
      resolvePublish = resolve;
    });
    const mutateAsync = vi.fn().mockReturnValue(deferredPublish);

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
        draftGenerationId="gen-5"
        previewUrl={null}
        onSavePreviewUrl={vi.fn()}
      />
    );

    // Open the dialog for gen-5 and confirm — this starts the (never
    // resolved yet) publish request.
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    let dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^publish$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });

    // Cancel while that publish is still in flight.
    fireEvent.click(within(dialog).getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Reopen the confirm dialog for the SAME generation before the first
    // request resolves — this is a distinct attempt even though the target
    // id is identical to the cancelled one.
    fireEvent.click(screen.getByRole("button", { name: /publish/i }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Publish this generation?")).toBeTruthy();

    // Now let the first (cancelled) publish resolve.
    resolvePublish({
      publish: {
        id: "publish-1",
        generationId: "gen-5",
        previousGenerationId: null,
        publishedById: "user-1",
        note: null,
        publishedAt: "2026-07-20T00:00:00.000Z",
      },
      fixture: { id: "fixture-1" },
      warnings: ["stale warning"],
      linterFindings: [],
    });

    // The stale handlePublish continuation still fires its toast (the
    // publish did commit server-side), but it must not flip the reopened,
    // not-yet-confirmed dialog over to the result view.
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });

    expect(within(dialog).getByText("Publish this generation?")).toBeTruthy();
    expect(within(dialog).queryByText("stale warning")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Note/i)).toBeInTheDocument();
  });

  describe("Preview (Task 8)", () => {
    let openSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    });

    it("mints a token and opens the app URL directly when previewUrl is already set", async () => {
      const gen = makeGeneration({ id: "gen-6", label: "v6" });
      const mintMutateAsync = vi.fn().mockResolvedValue({
        token: "tok-123",
        expiresAt: "2026-07-20T01:00:00.000Z",
      });

      mockUseFixtureGenerations.mockReturnValue({ data: [gen], isLoading: false, error: null });
      mockUsePublishHistory.mockReturnValue({ data: [], error: null });
      mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      mockUseMintPreviewToken.mockReturnValue({ mutateAsync: mintMutateAsync, isPending: false });

      render(
        <PublishSection
          projectId="project-1"
          fixtureId="fixture-1"
          publishedGenerationId={null}
          draftGenerationId="gen-6"
          previewUrl="https://app.example.com"
          onSavePreviewUrl={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));

      await waitFor(() => {
        expect(mintMutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          fixtureId: "fixture-1",
          generationId: "gen-6",
        });
      });

      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledWith(
          "https://app.example.com?demo-preview=tok-123",
          "_blank",
          "noopener"
        );
      });

      // No URL-capture dialog — previewUrl was already known.
      expect(screen.queryByText("Where does your app run?")).not.toBeInTheDocument();
    });

    it("opens the URL-capture dialog when no previewUrl is set, saves it, then mints and opens", async () => {
      const gen = makeGeneration({ id: "gen-7", label: "v7" });
      const mintMutateAsync = vi.fn().mockResolvedValue({
        token: "tok-456",
        expiresAt: "2026-07-20T01:00:00.000Z",
      });
      const onSavePreviewUrl = vi.fn().mockResolvedValue(undefined);

      mockUseFixtureGenerations.mockReturnValue({ data: [gen], isLoading: false, error: null });
      mockUsePublishHistory.mockReturnValue({ data: [], error: null });
      mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      mockUseMintPreviewToken.mockReturnValue({ mutateAsync: mintMutateAsync, isPending: false });

      render(
        <PublishSection
          projectId="project-1"
          fixtureId="fixture-1"
          publishedGenerationId={null}
          draftGenerationId="gen-7"
          previewUrl={null}
          onSavePreviewUrl={onSavePreviewUrl}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));
      expect(screen.getByText("Where does your app run?")).toBeTruthy();

      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText(/App URL/i), {
        target: { value: "https://staging.example.com" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: /save and preview/i }));

      await waitFor(() => {
        expect(onSavePreviewUrl).toHaveBeenCalledWith("https://staging.example.com");
      });

      await waitFor(() => {
        expect(mintMutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          fixtureId: "fixture-1",
          generationId: "gen-7",
        });
      });

      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledWith(
          "https://staging.example.com?demo-preview=tok-456",
          "_blank",
          "noopener"
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("shows an inline error and does not save when the entered URL is invalid", async () => {
      const gen = makeGeneration({ id: "gen-8", label: "v8" });
      const onSavePreviewUrl = vi.fn();

      mockUseFixtureGenerations.mockReturnValue({ data: [gen], isLoading: false, error: null });
      mockUsePublishHistory.mockReturnValue({ data: [], error: null });
      mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      mockUseMintPreviewToken.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });

      render(
        <PublishSection
          projectId="project-1"
          fixtureId="fixture-1"
          publishedGenerationId={null}
          draftGenerationId="gen-8"
          previewUrl={null}
          onSavePreviewUrl={onSavePreviewUrl}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));
      const dialog = screen.getByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText(/App URL/i), {
        target: { value: "not-a-url" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: /save and preview/i }));

      await waitFor(() => {
        expect(screen.getByText(/Enter a full URL/i)).toBeTruthy();
      });
      expect(onSavePreviewUrl).not.toHaveBeenCalled();
    });

    it("mints per generation on the published row too (Preview isn't hidden when published)", async () => {
      const published = makeGeneration({ id: "gen-9", label: "v9" });
      const mintMutateAsync = vi.fn().mockResolvedValue({
        token: "tok-789",
        expiresAt: "2026-07-20T01:00:00.000Z",
      });

      mockUseFixtureGenerations.mockReturnValue({
        data: [published],
        isLoading: false,
        error: null,
      });
      mockUsePublishHistory.mockReturnValue({ data: [], error: null });
      mockUsePublishGeneration.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
      mockUseMintPreviewToken.mockReturnValue({ mutateAsync: mintMutateAsync, isPending: false });

      render(
        <PublishSection
          projectId="project-1"
          fixtureId="fixture-1"
          publishedGenerationId="gen-9"
          draftGenerationId={null}
          previewUrl="https://app.example.com"
          onSavePreviewUrl={vi.fn()}
        />
      );

      // The published row has no Publish button, only Preview.
      expect(screen.queryByRole("button", { name: /^publish$/i })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /^preview$/i }));

      await waitFor(() => {
        expect(mintMutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          fixtureId: "fixture-1",
          generationId: "gen-9",
        });
      });
    });
  });
});
