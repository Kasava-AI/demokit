/**
 * Tests for StorySection — the story prompt box (spec §5, Task 10).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const mockUseDemos = vi.fn();
const mockUseDemoVariant = vi.fn();
const mockUseWriteStorySpec = vi.fn();
const mockUseGenerateStory = vi.fn();

vi.mock("@/hooks/use-demos", () => ({
  useDemos: (...args: unknown[]) => mockUseDemos(...args),
  useDemoVariant: (...args: unknown[]) => mockUseDemoVariant(...args),
  useWriteStorySpec: (...args: unknown[]) => mockUseWriteStorySpec(...args),
  useGenerateStory: (...args: unknown[]) => mockUseGenerateStory(...args),
}));

const mockUseUpdateFixture = vi.fn();
vi.mock("@/hooks/use-fixtures", () => ({
  useUpdateFixture: (...args: unknown[]) => mockUseUpdateFixture(...args),
}));

import { StorySection } from "../components/StorySection";

const baseSpec = {
  version: 1,
  scenario: "A mid-market SaaS team evaluates us against a legacy vendor.",
  seed: 42,
  counts: { Customer: 8, Order: 20 },
  pins: [{ path: "Customer.tier", value: "gold" }],
  anchors: [{ model: "Customer", attrs: { name: "Acme Co" } }],
  trends: [{ model: "Order", dateField: "createdAt", shape: "up" as const }],
  events: [],
  fieldRules: {},
};

describe("StorySection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDemos.mockReturnValue({ data: [], isLoading: false });
    mockUseDemoVariant.mockReturnValue({ data: undefined, isLoading: false });
    mockUseWriteStorySpec.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseGenerateStory.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateFixture.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  describe("Unlinked state", () => {
    it("shows the link explainer and demo/variant pickers, populating variants from the chosen demo", () => {
      mockUseDemos.mockReturnValue({
        data: [
          {
            id: "demo-a",
            name: "Demo A",
            variants: [
              { id: "variant-a1", name: "Variant A1" },
              { id: "variant-a2", name: "Variant A2" },
            ],
          },
          { id: "demo-b", name: "Demo B", variants: [{ id: "variant-b1", name: "Variant B1" }] },
        ],
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId={null}
          variantId={null}
        />
      );

      expect(
        screen.getByText("Link a demo variant to drive this fixture from a story.")
      ).toBeTruthy();

      const linkButton = screen.getByRole("button", { name: /^link$/i });
      expect(linkButton).toBeDisabled();

      fireEvent.change(screen.getByLabelText("Demo"), { target: { value: "demo-a" } });
      fireEvent.change(screen.getByLabelText("Variant"), { target: { value: "variant-a1" } });

      expect(screen.getByText("Variant A1")).toBeTruthy();
      expect(linkButton).not.toBeDisabled();
    });

    it("links via the fixture-update mutation with demoId/variantId", async () => {
      const mutateAsync = vi.fn().mockResolvedValue({});
      mockUseUpdateFixture.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemos.mockReturnValue({
        data: [{ id: "demo-a", name: "Demo A", variants: [{ id: "variant-a1", name: "Variant A1" }] }],
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId={null}
          variantId={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Demo"), { target: { value: "demo-a" } });
      fireEvent.change(screen.getByLabelText("Variant"), { target: { value: "variant-a1" } });
      fireEvent.click(screen.getByRole("button", { name: /^link$/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          fixtureId: "fixture-1",
          data: { demoId: "demo-a", variantId: "variant-a1" },
        });
      });
    });

    it("toasts an error when linking fails", async () => {
      const mutateAsync = vi.fn().mockRejectedValue(new Error("nope"));
      mockUseUpdateFixture.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemos.mockReturnValue({
        data: [{ id: "demo-a", name: "Demo A", variants: [{ id: "variant-a1", name: "Variant A1" }] }],
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId={null}
          variantId={null}
        />
      );

      fireEvent.change(screen.getByLabelText("Demo"), { target: { value: "demo-a" } });
      fireEvent.change(screen.getByLabelText("Variant"), { target: { value: "variant-a1" } });
      fireEvent.click(screen.getByRole("button", { name: /^link$/i }));

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("nope");
      });
    });
  });

  describe("Linked state — spec summary", () => {
    it("renders the scenario and capped chip rows for counts/pins/anchors/trends", () => {
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: baseSpec },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      expect(screen.getByText(baseSpec.scenario)).toBeTruthy();
      expect(screen.getByText(/Customer × 8, Order × 20/)).toBeTruthy();
      expect(screen.getByText(/Customer\.tier = gold/)).toBeTruthy();
      expect(screen.getByText(/Customer: name=Acme Co/)).toBeTruthy();
      expect(screen.getByText(/Order\.createdAt up/)).toBeTruthy();
    });

    it("caps each chip row at 5 items with a +N more suffix", () => {
      const manyCounts: Record<string, number> = {};
      for (let i = 0; i < 8; i++) manyCounts[`Model${i}`] = i + 1;

      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: { ...baseSpec, counts: manyCounts } },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      expect(screen.getByText(/\+3 more/)).toBeTruthy();
    });

    it("shows a no-spec message when the linked variant has no storySpec yet", () => {
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: null },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      expect(screen.getByText(/No story spec yet/)).toBeTruthy();
      expect(screen.getByRole("button", { name: /generate data from story/i })).toBeDisabled();
    });
  });

  describe("Write story spec", () => {
    it("writes via useWriteStorySpec and shows the returned warnings + refreshed summary", async () => {
      const newSpec = { ...baseSpec, scenario: "A revised scenario." };
      const mutateAsync = vi.fn().mockResolvedValue({
        spec: newSpec,
        warnings: ["Counts assume a 30-day window"],
      });
      mockUseWriteStorySpec.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: null },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      const textarea = screen.getByLabelText("Tell the story");
      fireEvent.change(textarea, {
        target: { value: "The prospect is evaluating us against a legacy vendor." },
      });
      fireEvent.click(screen.getByRole("button", { name: /write story spec/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          demoId: "demo-1",
          variantId: "variant-1",
          prose: "The prospect is evaluating us against a legacy vendor.",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("A revised scenario.")).toBeTruthy();
        expect(screen.getByText("Counts assume a 30-day window")).toBeTruthy();
      });
    });

    it("submits on Cmd+Enter from the textarea", async () => {
      const mutateAsync = vi.fn().mockResolvedValue({ spec: baseSpec, warnings: [] });
      mockUseWriteStorySpec.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: null },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      const textarea = screen.getByLabelText("Tell the story");
      fireEvent.change(textarea, { target: { value: "Tell a story" } });
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it("toasts an error when the write fails (e.g. missing ANTHROPIC_API_KEY)", async () => {
      const mutateAsync = vi
        .fn()
        .mockRejectedValue(new Error("Story writing needs ANTHROPIC_API_KEY on the server"));
      mockUseWriteStorySpec.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: null },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      fireEvent.change(screen.getByLabelText("Tell the story"), {
        target: { value: "Tell a story" },
      });
      fireEvent.click(screen.getByRole("button", { name: /write story spec/i }));

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(
          "Story writing needs ANTHROPIC_API_KEY on the server"
        );
      });
    });
  });

  describe("Generate data from story", () => {
    it("generates via useGenerateStory and toasts a pass/fail description", async () => {
      const mutateAsync = vi.fn().mockResolvedValue({
        generation: { id: "gen-1" },
        validation: { valid: true, errors: [], warnings: [] },
      });
      mockUseGenerateStory.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: baseSpec },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /generate data from story/i }));

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({
          projectId: "project-1",
          fixtureId: "fixture-1",
          variantId: "variant-1",
        });
      });

      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalledWith("Draft generated", {
          description: "Validation passed",
        });
      });
    });

    it("toasts a failed-validation description when generation is invalid", async () => {
      const mutateAsync = vi.fn().mockResolvedValue({
        generation: { id: "gen-1" },
        validation: { valid: false, errors: [{ type: "x", model: "Order", message: "bad" }], warnings: [] },
      });
      mockUseGenerateStory.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: baseSpec },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /generate data from story/i }));

      await waitFor(() => {
        expect(toastSuccess).toHaveBeenCalledWith("Draft generated", {
          description: "Validation failed — fix before publishing",
        });
      });
    });

    it("shows the Generating… pending label while the mutation is in flight", () => {
      mockUseGenerateStory.mockReturnValue({ mutateAsync: vi.fn(), isPending: true });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: baseSpec },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      expect(screen.getByText("Generating…")).toBeTruthy();
    });

    it("toasts an error when generation fails", async () => {
      const mutateAsync = vi.fn().mockRejectedValue(new Error("Variant story spec not found"));
      mockUseGenerateStory.mockReturnValue({ mutateAsync, isPending: false });
      mockUseDemoVariant.mockReturnValue({
        data: { id: "variant-1", storySpec: baseSpec },
        isLoading: false,
      });

      render(
        <StorySection
          projectId="project-1"
          fixtureId="fixture-1"
          demoId="demo-1"
          variantId="variant-1"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /generate data from story/i }));

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith("Variant story spec not found");
      });
    });
  });
});
