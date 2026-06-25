import { PrimaryNav } from "@/components/app/primary-nav";
import { UserCircle2 } from "lucide-react";
import { LogoutForm } from "@/components/auth/logout-form";
import { ViewerRankingStatus } from "@/lib/ranking/queries";

type FloatingNavProps = {
  user: {
    displayName: string;
    role: "player" | "admin";
  };
  rankingStatus?: ViewerRankingStatus;
};

export function FloatingNav({ user, rankingStatus }: FloatingNavProps) {
  const hasPlayerRankingStatus =
    user.role === "player" &&
    rankingStatus?.totalPoints !== null &&
    rankingStatus?.totalPoints !== undefined &&
    rankingStatus?.rankPosition !== null &&
    rankingStatus?.rankPosition !== undefined;

  return (
    <div className="sticky top-4 z-40 mb-8 px-5 md:px-8 xl:px-10">
      <div className="wc-panel mx-auto flex w-full max-w-360 flex-wrap items-center justify-between gap-3 rounded-sm px-4 py-3">
        <div className="flex items-center">
          <div className="grid h-12 grid-cols-[3.25rem_auto] overflow-hidden rounded-sm border border-[color:var(--wc-ink)] shadow-[2px_2px_0_var(--wc-ink)]">
            <div className="flex items-center justify-center bg-[color:var(--wc-green)] font-heading text-2xl font-black leading-none text-primary-foreground">
              26
            </div>
            <div className="hidden min-w-24 flex-col justify-center border-l border-[color:var(--wc-ink)] bg-background px-3 sm:flex">
              <span className="wc-display text-[10px] font-black text-muted-foreground">
                Bolão
              </span>
              <span className="text-sm font-black leading-none text-foreground">
                Copa do Mundo
              </span>
            </div>
          </div>
        </div>

        <div className="order-3 w-full overflow-x-auto md:order-2 md:w-auto">
          <PrimaryNav />
        </div>

        <div className="order-2 flex items-center gap-2 md:order-3">
          <div className="hidden h-11 items-center overflow-hidden rounded-sm border border-border bg-background text-sm sm:flex">
            <div className="flex h-full items-center gap-2 border-r border-border px-3">
              <UserCircle2 className="size-4 text-muted-foreground" />
              <span className="font-bold text-foreground">
              {user.displayName}
              </span>
            </div>
            {hasPlayerRankingStatus ? (
              <>
                <div className="flex h-full items-center border-r border-border bg-[color:color-mix(in_oklch,var(--wc-gold)_18%,transparent)] px-3 font-heading text-lg font-black text-foreground">
                  {rankingStatus!.totalPoints}
                  <span className="ml-1 font-sans text-[11px] font-black uppercase text-muted-foreground">
                    pts
                  </span>
                </div>
                <div className="flex h-full items-center bg-primary/12 px-3 font-heading text-lg font-black text-[color:var(--wc-green-dark)]">
                  {rankingStatus!.rankPosition}º
                </div>
              </>
            ) : null}
          </div>
          <LogoutForm />
        </div>
      </div>
    </div>
  );
}
