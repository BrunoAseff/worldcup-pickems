import { RankingPageView } from "@/lib/ranking/queries";
import { rankingMedalMeta } from "@/lib/ranking/presentation";
import { scoringRuleSections } from "@/lib/recalculation/scoring";
import { RankingConfetti } from "./ranking-confetti";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RankingCardProps = {
  entry: RankingPageView["entries"][number];
  emphasis: "hero" | "secondary" | "compact";
};

function RankingCard({ entry, emphasis }: RankingCardProps) {
  const meta = rankingMedalMeta[entry.medal];
  const Icon = meta.icon;

  return (
    <Card
      className={cn(
        "rounded-md border p-5",
        meta.shellClassName,
        emphasis === "hero" && "px-6 py-7",
        emphasis === "secondary" && "min-h-52",
        emphasis === "compact" && "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-sm font-semibold uppercase tracking-[0.14em]", meta.rankClassName)}>
            {entry.rankPosition}º lugar
          </p>
          <h2
            className={cn(
              "mt-3 font-semibold tracking-tight text-foreground",
              emphasis === "hero" ? "text-3xl" : emphasis === "secondary" ? "text-2xl" : "text-xl",
            )}
          >
            {entry.displayName}
          </h2>
        </div>
        <div
          className={cn(
            "flex items-center justify-center rounded-full",
            meta.iconClassName,
            emphasis === "hero" ? "size-14" : emphasis === "secondary" ? "size-12" : "size-10",
          )}
        >
          <Icon className={emphasis === "hero" ? "size-6" : "size-5"} />
        </div>
      </div>

      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Pontuação
          </p>
          <p
            className={cn(
              "mt-1 font-semibold tracking-tight text-foreground",
              emphasis === "hero" ? "text-5xl" : emphasis === "secondary" ? "text-4xl" : "text-3xl",
            )}
          >
            {entry.totalPoints}
          </p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{meta.label}</p>
      </div>
    </Card>
  );
}

export function RankingPageShell({ ranking }: { ranking: RankingPageView }) {
  return (
    <div className="px-5 md:px-8 xl:px-10">
      <div className="mx-auto max-w-360 space-y-6">
        <section className="relative">
          {ranking.showConfetti ? <RankingConfetti /> : null}
          <h1 className="relative mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Ranking
          </h1>
        </section>

        {ranking.entries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {ranking.entries.map((entry, index) => (
              <RankingCard
                key={entry.userId}
                entry={entry}
                emphasis={index === 0 ? "hero" : index === 1 ? "secondary" : "compact"}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-md p-6 text-sm text-muted-foreground">
            Ainda não há ranking calculado. Lance resultados e rode o recálculo.
          </Card>
        )}

        <Card className="rounded-md p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
