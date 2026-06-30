"use client";

import { useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TeamFlag } from "@/components/teams/team-flag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, tabTriggerClass } from "@/lib/utils";
import { getGroupStageMatchFeedback, getKnockoutMatchFeedback } from "@/lib/predictions/feedback";
import {
  type DailyPredictionsMatchView,
  type DailyPredictionsPageView,
} from "@/lib/daily-predictions/queries";

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

type KnockoutStage = Exclude<DailyPredictionsMatchView["stage"], "group_stage">;

const knockoutStages = new Set<KnockoutStage>([
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "third_place",
  "final",
]);

const isKnockoutStage = (
  stage: DailyPredictionsMatchView["stage"],
): stage is KnockoutStage =>
  stage !== "group_stage" && knockoutStages.has(stage);

export function DailyPredictionsPage({ view }: DailyPredictionsPageProps) {
  const [selectedDate, setSelectedDate] = useState(view.selectedDate);
  const selectedDateLabel = selectedDate ? formatDayLabel(selectedDate) : null;
  const selectedMatches = selectedDate ? view.matchesByDate[selectedDate] ?? [] : [];
  const datesRef = useRef<HTMLDivElement | null>(null);
  const dateButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("dia", selectedDate);
    window.history.replaceState(null, "", url);

    dateButtonRefs.current.get(selectedDate)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedDate]);

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
      <section className="relative overflow-hidden rounded-sm border border-[color:var(--wc-ink)] bg-[color:var(--wc-ink)] px-5 py-5 text-primary-foreground shadow-[3px_3px_0_var(--wc-gold)]">
        <p className="wc-display text-xs font-black text-[color:var(--wc-gold)]">
          Comparativo da rodada
        </p>
        <h1 className="mt-1 font-heading text-5xl font-black leading-none sm:text-7xl">
          Palpites do dia
        </h1>

        {view.availableDates.length > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
                    const isActive = dateKey === selectedDate;

                    return (
                      <button
                        key={dateKey}
                        ref={(element) => {
                          if (element) {
                            dateButtonRefs.current.set(dateKey, element);
                          } else {
                            dateButtonRefs.current.delete(dateKey);
                          }
                        }}
                        type="button"
                        onClick={() => setSelectedDate(dateKey)}
                        className={tabTriggerClass(
                          isActive,
                          "inline-flex h-10 items-center rounded-sm px-4 text-sm font-bold",
                        )}
                      >
                        {formatInTimeZone(
                          new Date(`${dateKey}T12:00:00.000Z`),
                          BRAZIL_TIME_ZONE,
                          "dd/MM",
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                onClick={() => scrollDates("right")}
                aria-label="Ver próximas datas"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {selectedDateLabel ? (
              <p className="text-base font-bold capitalize text-primary-foreground/82">
                {selectedDateLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {selectedMatches.length === 0 ? (
        <Card className="border border-border px-5 py-6">
          <p className="text-sm text-muted-foreground">
            Nenhum jogo encontrado para esta data.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {selectedMatches.map((match) => (
            <section key={match.id} className="wc-ticket overflow-hidden rounded-sm">
              <div className="border-b border-border px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="wc-display text-[11px] font-black text-foreground">
                    {formatInTimeZone(
                      new Date(match.scheduledAt),
                      BRAZIL_TIME_ZONE,
                      "HH:mm",
                    )}
                  </span>
                  <span className="wc-display text-[11px] font-black text-muted-foreground">
                    {match.stageLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-4">
                  <div className="flex min-w-0 items-center justify-end gap-3">
                    <p className="truncate text-base font-bold text-foreground">
                      {match.homeTeamName}
                    </p>
                    <TeamFlag code={match.homeTeamFlagCode} />
                  </div>
                  <div className="wc-score-box grid min-w-20 grid-cols-[2rem_1rem_2rem] items-center rounded-sm px-2 py-1 text-center font-heading text-2xl font-black text-foreground">
                    {match.officialResult
                      ? (
                          <>
                            <span>{match.officialResult.homeScore}</span>
                            <span className="text-base text-muted-foreground">x</span>
                            <span>{match.officialResult.awayScore}</span>
                          </>
                        )
                      : <span className="col-span-3 text-base text-muted-foreground">x</span>}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <TeamFlag code={match.awayTeamFlagCode} />
                    <p className="truncate text-base font-bold text-foreground">
                      {match.awayTeamName}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-sm border border-border bg-background/55">
                  {match.predictions.map((prediction) => {
                    const isKnockout = isKnockoutStage(match.stage);
                    const feedback = (() => {
                      if (isKnockoutStage(match.stage)) {
                        return getKnockoutMatchFeedback({
                          stage: match.stage,
                          prediction: {
                            homeScore: prediction.homeScore,
                            awayScore: prediction.awayScore,
                            predictedHomeTeamId: prediction.predictedHomeTeamId,
                            predictedAwayTeamId: prediction.predictedAwayTeamId,
                            predictedAdvancingTeamId: prediction.predictedAdvancingTeamId,
                          },
                          officialResult: match.officialResult,
                          participants: {
                            homeTeamId: match.homeTeamId,
                            awayTeamId: match.awayTeamId,
                          },
                        });
                      }

                      return getGroupStageMatchFeedback({
                        prediction: {
                          homeScore: prediction.homeScore,
                          awayScore: prediction.awayScore,
                        },
                        officialResult: match.officialResult,
                      });
                    })();
                    const pointsLabel = feedback ? `+${feedback.points}` : null;
                    const hasPrediction =
                      prediction.homeScore !== null && prediction.awayScore !== null;
                    const predictedMatchDiffers =
                      isKnockout &&
                      hasPrediction &&
                      (prediction.predictedHomeTeamId !== match.homeTeamId ||
                        prediction.predictedAwayTeamId !== match.awayTeamId);
                    const showAdvancingTeam =
                      isKnockout &&
                      hasPrediction &&
                      prediction.homeScore === prediction.awayScore &&
                      prediction.predictedAdvancingTeamName;

                    return (
                      <div
                        key={prediction.userId}
                        className={cn(
                          "grid grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0",
                          prediction.isCurrentUser && "bg-[color:color-mix(in_oklch,var(--wc-gold)_18%,transparent)]",
                        )}
                      >
                        <p className="min-w-0 truncate text-sm font-bold text-foreground">
                          {prediction.displayName}
                        </p>
                        <div className="min-w-0 text-center">
                          <div className="font-heading text-2xl font-black text-foreground">
                            {hasPrediction
                              ? `${prediction.homeScore} x ${prediction.awayScore}`
                              : "-"}
                          </div>
                          {predictedMatchDiffers ? (
                            <div className="mt-0.5 flex min-w-0 items-center justify-center gap-1 text-[11px] font-bold text-muted-foreground">
                              <TeamFlag
                                code={prediction.predictedHomeTeamFlagCode}
                                className="size-4 shrink-0"
                              />
                              <span className="truncate">
                                {prediction.predictedHomeTeamName ?? "A definir"}
                              </span>
                              <span className="shrink-0">x</span>
                              <span className="truncate">
                                {prediction.predictedAwayTeamName ?? "A definir"}
                              </span>
                              <TeamFlag
                                code={prediction.predictedAwayTeamFlagCode}
                                className="size-4 shrink-0"
                              />
                            </div>
                          ) : null}
                          {showAdvancingTeam ? (
                            <p className="mt-0.5 truncate text-[11px] font-bold text-[color:var(--wc-green-dark)]">
                              {prediction.predictedAdvancingTeamName} passa
                            </p>
                          ) : null}
                        </div>
                        {pointsLabel ? (
                          <div className="flex justify-end">
                            <span
                              className={cn(
                                "wc-display inline-flex shrink-0 rounded-sm border px-2 py-0.5 text-xs font-black",
                                feedback && feedback.points > 0
                                  ? "wc-score-box-positive"
                                  : "wc-score-box-wrong",
                              )}
                            >
                              {pointsLabel}
                            </span>
                          </div>
                        ) : (
                          <div />
                        )}
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
