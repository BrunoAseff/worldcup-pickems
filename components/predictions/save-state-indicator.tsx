"use client";

import { AlertCircle, Check, LoaderCircle, LockKeyhole } from "lucide-react";

type SaveStateIndicatorProps = {
  message?: string | null;
  tone?: "saving" | "success" | "error" | "locked" | null;
};

export function SaveStateIndicator({ message, tone }: SaveStateIndicatorProps) {
  if (!message || !tone) {
    return null;
  }

  const icon =
    tone === "saving" ? (
      <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
    ) : tone === "error" ? (
      <AlertCircle className="size-4 text-destructive" />
    ) : tone === "locked" ? (
      <LockKeyhole className="size-4 text-muted-foreground" />
    ) : (
      <Check className="size-4 text-primary" />
    );

  return (
    <div className="relative flex size-5 items-center justify-center">
      <div tabIndex={0} className="peer flex size-5 items-center justify-center" aria-label={message}>
        {icon}
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-card-foreground opacity-0 transition-opacity peer-hover:opacity-100 peer-focus:opacity-100 peer-focus-visible:opacity-100">
        {message}
      </div>
    </div>
  );
}
