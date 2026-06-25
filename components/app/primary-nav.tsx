"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavItems } from "@/lib/routes";
import { cn } from "@/lib/utils";

const resolveActiveKey = (pathname: string | null) =>
  primaryNavItems.find((item) => pathname?.startsWith(item.href))?.key ??
  "groupStage";

export function PrimaryNav() {
  const pathname = usePathname();
  const activeKey = resolveActiveKey(pathname);

  return (
    <nav className="flex items-center gap-1 rounded-sm border border-border bg-[color:var(--wc-paper-deep)] p-1">
      {primaryNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex h-10 items-center rounded-sm border px-3 text-sm font-semibold whitespace-nowrap transition-colors md:px-4",
            activeKey === item.key
              ? "border-[color:var(--wc-ink)] bg-[color:var(--wc-gold)] text-[color:var(--wc-ink)] shadow-[2px_2px_0_var(--wc-ink)]"
              : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
