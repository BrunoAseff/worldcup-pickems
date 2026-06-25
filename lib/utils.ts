import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function tabTriggerClass(active: boolean, className?: ClassValue) {
  return cn(
    "border transition-colors",
    active
      ? "border-primary/45 bg-[#f4fff6] font-semibold text-foreground hover:border-primary/45 hover:bg-[#f4fff6] hover:text-foreground"
      : "border-border bg-card text-muted-foreground hover:bg-card hover:text-foreground",
    className,
  )
}
