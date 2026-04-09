"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { TeamFlag } from "@/components/teams/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupStandingRow } from "@/lib/group-stage/queries";
import { routes } from "@/lib/routes";

type GroupTiebreakOverrideCardProps = {
  groupId: string;
  groupCode: string;
  teams: GroupStandingRow[];
  initialOrderedTeamIds: string[] | null;
  suggestedOrderedTeamIds: string[];
  conflictTeamIds: string[][];
};

const reorder = (items: string[], fromIndex: number, toIndex: number) => {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item!);
  return next;
};

export function GroupTiebreakOverrideCard({
  groupId,
  groupCode,
  teams,
  initialOrderedTeamIds,
  suggestedOrderedTeamIds = [],
  conflictTeamIds = [],
}: GroupTiebreakOverrideCardProps) {
  const resolvedSuggestedOrderedTeamIds =
    suggestedOrderedTeamIds.length > 0 ? suggestedOrderedTeamIds : teams.map((team) => team.teamId);
  const [orderedTeamIds, setOrderedTeamIds] = useState(
    initialOrderedTeamIds ?? resolvedSuggestedOrderedTeamIds,
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const teamById = useMemo(() => new Map(teams.map((team) => [team.teamId, team])), [teams]);
  const conflictGroupByTeamId = useMemo(() => {
    const groupByTeamId = new Map<string, number>();
    const resolvedConflictTeamIds =
      conflictTeamIds.length > 0 ? conflictTeamIds : [resolvedSuggestedOrderedTeamIds];

    resolvedConflictTeamIds.forEach((teamIds, groupIndex) => {
      teamIds.forEach((teamId) => {
        groupByTeamId.set(teamId, groupIndex);
      });
    });

    return groupByTeamId;
  }, [conflictTeamIds, resolvedSuggestedOrderedTeamIds]);

  const orderedTeams = orderedTeamIds
    .map((teamId) => teamById.get(teamId))
    .filter((team): team is NonNullable<typeof team> => Boolean(team));

  const canMove = (teamId: string, index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= orderedTeamIds.length) {
      return false;
    }

    const currentGroup = conflictGroupByTeamId.get(teamId);
    const neighborTeamId = orderedTeamIds[targetIndex];
    const neighborGroup = neighborTeamId ? conflictGroupByTeamId.get(neighborTeamId) : undefined;

    if (currentGroup === undefined || neighborGroup === undefined) {
      return false;
    }

    return currentGroup === neighborGroup;
  };

  const saveOverride = () => {
    startTransition(async () => {
      setFeedbackMessage(null);

      try {
        const response = await fetch(routes.api.groupStageTiebreakOverrides, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            groupId,
            orderedTeamIds,
          }),
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          setFeedbackMessage(payload.error ?? "Não foi possível salvar a decisão manual.");
          return;
        }

        setFeedbackMessage("Ordem manual salva. Agora você já pode recalcular a classificação.");
      } catch {
        setFeedbackMessage("Não foi possível salvar a decisão manual.");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Desempate manual do Grupo {groupCode}</CardTitle>
        <CardDescription>
          Este grupo ainda tem empate não resolvido com os dados disponíveis. Defina a ordem final
          manualmente e depois rode o recálculo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          {orderedTeams.map((team, index) => (
            <div
              key={team.teamId}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-5 text-sm font-semibold text-muted-foreground">{index + 1}</span>
                <TeamFlag code={team.flagCode} />
                <span className="truncate text-sm font-medium text-foreground">{team.teamName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-md"
                  disabled={!canMove(team.teamId, index, "up") || isPending}
                  onClick={() => setOrderedTeamIds((current) => reorder(current, index, index - 1))}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-md"
                  disabled={!canMove(team.teamId, index, "down") || isPending}
                  onClick={() => setOrderedTeamIds((current) => reorder(current, index, index + 1))}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Só é possível reordenar os times realmente empatados. Salve a ordem e depois clique em recalcular classificação.
          </p>
          <Button type="button" onClick={saveOverride} disabled={isPending} className="h-11 rounded-md px-4">
            Salvar decisão manual
          </Button>
        </div>

        {feedbackMessage ? (
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{feedbackMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
