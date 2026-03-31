"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GroupStageGroupView } from "@/lib/group-stage/queries";
import { MatchCard } from "./match-card";
import { StandingsTable } from "./standings-table";

type GroupStageShellProps = {
  groups: GroupStageGroupView[];
};

export function GroupStageShell({ groups }: GroupStageShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultGroupCode = groups[0]?.code ?? "A";
  const requestedGroupCode = searchParams.get("grupo");
  const selectedGroupCode =
    groups.some((group) => group.code === requestedGroupCode) && requestedGroupCode
      ? requestedGroupCode
      : defaultGroupCode;
  const selectedGroup =
    groups.find((group) => group.code === selectedGroupCode) ?? groups[0];
  const requestedRound = Number(searchParams.get("rodada"));
  const selectedRound =
    selectedGroup?.rounds.some((round) => round.round === requestedRound)
      ? requestedRound
      : selectedGroup?.defaultRound ?? 1;
  const [predictionOverrides, setPredictionOverrides] = useState<
    Record<string, { homeScore: number; awayScore: number } | null>
  >({});

  if (!selectedGroup) {
    return null;
  }

  const activeRound = selectedGroup.rounds.find(
    (round) => round.round === selectedRound
  );

  const updateUrl = (groupCode: string, round: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("grupo", groupCode);
    params.set("rodada", String(round));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
              const effectivePrediction = Object.prototype.hasOwnProperty.call(
                predictionOverrides,
                match.id
              )
                ? predictionOverrides[match.id]
                : match.prediction;

              return (
                <MatchCard
                  key={match.id}
                  match={{ ...match, prediction: effectivePrediction }}
                  onPredictionChange={(prediction) => {
                    setPredictionOverrides((current) => ({
                      ...current,
                      [match.id]: prediction,
                    }));
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
