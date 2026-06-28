"use client";

import BackButton from "@/components/back-button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show the glass Back button (default true). */
  showBack?: boolean;
  /** Optional trailing content (e.g. action button, theme toggle). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent, mobile-first page header with a glass Back button.
 * Left-aligned and responsive so it reads well on small screens and desktop.
 */
export default function PageHeader({ title, subtitle, showBack = true, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex items-start gap-3 sm:mb-8 sm:items-center", className)}>
      {showBack && <BackButton className="mt-0.5 sm:mt-0" />}
      <div className="min-w-0 flex-1">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
