"use client";

import { useMemo } from "react";
import { SaveStateIndicator } from "@/components/predictions/save-state-indicator";
import { TeamFlag } from "@/components/teams/team-flag";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKickoff } from "@/lib/formatters/kickoff";
import { groupStageOfficialResultRequestSchema } from "@/lib/group-stage/result-schema";
import { GroupStageMatchView } from "@/lib/group-stage/queries";

type AdminMatchCardProps = {
  match: GroupStageMatchView;
  draft: ResultDraft;
  saveState: {
    status: "idle" | "saving" | "saved" | "deleted" | "error";
    message: string | null;
  };
  onDraftChange: (draft: ResultDraft) => void;
  onSaveRequested: (draft: ResultDraft) => void;
};

type ResultDraft = {
  homeScore: string;
  awayScore: string;
};

export function AdminMatchCard({
  match,
  draft,
  saveState,
  onDraftChange,
  onSaveRequested,
}: AdminMatchCardProps) {
  const validationMessageId = `${match.id}-admin-validation-message`;

  const parsed = groupStageOfficialResultRequestSchema.safeParse({
    matchId: match.id,
    homeScore: draft.homeScore === "" ? null : Number(draft.homeScore),
    awayScore: draft.awayScore === "" ? null : Number(draft.awayScore),
  });
  const validationMessage = !parsed.success
    ? parsed.error.issues[0]?.message ?? "Valor inválido."
    : null;

  const handleScoreChange = (field: keyof ResultDraft, rawValue: string) => {
    const sanitizedValue = rawValue.replace(/\D/g, "").slice(0, 2);
    const nextValues = {
      ...draft,
      [field]: sanitizedValue,
    };

    onDraftChange(nextValues);

    const payload = {
      matchId: match.id,
      homeScore: nextValues.homeScore === "" ? null : Number(nextValues.homeScore),
      awayScore: nextValues.awayScore === "" ? null : Number(nextValues.awayScore),
    };
    const parsedPayload = groupStageOfficialResultRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return;
    }

    onSaveRequested(nextValues);
  };

  const statusIcon = useMemo(() => {
    if (saveState.status === "saving") {
      return {
        tone: "saving" as const,
        message: "Salvando...",
      };
    }

    if (validationMessage || !saveState.message) {
      return null;
    }

    if (saveState.status === "saved" || saveState.status === "deleted") {
      return {
        tone: "success" as const,
        message: saveState.message,
      };
    }

    if (saveState.status === "error") {
      return {
        tone: "error" as const,
        message: saveState.message,
      };
    }

    return null;
  }, [saveState.message, saveState.status, validationMessage]);

  const accessibleStatusMessage = validationMessage ?? statusIcon?.message ?? null;

  return (
    <Card className="relative overflow-visible">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <span className="font-semibold text-foreground">
            Jogo {match.matchNumber.toString().padStart(2, "0")}
          </span>
          <span>{formatKickoff(match.scheduledAt)}</span>
          <span>{match.venueName}</span>
        </div>

        <div className="relative flex size-5 items-center justify-center">
          <SaveStateIndicator
            message={validationMessage ?? statusIcon?.message ?? null}
            tone={validationMessage ? "error" : (statusIcon?.tone ?? null)}
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_1rem_3.5rem_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center justify-end gap-3">
            <p className="truncate text-base font-medium text-foreground">{match.homeTeamName}</p>
            <TeamFlag code={match.homeTeamFlagCode} />
          </div>

          <Input
            inputMode="numeric"
            maxLength={2}
            value={draft.homeScore}
            className="h-12 px-0 text-center text-lg font-semibold"
            aria-label={`Resultado oficial de ${match.homeTeamName}`}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={validationMessage ? validationMessageId : undefined}
            onChange={(event) => handleScoreChange("homeScore", event.target.value)}
          />

          <span className="text-center text-sm text-muted-foreground">x</span>

          <Input
            inputMode="numeric"
            maxLength={2}
            value={draft.awayScore}
            className="h-12 px-0 text-center text-lg font-semibold"
            aria-label={`Resultado oficial de ${match.awayTeamName}`}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={validationMessage ? validationMessageId : undefined}
            onChange={(event) => handleScoreChange("awayScore", event.target.value)}
          />

          <div className="flex min-w-0 items-center gap-3">
            <TeamFlag code={match.awayTeamFlagCode} />
            <p className="truncate text-base font-medium text-foreground">{match.awayTeamName}</p>
          </div>
        </div>

        <div className="sr-only" aria-live="polite" role="status">
          {accessibleStatusMessage}
        </div>
      </div>
    </Card>
  );
}
