"use client";

import { AnimatePresence, motion } from "framer-motion";
import type {
  DemoNarrative,
  DemoData,
  GenerationLevel,
} from "@demokit-ai/core";
import type { DynamicNarrativeTemplate } from "@intelligence";
import { FixtureDetail } from "@/components/fixtures";
import { DataGenerationProgress } from "@/components/generation/GenerationProgress";
import {
  TemplateSection,
  NarrativeSection,
  RecordCountsInline,
  GenerateButton,
  type MissingRequirement,
} from ".";
import type { DemokitSchema, GenerationState } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";

// Animation variants for sections
const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

interface FixtureCreationFlowProps {
  // Template state
  templates: DynamicNarrativeTemplate[];
  selectedTemplate: DynamicNarrativeTemplate | undefined;
  onTemplateSelect: (template: DynamicNarrativeTemplate) => void;
  onTemplateClear: () => void;
  onStartFromScratch: () => void;

  // Narrative state
  narrative: DemoNarrative;
  onNarrativeChange: (narrative: DemoNarrative) => void;
  showNarrative: boolean;

  // Record counts state
  schema: DemokitSchema;
  recordCounts: Record<string, number>;
  onRecordCountsChange: (counts: Record<string, number>) => void;

  // Generation state
  generation: GenerationState;
  canGenerate: boolean;
  hasNarrative: boolean;
  hasGenerated: boolean;
  isGenerating: boolean;
  missingRequirements: MissingRequirement[];
  onGenerate: () => void;
  onCancelGeneration: () => void;

  // Save state
  projectName: string;
  onSaveFixture: (name: string) => Promise<void>;
  isSaving: boolean;
  savedFixtureName: string | undefined;

  // AI generation settings
  onLevelChange: (level: GenerationLevel) => void;
}

export function FixtureCreationFlow({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onTemplateClear,
  onStartFromScratch,
  narrative,
  onNarrativeChange,
  showNarrative,
  schema,
  recordCounts,
  onRecordCountsChange,
  generation,
  canGenerate,
  hasNarrative,
  hasGenerated,
  isGenerating,
  missingRequirements,
  onGenerate,
  onCancelGeneration,
  projectName,
  onSaveFixture,
  isSaving,
  savedFixtureName,
  onLevelChange,
}: FixtureCreationFlowProps) {
  const currentLevel = generation.level || "relationship-valid";
  const isL3 = currentLevel === "narrative-driven";
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div
          key="templates"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={sectionVariants}
        >
          <TemplateSection
            templates={templates}
            selected={selectedTemplate}
            onSelect={onTemplateSelect}
            onClear={onTemplateClear}
            onStartFromScratch={onStartFromScratch}
          />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showNarrative && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <NarrativeSection
              value={narrative}
              onChange={onNarrativeChange}
              disabled={isGenerating}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasNarrative && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <RecordCountsInline
              schema={schema}
              counts={recordCounts}
              onChange={onRecordCountsChange}
              template={selectedTemplate}
              disabled={isGenerating}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generation Level Toggle */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Generation Mode:</span>
          <div className="flex items-center gap-1">
            <Button
              variant={isL3 ? "ghost" : "secondary"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => onLevelChange("relationship-valid")}
              disabled={isGenerating}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Fast (L2)</span>
            </Button>
            <Button
              variant={isL3 ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 gap-1.5"
              onClick={() => onLevelChange("narrative-driven")}
              disabled={isGenerating}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered (L3)</span>
            </Button>
          </div>
        </div>
        {isL3 && (
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 border-amber-500/30"
          >
            Uses Claude API
          </Badge>
        )}
      </div>

      <GenerateButton
        canGenerate={canGenerate}
        isGenerating={isGenerating}
        hasGenerated={hasGenerated}
        missingRequirements={missingRequirements}
        onGenerate={onGenerate}
      />

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <DataGenerationProgress
              status={generation.status}
              attempt={generation.attempt}
              validationErrors={generation.errors}
              onCancel={onCancelGeneration}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasGenerated && generation.data && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={sectionVariants}
          >
            <FixtureDetail
              data={generation.data as DemoData}
              code={generation.code}
              validation={generation.validation}
              narrative={
                narrative.scenario
                  ? {
                      scenario: narrative.scenario,
                      keyPoints: narrative.keyPoints || [],
                    }
                  : undefined
              }
              projectName={projectName}
              onSaveWithName={onSaveFixture}
              onRegenerate={onGenerate}
              saving={isSaving}
              savedFixtureName={savedFixtureName}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
