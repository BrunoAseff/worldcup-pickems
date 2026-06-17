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
    <nav className="flex items-center gap-1 rounded-md bg-muted p-1">
      {primaryNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex h-11 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors md:px-4",
            activeKey === item.key
              ? "bg-background text-foreground"
              : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
