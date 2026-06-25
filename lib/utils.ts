import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function tabTriggerClass(active: boolean, className?: ClassValue) {
  return cn(
    "border font-semibold transition-colors",
    active
      ? "border-[color:var(--wc-ink)] bg-[color:var(--wc-gold)] text-[color:var(--wc-ink)] shadow-[2px_2px_0_var(--wc-ink)] hover:bg-[color:var(--wc-gold)] hover:text-[color:var(--wc-ink)]"
      : "border-border bg-card text-muted-foreground hover:border-[color:color-mix(in_oklch,var(--wc-ink)_36%,transparent)] hover:bg-background hover:text-foreground",
    className,
  )
}
