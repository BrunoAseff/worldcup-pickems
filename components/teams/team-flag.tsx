import Image from "next/image";
import { cn } from "@/lib/utils";

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
          "inline-flex h-4.5 w-6 shrink-0 rounded-xs border border-border bg-muted",
          className
        )}
      />
    );
  }

  return (
    <Image
      src={`/flags/m/${code.toUpperCase()}.svg`}
      alt=""
      width={24}
      height={18}
      unoptimized
      aria-hidden="true"
      className={cn(
        "inline-flex h-4.5 w-6 shrink-0 overflow-hidden rounded-xs",
        className
      )}
    />
  );
}
