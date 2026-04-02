import Link from "next/link";
import { Trophy, UserCircle2 } from "lucide-react";
import { LogoutForm } from "@/components/auth/logout-form";
import { ViewerRankingStatus } from "@/lib/ranking/queries";
import { primaryNavItems, type PrimaryRouteKey } from "@/lib/routes";
import { cn } from "@/lib/utils";

type FloatingNavProps = {
  user: {
    displayName: string;
    role: "player" | "admin";
  };
  rankingStatus?: ViewerRankingStatus;
  activeKey: PrimaryRouteKey;
};

export function FloatingNav({ user, rankingStatus, activeKey }: FloatingNavProps) {
  const hasPlayerRankingStatus =
    user.role === "player" &&
    rankingStatus?.totalPoints !== null &&
    rankingStatus?.totalPoints !== undefined &&
    rankingStatus?.rankPosition !== null &&
    rankingStatus?.rankPosition !== undefined;

  return (
    <div className="sticky top-4 z-40 mb-8 px-5 md:px-8 xl:px-10">
      <div className="mx-auto flex w-full max-w-360 items-center justify-between gap-4 rounded-md border border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center">
          <div className="flex size-11 items-center justify-center rounded-md border border-border bg-background text-foreground">
            <Trophy className="size-4.5" />
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-md bg-muted p-1">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center rounded-md px-4 text-sm font-medium transition-colors",
                activeKey === item.key
                  ? "bg-background text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden h-11 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm sm:flex">
            <UserCircle2 className="size-4 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {user.displayName}
            </span>
            {hasPlayerRankingStatus ? (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{rankingStatus!.totalPoints} pts</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{rankingStatus!.rankPosition}º lugar</span>
              </>
            ) : null}
          </div>
          <LogoutForm />
        </div>
      </div>
    </div>
  );
}
