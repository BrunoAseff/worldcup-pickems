import type { ComponentProps } from "react";
import Flag from "react-flagpack";
import { cn } from "@/lib/utils";

type FlagCode = ComponentProps<typeof Flag>["code"];

type TeamFlagProps = {
  code: string | null;
  className?: string;
};

export function TeamFlag({ code, className }: TeamFlagProps) {
  if (!code) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-4.5 w-6 rounded-xs border border-border bg-muted",
          className
        )}
      />
    );
  }

  return (
    <Flag
      code={code.toUpperCase() as FlagCode}
      size="m"
      hasBorder={false}
      hasBorderRadius={false}
      className={cn(
        "inline-flex h-4.5 w-6 overflow-hidden rounded-xs",
        className
      )}
    />
  );
}
