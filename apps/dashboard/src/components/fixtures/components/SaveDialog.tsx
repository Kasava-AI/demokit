/**
 * SaveDialog Component
 *
 * Dialog for saving a fixture with a name.
 */

import React from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DemoData, ValidationResult } from "./types";

export interface SaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixtureName: string;
  onFixtureNameChange: (name: string) => void;
  onSave: () => void;
  isSaving: boolean;
  data?: DemoData;
  validation?: ValidationResult;
  totalRecords: number;
}

export function SaveDialog({
  open,
  onOpenChange,
  fixtureName,
  onFixtureNameChange,
  onSave,
  isSaving,
  data,
  validation,
  totalRecords,
}: SaveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Fixture</DialogTitle>
          <DialogDescription>
            Give your fixture a name to save it for later use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fixture-name">Fixture Name</Label>
            <Input
              id="fixture-name"
              value={fixtureName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFixtureNameChange(e.target.value)}
              placeholder="e.g., demo-users-scenario-1"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Use a descriptive name to help identify this fixture later.
            </p>
          </div>

          {/* Fixture summary */}
          {data && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total records:</span>
                <span className="font-medium">{totalRecords}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Models:</span>
                <span className="font-medium">{Object.keys(data).length}</span>
              </div>
              {validation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Validation:</span>
                  <span
                    className={`font-medium ${
                      validation.valid ? "text-success" : "text-destructive"
                    }`}
                  >
                    {validation.valid
                      ? "Passed"
                      : `${validation.errors.length} errors`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Save Fixture
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
