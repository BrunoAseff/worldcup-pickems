import Link from "next/link";
import { Trophy, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutForm } from "@/components/auth/logout-form";
import { primaryNavItems, type PrimaryRouteKey } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FloatingNavProps = {
  user: {
    displayName: string;
    role: "player" | "admin";
  };
  activeKey: PrimaryRouteKey;
};

export function FloatingNav({ user, activeKey }: FloatingNavProps) {
  return (
    <div className="sticky top-4 z-40 mb-8 px-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-4" />
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-muted p-1">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeKey === item.key
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-2 sm:flex">
            <UserCircle2 className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {user.displayName}
            </span>
            <Badge variant="outline" className="rounded-full">
              {user.role}
            </Badge>
          </div>
          <LogoutForm />
        </div>
      </div>
    </div>
  );
}
