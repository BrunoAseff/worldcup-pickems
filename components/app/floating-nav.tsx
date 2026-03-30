import Link from "next/link";
import { Trophy, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutForm } from "@/components/auth/logout-form";
import { cn } from "@/lib/utils";

type FloatingNavProps = {
  user: {
    displayName: string;
    role: "player" | "admin";
  };
  activeHref: "/palpites" | "/ranking" | "/admin";
};

const navItems: Array<{ href: FloatingNavProps["activeHref"]; label: string }> =
  [
    { href: "/palpites", label: "Palpites" },
    { href: "/ranking", label: "Ranking" },
  ];

export function FloatingNav({ user, activeHref }: FloatingNavProps) {
  return (
    <div className="sticky top-4 z-40 mb-8 px-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-4" />
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-muted p-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeHref === item.href
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeHref === "/admin"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Admin
            </Link>
          ) : null}
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
