"use client";

import { JSX, ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

/**
 * Component that uses useSearchParams - must be wrapped in Suspense
 */
function ReturnUrlBackButton() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl");

  if (!returnUrl) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.location.href = returnUrl}
      className="gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}

export interface AppLayoutProps {
  children: ReactNode;
  /** Custom back button element */
  backButton?: JSX.Element;
  /** Title displayed in the header (typically page or project name) */
  title?: string;
  /** Optional status badge (e.g., "ready", "pending") */
  status?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Additional content to display in the header (after title, before actions) */
  headerContent?: JSX.Element;
  /** Action buttons to display on the right side of header */
  headerActions?: JSX.Element;
  /** Whether to show user controls (email + sign out) - defaults to true */
  showUserControls?: boolean;
  /** Whether to show theme toggle - defaults to true */
  showThemeToggle?: boolean;
  /** Start with sidebar collapsed */
  defaultSidebarCollapsed?: boolean;
}

export function AppLayout({
  children,
  backButton,
  title,
  status,
  subtitle,
  headerContent,
  headerActions,
  defaultSidebarCollapsed = false,
}: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={!defaultSidebarCollapsed}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col overflow-hidden min-h-0">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6 bg-background">
            <SidebarTrigger className="-ml-2" />

            {/* Back button */}
            {backButton || (
              <Suspense fallback={null}>
                <ReturnUrlBackButton />
              </Suspense>
            )}

            {/* Title section */}
            {title && (
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold text-foreground">
                      {title}
                    </h1>
                    {status && (
                      <Badge
                        variant={status === "ready" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {status}
                      </Badge>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Flexible middle content */}
            <div className="flex-1">{headerContent}</div>

            {/* Right side: Actions + Theme + User */}
            <div className="flex items-center gap-2">
              {/* Custom header actions */}
              {headerActions}
            </div>
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
