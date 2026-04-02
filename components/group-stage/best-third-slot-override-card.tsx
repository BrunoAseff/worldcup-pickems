"use client";

import { useMemo, useState, useTransition } from "react";
import { TeamFlag } from "@/components/teams/team-flag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";

type BestThirdSlotOverrideCardProps = {
  slots: Array<{
    slotKey: string;
    sourceRef: string;
    matchLabel: string;
    opponentName: string;
    opponentFlagCode: string | null;
    selectedTeamId: string | null;
  }>;
  options: Array<{
    teamId: string;
    teamName: string;
    flagCode: string | null;
    groupCode: string;
  }>;
};

export function BestThirdSlotOverrideCard({
  slots,
  options,
}: BestThirdSlotOverrideCardProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(
      slots
        .filter((slot) => slot.selectedTeamId)
        .map((slot) => [slot.slotKey, slot.selectedTeamId!]),
    ),
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedTeamIds = useMemo(
    () => new Set(Object.values(assignments).filter(Boolean)),
    [assignments],
  );

  const saveOverride = () => {
    startTransition(async () => {
      setFeedbackMessage(null);

      if (slots.some((slot) => !assignments[slot.slotKey])) {
        setFeedbackMessage("Defina todos os terceiros colocados antes de salvar.");
        return;
      }

      try {
        const response = await fetch(routes.api.groupStageBestThirdOverrides, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assignments: slots.map((slot) => ({
              slotKey: slot.slotKey,
              teamId: assignments[slot.slotKey],
            })),
          }),
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          setFeedbackMessage(payload.error ?? "Não foi possível salvar as vagas dos terceiros.");
          return;
        }

        setFeedbackMessage("Terceiros colocados salvos. Agora você já pode recalcular.");
      } catch {
        setFeedbackMessage("Não foi possível salvar as vagas dos terceiros.");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg">Desempate manual dos terceiros colocados</CardTitle>
        <CardDescription>
          Todos os grupos já terminaram, mas o corte dos 8 melhores terceiros segue empatado.
          Escolha manualmente quem ocupa cada vaga do mata-mata e depois rode o recálculo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 xl:grid-cols-2">
          {slots.map((slot) => (
            <div
              key={slot.slotKey}
              className="grid gap-3 rounded-md border border-border bg-background px-4 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {slot.matchLabel} • 3º {slot.sourceRef}
                </p>
                <div className="flex items-center gap-2">
                  <TeamFlag code={slot.opponentFlagCode} />
                  <p className="truncate text-sm font-medium text-foreground">{slot.opponentName}</p>
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Seleção do slot
                </span>
                <select
                  value={assignments[slot.slotKey] ?? ""}
                  onChange={(event) =>
                    setAssignments((current) => ({
                      ...current,
                      [slot.slotKey]: event.target.value,
                    }))
                  }
                  disabled={isPending}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-primary"
                >
                  <option value="">Escolha um terceiro colocado</option>
                  {options.map((option) => {
                    const isChosenElsewhere =
                      selectedTeamIds.has(option.teamId) &&
                      assignments[slot.slotKey] !== option.teamId;

                    return (
                      <option
                        key={option.teamId}
                        value={option.teamId}
                        disabled={isChosenElsewhere}
                      >
                        {option.groupCode} • {option.teamName}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Salve as vagas e depois clique em recalcular classificação.
          </p>
          <Button type="button" onClick={saveOverride} disabled={isPending} className="h-11 rounded-md px-4">
            Salvar terceiros classificados
          </Button>
        </div>

        {feedbackMessage ? (
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{feedbackMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
