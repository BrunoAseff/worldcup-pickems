"use client";

import { useRef } from "react";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeamFlag } from "@/components/teams/team-flag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getGroupStageMatchFeedback } from "@/lib/predictions/feedback";
import { type DailyPredictionsPageView } from "@/lib/daily-predictions/queries";
import { routes } from "@/lib/routes";

const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

const formatDayLabel = (dateKey: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(`${dateKey}T12:00:00.000Z`));

type DailyPredictionsPageProps = {
  view: DailyPredictionsPageView;
};

export function DailyPredictionsPage({ view }: DailyPredictionsPageProps) {
  const selectedDateLabel = view.selectedDate ? formatDayLabel(view.selectedDate) : null;
  const datesRef = useRef<HTMLDivElement | null>(null);

  const scrollDates = (direction: "left" | "right") => {
    const element = datesRef.current;

    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  return (
    <div className="mx-auto w-full max-w-360 space-y-6 px-5 pb-8 pt-1 md:px-8 xl:px-10">
      <section className="space-y-4 border-b border-border pb-4">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground">
          Palpites do dia
        </h1>

        {view.availableDates.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => scrollDates("left")}
                aria-label="Ver datas anteriores"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div
                ref={datesRef}
                className="overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex min-w-max gap-2">
                  {view.availableDates.map((dateKey) => {
                    const isActive = dateKey === view.selectedDate;

                    return (
                      <Link
                        key={dateKey}
                        href={`${routes.dailyPredictions}?dia=${dateKey}`}
                        className={cn(
                          "inline-flex h-10 items-center rounded-sm border px-4 text-sm font-medium transition-colors",
                          isActive
                            ? "border-foreground/20 bg-card text-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-card hover:text-foreground",
                        )}
                      >
                        {formatInTimeZone(
                          new Date(`${dateKey}T12:00:00.000Z`),
                          BRAZIL_TIME_ZONE,
                          "dd/MM",
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => scrollDates("right")}
                aria-label="Ver próximas datas"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {selectedDateLabel ? (
              <p className="text-base font-medium capitalize text-foreground">
                {selectedDateLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {view.matches.length === 0 ? (
        <Card className="border border-border px-5 py-6">
          <p className="text-sm text-muted-foreground">
            Nenhum jogo encontrado para esta data.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {view.matches.map((match) => (
            <section key={match.id} className="rounded-md border border-border bg-card px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {formatInTimeZone(
                      new Date(match.scheduledAt),
                      BRAZIL_TIME_ZONE,
                      "HH:mm",
                    )}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {match.stageLabel}
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-4">
                  <div className="flex min-w-0 items-center justify-end gap-3">
                    <p className="truncate text-base font-medium text-foreground">
                      {match.homeTeamName}
                    </p>
                    <TeamFlag code={match.homeTeamFlagCode} />
                  </div>
                  <div className="min-w-16 text-center font-mono text-base font-semibold text-foreground">
                    {match.officialResult
                      ? `${match.officialResult.homeScore} x ${match.officialResult.awayScore}`
                      : "x"}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <TeamFlag code={match.awayTeamFlagCode} />
                    <p className="truncate text-base font-medium text-foreground">
                      {match.awayTeamName}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {match.predictions.map((prediction) => {
                    const feedback = getGroupStageMatchFeedback({
                      prediction: {
                        homeScore: prediction.homeScore,
                        awayScore: prediction.awayScore,
                      },
                      officialResult: match.officialResult,
                    });
                    const pointsLabel = feedback ? `+${feedback.points}` : null;

                    return (
                      <div
                        key={prediction.userId}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5",
                          prediction.isCurrentUser && "bg-muted/45",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <p className="truncate text-sm font-medium text-foreground">
                            {prediction.displayName}
                          </p>
                          {pointsLabel ? (
                            <span
                              className={cn(
                                "inline-flex shrink-0 rounded-sm border px-2 py-0.5 text-xs font-semibold",
                                feedback.points > 0
                                  ? "border-primary/35 bg-primary/8 text-primary"
                                  : "border-red-200 bg-red-50 text-destructive",
                              )}
                            >
                              {pointsLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="shrink-0 font-mono text-sm font-semibold text-foreground">
                          {prediction.homeScore !== null && prediction.awayScore !== null
                            ? `${prediction.homeScore} x ${prediction.awayScore}`
                            : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
