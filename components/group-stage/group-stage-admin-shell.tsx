"use client";

import { formatInTimeZone } from "date-fns-tz";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminMatchCard } from "@/components/group-stage/admin-match-card";
import { GroupTiebreakOverrideCard } from "@/components/group-stage/group-tiebreak-override-card";
import { Button } from "@/components/ui/button";
import { GroupStageGroupView } from "@/lib/group-stage/queries";
import { routes } from "@/lib/routes";
import { StandingsTable } from "./standings-table";

type GroupStageAdminShellProps = {
  groups: GroupStageGroupView[];
  lastRecalculatedAt: string | null;
};

const formatRecalculatedAt = (value: string) =>
  formatInTimeZone(new Date(value), "America/Sao_Paulo", "dd/MM • HH:mm");

export function GroupStageAdminShell({
  groups,
  lastRecalculatedAt,
}: GroupStageAdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultGroupCode = groups[0]?.code ?? "A";
  const requestedGroupCode = searchParams.get("grupo");
  const selectedGroupCode =
    groups.some((group) => group.code === requestedGroupCode) && requestedGroupCode
      ? requestedGroupCode
      : defaultGroupCode;
  const selectedGroup = groups.find((group) => group.code === selectedGroupCode) ?? groups[0];
  const requestedRound = Number(searchParams.get("rodada"));
  const selectedRound =
    selectedGroup?.rounds.some((round) => round.round === requestedRound)
      ? requestedRound
      : selectedGroup?.defaultRound ?? 1;
  const [recalculationMessage, setRecalculationMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!selectedGroup) {
    return null;
  }

  const activeRound = selectedGroup.rounds.find((round) => round.round === selectedRound);
  const selectedGroupIsComplete = selectedGroup.standings.every((team) => team.played === 3);

  const updateUrl = (groupCode: string, round: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("grupo", groupCode);
    params.set("rodada", String(round));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const triggerRecalculation = () => {
    startTransition(async () => {
      setRecalculationMessage(null);

      try {
        const response = await fetch(routes.api.groupStageRecalculations, {
          method: "POST",
        });
        const payload = (await response.json()) as { error?: string; recalculatedAt?: string };

        if (!response.ok) {
          setRecalculationMessage(payload.error ?? "Não foi possível recalcular agora.");
          return;
        }

        setRecalculationMessage("Classificação recalculada.");
        router.refresh();
      } catch {
        setRecalculationMessage("Não foi possível recalcular agora.");
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-8 px-5 pb-6 pt-2 md:px-8 md:pt-3 xl:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-foreground">
            Fase de grupos
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Lance os resultados oficiais e recalcule a classificação quando quiser refletir os
            novos dados nas tabelas.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Button
            type="button"
            onClick={triggerRecalculation}
            disabled={isPending}
            className="h-11 rounded-md px-4"
          >
            <RefreshCw className={isPending ? "size-4 animate-spin" : "size-4"} />
            Recalcular classificação
          </Button>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {lastRecalculatedAt
              ? `Último recálculo: ${formatRecalculatedAt(lastRecalculatedAt)}`
              : "Ainda não houve recálculo manual."}
          </p>
          {recalculationMessage ? (
            <p className="max-w-md text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {recalculationMessage}
            </p>
          ) : null}
        </div>
      </div>

      {selectedGroupIsComplete && selectedGroup.tiebreak.requiresManualDecision ? (
        <GroupTiebreakOverrideCard
          groupId={selectedGroup.id}
          groupCode={selectedGroup.code}
          teams={selectedGroup.standings}
          initialOrderedTeamIds={selectedGroup.tiebreak.orderedTeamIds}
        />
      ) : null}

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
                ? "h-11 rounded-md border-foreground/18 bg-card px-4 text-sm text-foreground"
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
                    ? "h-11 rounded-md border-foreground/18 bg-card px-4 text-sm text-foreground"
                    : "h-11 rounded-md bg-card px-4 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                }
              >
                Rodada {round.round}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {activeRound?.matches.map((match) => <AdminMatchCard key={match.id} match={match} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
