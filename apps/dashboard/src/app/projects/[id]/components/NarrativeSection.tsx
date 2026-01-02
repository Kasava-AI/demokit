"use client";

/**
 * NarrativeSection Component
 *
 * Progressive disclosure narrative form:
 * - First: Only scenario textarea is shown
 * - After scenario filled: Key points appear
 * - "More options" reveals: Characters, Timeline, Metrics
 *
 * Designed for minimal cognitive load - reveals complexity only when needed.
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, X, ChevronDown, Users, Clock, TrendingUp } from "lucide-react";

import type { DemoNarrative } from "@demokit-ai/core";

// ============================================================================
// Types
// ============================================================================

interface NarrativeSectionProps {
  value: DemoNarrative;
  onChange: (narrative: DemoNarrative) => void;
  disabled?: boolean;
}

interface Character {
  name: string;
  role: string;
  description?: string;
}

interface TimelineEvent {
  when: string;
  event: string;
  entities?: string[];
}

interface MetricTarget {
  name: string;
  target?: string;
  trend?: "increasing" | "declining" | "stable";
}

// Animation variants for smooth reveals
const revealVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: { opacity: 1, height: "auto", marginTop: 16 },
};

// ============================================================================
// Main Component
// ============================================================================

export function NarrativeSection({
  value,
  onChange,
  disabled = false,
}: NarrativeSectionProps) {
  // Form state
  const [scenario, setScenario] = useState(value?.scenario || "");
  const [keyPoints, setKeyPoints] = useState<string[]>(
    value?.keyPoints?.length ? value.keyPoints : []
  );
  const [characters, setCharacters] = useState<Character[]>(
    (value?.characters as Character[]) || []
  );
  const [timeline, setTimeline] = useState<TimelineEvent[]>(
    (value?.timeline as TimelineEvent[]) || []
  );
  const [metrics, setMetrics] = useState<MetricTarget[]>(
    (value?.metrics as MetricTarget[]) || []
  );

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync when external value changes (e.g., from template selection)
  useEffect(() => {
    if (value) {
      setScenario(value.scenario || "");
      setKeyPoints(value.keyPoints?.length ? value.keyPoints : []);
      setCharacters((value.characters as Character[]) || []);
      setTimeline((value.timeline as TimelineEvent[]) || []);
      setMetrics((value.metrics as MetricTarget[]) || []);
    }
  }, [value]);

  // Build and emit narrative on changes
  const emitChange = useCallback(
    (
      updates: Partial<{
        scenario: string;
        keyPoints: string[];
        characters: Character[];
        timeline: TimelineEvent[];
        metrics: MetricTarget[];
      }>
    ) => {
      const newScenario = updates.scenario ?? scenario;
      const newKeyPoints = updates.keyPoints ?? keyPoints;
      const newCharacters = updates.characters ?? characters;
      const newTimeline = updates.timeline ?? timeline;
      const newMetrics = updates.metrics ?? metrics;

      onChange({
        scenario: newScenario,
        keyPoints: newKeyPoints.filter((p) => p.trim() !== ""),
        characters: newCharacters.length > 0 ? newCharacters : undefined,
        timeline: newTimeline.length > 0 ? newTimeline : undefined,
        metrics: newMetrics.length > 0 ? newMetrics : undefined,
      });
    },
    [scenario, keyPoints, characters, timeline, metrics, onChange]
  );

  // Scenario handlers
  const handleScenarioChange = (value: string) => {
    setScenario(value);
    emitChange({ scenario: value });
  };

  // Key points handlers
  const handleKeyPointChange = (index: number, value: string) => {
    const newPoints = [...keyPoints];
    newPoints[index] = value;
    setKeyPoints(newPoints);
    emitChange({ keyPoints: newPoints });
  };

  const addKeyPoint = () => {
    const newPoints = [...keyPoints, ""];
    setKeyPoints(newPoints);
  };

  const removeKeyPoint = (index: number) => {
    const newPoints = keyPoints.filter((_, i) => i !== index);
    setKeyPoints(newPoints);
    emitChange({ keyPoints: newPoints });
  };

  // Character handlers
  const addCharacter = () => {
    const newChars = [...characters, { name: "", role: "" }];
    setCharacters(newChars);
  };

  const updateCharacter = (
    index: number,
    field: keyof Character,
    value: string
  ) => {
    const newChars = [...characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setCharacters(newChars);
    emitChange({ characters: newChars });
  };

  const removeCharacter = (index: number) => {
    const newChars = characters.filter((_, i) => i !== index);
    setCharacters(newChars);
    emitChange({ characters: newChars });
  };

  // Timeline handlers
  const addTimelineEvent = () => {
    const newTimeline = [...timeline, { when: "", event: "" }];
    setTimeline(newTimeline);
  };

  const updateTimelineEvent = (
    index: number,
    field: keyof TimelineEvent,
    value: string
  ) => {
    const newTimeline = [...timeline];
    newTimeline[index] = { ...newTimeline[index], [field]: value };
    setTimeline(newTimeline);
    emitChange({ timeline: newTimeline });
  };

  const removeTimelineEvent = (index: number) => {
    const newTimeline = timeline.filter((_, i) => i !== index);
    setTimeline(newTimeline);
    emitChange({ timeline: newTimeline });
  };

  // Metric handlers
  const addMetric = () => {
    const newMetrics = [...metrics, { name: "" }];
    setMetrics(newMetrics);
  };

  const updateMetric = (
    index: number,
    field: keyof MetricTarget,
    value: string
  ) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
    emitChange({ metrics: newMetrics });
  };

  const removeMetric = (index: number) => {
    const newMetrics = metrics.filter((_, i) => i !== index);
    setMetrics(newMetrics);
    emitChange({ metrics: newMetrics });
  };

  // Progressive disclosure: show key points after scenario has content
  const showKeyPoints =
    scenario.trim().length > 0 || keyPoints.some((p) => p.trim() !== "");

  // Check if any advanced options are filled
  const hasAdvancedContent =
    characters.length > 0 || timeline.length > 0 || metrics.length > 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h3 className="text-sm font-medium">Describe your scenario</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          What story should the demo data tell?
        </p>
      </div>

      {/* Scenario textarea - always visible */}
      <div className="space-y-2">
        <Label htmlFor="scenario" className="sr-only">
          Scenario
        </Label>
        <Textarea
          id="scenario"
          placeholder="A new customer signs up for the platform, explores features, and makes their first purchase..."
          value={scenario}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleScenarioChange(e.target.value)}
          disabled={disabled}
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Key points - appears after scenario has content */}
      <AnimatePresence>
        {showKeyPoints && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={revealVariants}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-3">
              <Label className="text-sm">Key points to include</Label>
              <div className="space-y-2">
                {keyPoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-muted-foreground text-sm mt-2.5">
                      •
                    </span>
                    <Input
                      placeholder={`Point ${index + 1}`}
                      value={point}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleKeyPointChange(index, e.target.value)
                      }
                      disabled={disabled}
                      className="flex-1"
                    />
                    {keyPoints.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKeyPoint(index)}
                        disabled={disabled}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addKeyPoint}
                  disabled={disabled}
                  className="text-muted-foreground"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add point
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced options - behind a collapsible */}
      <AnimatePresence>
        {showKeyPoints && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={revealVariants}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Collapsible
              open={showAdvanced || hasAdvancedContent}
              onOpenChange={setShowAdvanced}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <span>More options</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showAdvanced || hasAdvancedContent ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pt-4 space-y-6 border-t mt-2">
                  {/* Characters */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Characters</Label>
                    </div>
                    <div className="space-y-2">
                      {characters.map((char, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={char.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateCharacter(index, "name", e.target.value)
                            }
                            disabled={disabled}
                            className="w-1/3"
                          />
                          <Input
                            placeholder="Role"
                            value={char.role}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateCharacter(index, "role", e.target.value)
                            }
                            disabled={disabled}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCharacter(index)}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addCharacter}
                        disabled={disabled}
                        className="text-muted-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add character
                      </Button>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Timeline</Label>
                    </div>
                    <div className="space-y-2">
                      {timeline.map((event, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="When"
                            value={event.when}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateTimelineEvent(index, "when", e.target.value)
                            }
                            disabled={disabled}
                            className="w-1/4"
                          />
                          <Input
                            placeholder="What happens"
                            value={event.event}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateTimelineEvent(
                                index,
                                "event",
                                e.target.value
                              )
                            }
                            disabled={disabled}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTimelineEvent(index)}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addTimelineEvent}
                        disabled={disabled}
                        className="text-muted-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add event
                      </Button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Metrics to show</Label>
                    </div>
                    <div className="space-y-2">
                      {metrics.map((metric, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Metric name"
                            value={metric.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateMetric(index, "name", e.target.value)
                            }
                            disabled={disabled}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Target"
                            value={metric.target || ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateMetric(index, "target", e.target.value)
                            }
                            disabled={disabled}
                            className="w-1/4"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMetric(index)}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addMetric}
                        disabled={disabled}
                        className="text-muted-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add metric
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
