/**
 * MethodSelectionStep Component
 *
 * First step: Choose between GitHub connection or file upload.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Check, Loader2, ExternalLink, User } from "lucide-react";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);
import { useGitHubConnectionManager } from "@/hooks/use-github-connection";
import type { StepProps } from "../types";

interface MethodSelectionStepProps extends StepProps {
  projectId: string;
}

export function MethodSelectionStep({
  state,
  onStateChange,
  onNext,
}: MethodSelectionStepProps) {
  const github = useGitHubConnectionManager();

  const handleSelectGitHub = () => {
    if (!github.isConnected) {
      github.connect();
      return;
    }
    onStateChange({ method: "github" });
    onNext();
  };

  const handleSelectUpload = () => {
    onStateChange({ method: "upload" });
    onNext();
  };

  return (
    <div className="space-y-4">
      {/* GitHub Option */}
      <Card
        className={`cursor-pointer transition-all hover:border-primary/50 ${
          state.method === "github"
            ? "border-primary ring-2 ring-primary/20"
            : ""
        }`}
        onClick={handleSelectGitHub}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <GithubIcon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Import from GitHub</h3>
                {github.isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : github.isConnected ? (
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs text-green-600 border-green-600/30"
                  >
                    <Check className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Connect
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Connect to GitHub and select a repository. We&apos;ll
                automatically detect schema files (TypeScript, Zod, Drizzle,
                Prisma).
              </p>
              {github.isConnected && github.connection && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <User className="h-3 w-3" />
                  Connected as @{github.connection.githubUsername}
                </div>
              )}
            </div>
            {state.method === "github" && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>

          {github.isConnecting && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting to GitHub...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Option */}
      <Card
        className={`cursor-pointer transition-all hover:border-primary/50 ${
          state.method === "upload"
            ? "border-primary ring-2 ring-primary/20"
            : ""
        }`}
        onClick={handleSelectUpload}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">
              <Upload className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-medium">Upload Files</h3>
              <p className="text-sm text-muted-foreground">
                Upload schema files directly. Supports .ts, .tsx, .prisma,
                .graphql, and more. Drag and drop or click to browse.
              </p>
            </div>
            {state.method === "upload" && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats Info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Supported Schema Formats</h4>
        <div className="flex flex-wrap gap-2">
          {[
            "TypeScript",
            "Zod",
            "Drizzle",
            "Prisma",
            "GraphQL",
            "Supabase",
            "tRPC",
          ].map((format) => (
            <Badge key={format} variant="outline" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          We automatically detect the format and extract models, properties, and
          relationships.
        </p>
      </div>
    </div>
  );
}
