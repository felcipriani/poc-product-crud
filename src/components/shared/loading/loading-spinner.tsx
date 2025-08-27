"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      aria-label="Loading"
      role="status"
    />
  );
}

export interface LoadingStateProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LoadingState({
  loading,
  children,
  fallback,
  className,
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {fallback || <LoadingSpinner />}
      </div>
    );
  }

  return <>{children}</>;
}