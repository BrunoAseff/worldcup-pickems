"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GroupStageGroupView } from "@/lib/group-stage/queries";
import {
  createGroupStagePredictionEntry,
  useGroupStagePredictions,
} from "./group-stage-predictions-context";
import { MatchCard } from "./match-card";
import { StandingsTable } from "./standings-table";

type GroupStageShellProps = {
  groups: GroupStageGroupView[];
};

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

export function GroupStageShell({ groups }: GroupStageShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { entries, hydrateFromGroups, updateDraft, queueSave } =
    useGroupStagePredictions();
  const [selection, setSelection] = useState(() =>
    resolveSelection(groups, searchParams.get("grupo"), searchParams.get("rodada")),
  );
  const selectedGroupCode = selection.groupCode;
  const selectedGroup =
    groups.find((group) => group.code === selectedGroupCode) ?? groups[0];
  const selectedRound = selection.round;

  useEffect(() => {
    hydrateFromGroups(groups);
  }, [groups, hydrateFromGroups]);

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

  return (
    <div className="mx-auto w-full max-w-360 space-y-8 px-5 pb-6 pt-2 md:px-8 md:pt-3 xl:px-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-foreground">
          Fase de grupos
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Escolha um grupo, navegue pelas rodadas e registre seus palpites até o
          início de cada partida.
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
            className={
              selectedGroupCode === group.code
                ? "h-11 rounded-md border-foreground/25 bg-card px-4 text-sm text-foreground"
                : "h-11 rounded-md bg-card px-4 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
            }
          >
            Grupo {group.code}
          </Button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,39rem)_minmax(0,46rem)] xl:items-start xl:justify-between">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Classificação
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground">
                Grupo {selectedGroup.code}
              </h2>
            </div>
          </div>

          <StandingsTable standings={selectedGroup.standings} />
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
                className={
                  selectedRound === round.round
                    ? "h-11 rounded-md border-foreground/25 bg-card px-4 text-sm text-foreground"
                    : "h-11 rounded-md bg-card px-4 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                }
              >
                Rodada {round.round}
              </Button>
            ))}
          </div>

          <div className="mt-5 grid gap-2.5">
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
