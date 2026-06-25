"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { tabTriggerClass } from "@/lib/utils";
import {
  GroupStageGroupView,
  GroupStandingRow,
  type GroupStagePlayerView,
} from "@/lib/group-stage/queries";
import { computeGroupStandings } from "@/lib/group-stage/standings";
import {
  createGroupStagePredictionEntry,
  useGroupStagePredictions,
} from "./group-stage-predictions-context";
import { MatchCard } from "./match-card";
import { StandingsTable } from "./standings-table";

type GroupStageShellProps = {
  groups: GroupStageGroupView[];
  predictionLock: GroupStagePlayerView["predictionLock"];
};

type StandingsViewMode = "official" | "prediction";

function GroupPredictionScoreSummary({ standings }: { standings: GroupStandingRow[] }) {
  const exactPositions = standings.filter(
    (team) => team.predictionFeedback === "exact_position",
  ).length;
  const qualifiedHits = standings
    .slice(0, 2)
    .filter(
      (team) =>
        team.predictionFeedback === "exact_position" ||
        team.predictionFeedback === "qualified_only",
    ).length;
  const points = exactPositions === 4 ? 30 : qualifiedHits === 2 ? 15 : 0;
  const label =
    exactPositions === 4
      ? "Ordem completa"
      : qualifiedHits === 2
        ? "Classificados certos"
        : "Sem bônus de grupo";

  return (
    <div className="wc-panel grid min-h-28 grid-cols-[auto_1fr] items-center gap-4 rounded-sm px-4 py-4">
      <div className="flex size-20 items-center justify-center rounded-sm border border-[color:var(--wc-ink)] bg-[color:var(--wc-gold)] font-heading text-4xl font-black text-[color:var(--wc-ink)] shadow-[2px_2px_0_var(--wc-ink)]">
        {points}
      </div>
      <div className="min-w-0">
        <p className="wc-display text-[10px] font-black text-muted-foreground">
          Pontuação do grupo
        </p>
        <p className="mt-1 text-lg font-black leading-tight text-foreground">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {exactPositions}/4 posições exatas · {qualifiedHits}/2 classificados
        </p>
      </div>
    </div>
  );
}

const resolveSelection = (
  groups: GroupStageGroupView[],
  rawGroupCode: string | null,
  rawRound: string | null,
) => {
  const defaultGroupCode = groups[0]?.code ?? "A";
  const groupCode =
    groups.some((group) => group.code === rawGroupCode) && rawGroupCode
      ? rawGroupCode
      : defaultGroupCode;
  const group = groups.find((entry) => entry.code === groupCode) ?? groups[0];
  const requestedRound = Number(rawRound);
  const round =
    group?.rounds.some((entry) => entry.round === requestedRound)
      ? requestedRound
      : group?.defaultRound ?? 1;

  return {
    groupCode,
    round,
  };
};

export function GroupStageShell({ groups, predictionLock }: GroupStageShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { entries, hydrateFromGroups, updateDraft, queueSave } =
    useGroupStagePredictions();
  const [selection, setSelection] = useState(() =>
    resolveSelection(groups, searchParams.get("grupo"), searchParams.get("rodada")),
  );
  const [standingsView, setStandingsView] =
    useState<StandingsViewMode>("official");
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const selectedGroupCode = selection.groupCode;
  const selectedGroup =
    groups.find((group) => group.code === selectedGroupCode) ?? groups[0];
  const selectedRound = selection.round;

  useEffect(() => {
    hydrateFromGroups(groups);
  }, [groups, hydrateFromGroups]);

  useEffect(() => {
    if (predictionLock.isLocked || !predictionLock.lockAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [predictionLock.isLocked, predictionLock.lockAt]);

  useEffect(() => {
    const handlePopState = () => {
      setSelection(
        resolveSelection(
          groups,
          new URLSearchParams(window.location.search).get("grupo"),
          new URLSearchParams(window.location.search).get("rodada"),
        ),
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [groups]);

  if (!selectedGroup) {
    return null;
  }

  const activeRound = selectedGroup.rounds.find(
    (round) => round.round === selectedRound
  );

  const updateUrl = (groupCode: string, round: number) => {
    setSelection({ groupCode, round });
    const params = new URLSearchParams(window.location.search);
    params.set("grupo", groupCode);
    params.set("rodada", String(round));
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const displayedStandings =
    standingsView === "official"
      ? selectedGroup.standings
      : computeGroupStandings(
          selectedGroup.standings.map((standing) => ({
            id: standing.teamId,
            code: standing.teamCode,
            namePt: standing.teamName,
            flagCode: standing.flagCode,
          })),
          selectedGroup.rounds
            .flatMap((round) => round.matches)
            .map((match) => {
              const entry = entries[match.id];
              const draft = entry?.draft;

              if (
                draft &&
                draft.homeScore !== "" &&
                draft.awayScore !== ""
              ) {
                return {
                  homeTeamId: match.homeTeamId,
                  awayTeamId: match.awayTeamId,
                  homeScore: Number(draft.homeScore),
                  awayScore: Number(draft.awayScore),
                  scheduledAt: new Date(match.scheduledAt),
                };
              }

              const prediction = entry?.prediction ?? match.prediction;

              if (
                !prediction ||
                prediction.homeScore === null ||
                prediction.awayScore === null
              ) {
                return null;
              }

              return {
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                homeScore: prediction.homeScore,
                awayScore: prediction.awayScore,
                scheduledAt: new Date(match.scheduledAt),
              };
            })
            .filter((match): match is NonNullable<typeof match> => Boolean(match)),
        ).standings.map(
          (standing): GroupStandingRow => ({
            teamId: standing.teamId,
            teamName: standing.teamName,
            teamCode: standing.teamCode,
            flagCode: standing.flagCode,
            position: standing.position,
            points: standing.points,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            form: standing.form,
            recentResults: standing.recentResults,
            qualificationStatus: standing.qualificationStatus,
            predictionFeedback: "none",
          }),
        );
  const predictionsLocked =
    predictionLock.isLocked ||
    (predictionLock.lockAt
      ? new Date(predictionLock.lockAt).getTime() <= nowTimestamp
      : false);

  return (
    <div className="mx-auto w-full max-w-360 space-y-7 px-5 pb-6 pt-2 md:px-8 md:pt-3 xl:px-10">
      <div className="relative overflow-hidden rounded-sm border border-[color:var(--wc-ink)] bg-[color:var(--wc-ink)] px-5 py-5 text-primary-foreground shadow-[3px_3px_0_var(--wc-gold)]">
        <p className="wc-display text-xs font-black text-[color:var(--wc-gold)]">
          Copa do Mundo 2026
        </p>
        <h1 className="mt-1 font-heading text-5xl font-black leading-none sm:text-7xl">
          Fase de grupos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/78">
          Escolha um grupo, navegue pelas rodadas e registre seus palpites até o
          bloqueio global da fase.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {groups.map((group) => (
          <Button
            key={group.code}
            type="button"
            onClick={() => {
              updateUrl(group.code, group.defaultRound);
            }}
            variant="outline"
            className={tabTriggerClass(
              selectedGroupCode === group.code,
              "h-11 rounded-sm px-4 text-sm",
            )}
          >
            Grupo {group.code}
          </Button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,39rem)_minmax(0,46rem)] xl:items-start xl:justify-between">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="wc-display text-xs font-black text-muted-foreground">
                Classificação
              </p>
              <h2 className="mt-1 font-heading text-4xl font-black leading-none text-foreground">
                Grupo {selectedGroup.code}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStandingsView("official")}
                className={tabTriggerClass(
                  standingsView === "official",
                  "h-10 rounded-sm px-3 text-sm",
                )}
              >
                Oficial
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStandingsView("prediction")}
                className={tabTriggerClass(
                  standingsView === "prediction",
                  "h-10 rounded-sm px-3 text-sm",
                )}
              >
                Previsão
              </Button>
            </div>
          </div>

          <StandingsTable standings={displayedStandings} />
          <GroupPredictionScoreSummary standings={selectedGroup.standings} />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            {selectedGroup.rounds.map((round) => (
              <Button
                key={round.round}
                type="button"
                onClick={() => {
                  updateUrl(selectedGroup.code, round.round);
                }}
                variant="outline"
                className={tabTriggerClass(
                  selectedRound === round.round,
                  "h-11 rounded-sm px-4 text-sm",
                )}
              >
                Rodada {round.round}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <p className="wc-display text-xs font-black text-muted-foreground">
              Jogos
            </p>
            <h2 className="font-heading text-4xl font-black leading-none text-foreground">
              Grupo {selectedGroup.code} · Rodada {selectedRound}
            </h2>
          </div>

          <div className="grid gap-2.5">
            {activeRound?.matches.map((match) => {
              const entry = entries[match.id];
              const fallbackEntry = createGroupStagePredictionEntry(
                match.prediction,
              );
              const effectivePrediction =
                entry?.prediction ?? fallbackEntry.prediction;
              const draft = entry?.draft ?? fallbackEntry.draft;

              return (
                <MatchCard
                  key={match.id}
                  match={{ ...match, prediction: effectivePrediction }}
                  isLocked={predictionsLocked}
                  draft={draft}
                  saveState={{
                    status: entry?.status ?? "idle",
                    message: entry?.message ?? null,
                  }}
                  onDraftChange={(nextDraft) => {
                    updateDraft(match.id, nextDraft);
                  }}
                  onSaveRequested={(nextDraft) => {
                    queueSave(match.id, nextDraft);
                  }}
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
