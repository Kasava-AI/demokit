/**
 * EditableTitle Component
 *
 * Inline editable title with save/cancel buttons.
 */

import React, { useState } from "react";
import { Check, X, Pencil } from "lucide-react";

export interface EditableTitleProps {
  name?: string;
  onNameChange?: (name: string) => void;
}

export function EditableTitle({ name, onNameChange }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name || "Untitled Fixture");

  const handleSave = () => {
    setIsEditing(false);
    if (editedName.trim() && editedName !== name) {
      onNameChange?.(editedName.trim());
    }
  };

  const handleCancel = () => {
    setEditedName(name || "Untitled Fixture");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editedName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            else if (e.key === "Escape") handleCancel();
          }}
          className="text-lg font-semibold text-foreground bg-transparent border-b border-primary outline-none px-0 py-0"
          autoFocus
        />
        <button
          type="button"
          onClick={handleSave}
          className="p-1 rounded text-muted-foreground hover:text-success hover:bg-success/10"
          aria-label="Save name"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Cancel editing"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h2 className="text-lg font-semibold text-foreground truncate">
        {name || "Untitled Fixture"}
      </h2>
      {onNameChange && (
        <button
          type="button"
          onClick={() => {
            setEditedName(name || "Untitled Fixture");
            setIsEditing(true);
          }}
          className="p-1 rounded text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted"
          aria-label="Edit fixture name"
        >
          <Pencil className="text-black/40 transition-colors hover:text-black w-4 h-4" />
        </button>
      )}
    </div>
  );
}
