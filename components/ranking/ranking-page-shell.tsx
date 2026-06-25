import { RankingPageView } from "@/lib/ranking/queries";
import { rankingMedalMeta } from "@/lib/ranking/presentation";
import { scoringRuleSections } from "@/lib/recalculation/scoring";
import { RankingConfetti } from "./ranking-confetti";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RankingCardProps = {
  entry: RankingPageView["entries"][number];
  emphasis: "champion" | "podium" | "compact";
  fillRow?: boolean;
};

function RankingCard({ entry, emphasis, fillRow = false }: RankingCardProps) {
  const meta = rankingMedalMeta[entry.medal];
  const Icon = meta.icon;
  const rankLabel = `${entry.rankPosition.toString().padStart(2, "0")}`;

  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-sm border p-5 shadow-[2px_2px_0_color-mix(in_oklch,var(--wc-ink)_16%,transparent)]",
        meta.shellClassName,
        emphasis === "champion" && "min-h-64 px-6 py-6 md:col-span-2",
        emphasis === "podium" && "min-h-48",
        fillRow && "md:col-span-2",
        emphasis === "compact" && "bg-card",
      )}
    >
      <div className="pointer-events-none absolute -right-3 -top-6 font-heading text-9xl font-black leading-none text-foreground/[0.045]">
        {rankLabel}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("wc-display text-sm font-black", meta.rankClassName)}>
            {entry.rankPosition}º lugar
          </p>
          <h2
            className={cn(
              "mt-3 font-heading font-black leading-none text-foreground",
              emphasis === "champion" ? "text-6xl sm:text-7xl" : emphasis === "podium" ? "text-4xl" : "text-3xl",
            )}
          >
            {entry.displayName}
          </h2>
        </div>
        <div
          className={cn(
            "relative z-10 flex items-center justify-center rounded-sm border border-[color:var(--wc-ink)] shadow-[2px_2px_0_var(--wc-ink)]",
            meta.iconClassName,
            emphasis === "champion" ? "size-16" : "size-12",
          )}
        >
          <Icon className={emphasis === "champion" ? "size-7" : "size-5"} />
        </div>
      </div>

      <div className="relative z-10 mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="wc-display text-xs font-black text-muted-foreground">
            Pontuação
          </p>
          <p
            className={cn(
              "font-heading font-black leading-none text-foreground",
              emphasis === "champion" ? "text-8xl" : emphasis === "podium" ? "text-6xl" : "text-5xl",
            )}
          >
            {entry.totalPoints}
          </p>
        </div>
        <div className="text-right">
          <p className="wc-display text-sm font-black text-foreground">{meta.label}</p>
        </div>
      </div>
    </Card>
  );
}

export function RankingPageShell({ ranking }: { ranking: RankingPageView }) {
  return (
    <div className="px-5 md:px-8 xl:px-10">
      <div className="mx-auto max-w-360 space-y-6">
        <section className="relative overflow-hidden rounded-sm border border-[color:var(--wc-ink)] bg-[color:var(--wc-ink)] px-5 py-5 text-primary-foreground shadow-[3px_3px_0_var(--wc-gold)]">
          {ranking.showConfetti ? <RankingConfetti /> : null}
          <p className="wc-display text-xs font-black text-[color:var(--wc-gold)]">
            Mesa final do bolão
          </p>
          <h1 className="relative mt-1 font-heading text-5xl font-black leading-none sm:text-7xl">
            Ranking
          </h1>
        </section>

        {ranking.entries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {ranking.entries.map((entry, index) => (
              <RankingCard
                key={entry.userId}
                entry={entry}
                emphasis={index === 0 ? "champion" : index < 3 ? "podium" : "compact"}
                fillRow={ranking.entries.length === 4 && index === 3}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-md p-6 text-sm text-muted-foreground">
            Ainda não há ranking calculado. Lance resultados e rode o recálculo.
          </Card>
        )}

        <Card className="wc-panel rounded-sm p-5">
          <h2 className="wc-display text-sm font-black text-muted-foreground">
            Regras de pontuação
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {scoringRuleSections.map((section) => (
              <div key={section.title} className="space-y-1.5 text-sm leading-6 text-foreground">
                <h3 className="font-medium text-foreground">{section.title}</h3>
                {section.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
