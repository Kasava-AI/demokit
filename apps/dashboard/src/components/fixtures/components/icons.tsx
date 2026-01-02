/**
 * Shared icon components for FixtureDetail
 */

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type IconType =
  | "refresh"
  | "copy"
  | "check"
  | "download"
  | "save"
  | "spinner"
  | "undo"
  | "reset";

const ICONS: Record<IconType, React.ReactNode> = {
  refresh: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  ),
  copy: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  ),
  check: (
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  ),
  download: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  ),
  save: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
    />
  ),
  spinner: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  ),
  undo: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 10h10a4 4 0 014 4v2M3 10l6-6m-6 6l6 6"
    />
  ),
  reset: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  ),
};

/** Chevron icon for collapsible sections */
export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-muted-foreground transition-transform ${
        open ? "rotate-90" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

interface IconButtonProps {
  onClick: () => void;
  icon: IconType;
  tooltip: string;
  disabled?: boolean;
  testId?: string;
}

export function IconButton({
  onClick,
  icon,
  tooltip,
  disabled,
  testId,
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center p-1.5 rounded-md ${
            disabled
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          onClick={onClick}
          disabled={disabled}
          data-testid={testId}
        >
          <svg
            className={`w-4 h-4 ${icon === "check" ? "text-success" : ""} ${
              icon === "spinner" ? "animate-spin" : ""
            }`}
            fill={icon === "check" ? "currentColor" : "none"}
            stroke={icon === "check" ? "none" : "currentColor"}
            viewBox="0 0 24 24"
          >
            {ICONS[icon]}
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: IconType;
  children: React.ReactNode;
  disabled?: boolean;
}

export function ActionButton({
  onClick,
  icon,
  children,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center px-2 py-1 text-xs ${
        disabled
          ? "text-muted-foreground/50 cursor-not-allowed"
          : "text-muted-foreground hover:text-foreground"
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        className={`w-3.5 h-3.5 mr-1 ${icon === "check" ? "text-success" : ""} ${
          icon === "spinner" ? "animate-spin" : ""
        }`}
        fill={icon === "check" ? "currentColor" : "none"}
        stroke={icon === "check" ? "none" : "currentColor"}
        viewBox="0 0 24 24"
      >
        {ICONS[icon]}
      </svg>
      {children}
    </button>
  );
}
