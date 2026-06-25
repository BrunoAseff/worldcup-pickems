"use client";

import { useMemo } from "react";
import { SaveStateIndicator } from "@/components/predictions/save-state-indicator";
import { TeamFlag } from "@/components/teams/team-flag";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKickoff } from "@/lib/formatters/kickoff";
import { predictionInputSchema } from "@/lib/group-stage/prediction-schema";
import { GroupStageMatchView } from "@/lib/group-stage/queries";
import { getGroupStageMatchFeedback } from "@/lib/predictions/feedback";
import { cn } from "@/lib/utils";
import {
  GroupStagePredictionDraft,
  GroupStageSaveStatus,
} from "./group-stage-predictions-context";

type MatchCardProps = {
  match: GroupStageMatchView;
  isLocked: boolean;
  draft: GroupStagePredictionDraft;
  saveState: {
    status: GroupStageSaveStatus;
    message: string | null;
  };
  onDraftChange: (draft: GroupStagePredictionDraft) => void;
  onSaveRequested: (draft: GroupStagePredictionDraft) => void;
};

export function MatchCard({
  match,
  isLocked,
  draft,
  saveState,
  onDraftChange,
  onSaveRequested,
}: MatchCardProps) {
  const homeInputId = `${match.id}-home-score`;
  const awayInputId = `${match.id}-away-score`;
  const validationMessageId = `${match.id}-validation-message`;

  const parsed = predictionInputSchema.safeParse(draft);
  const bothEmpty = draft.homeScore === "" && draft.awayScore === "";
  const bothFilled = draft.homeScore !== "" && draft.awayScore !== "";
  const validationMessage = !parsed.success
    ? parsed.error.issues[0]?.message ?? "Valor inválido."
    : !bothEmpty && !bothFilled
      ? "Preencha os dois placares."
      : null;

  const handleScoreChange = (
    field: keyof GroupStagePredictionDraft,
    rawValue: string
  ) => {
    const sanitizedValue = rawValue.replace(/\D/g, "").slice(0, 2);
    const nextValues = {
      ...draft,
      [field]: sanitizedValue,
    };

    onDraftChange(nextValues);

    if (isLocked) {
      return;
    }

    const nextParsed = predictionInputSchema.safeParse(nextValues);
    const nextBothEmpty =
      nextValues.homeScore === "" && nextValues.awayScore === "";
    const nextBothFilled =
      nextValues.homeScore !== "" && nextValues.awayScore !== "";

    if (!nextParsed.success || (!nextBothEmpty && !nextBothFilled)) {
      return;
    }

    onSaveRequested(nextValues);
  };

  const statusIcon = useMemo(() => {
    if (saveState.status === "saving") {
      return {
        message: "Salvando...",
        tone: "saving" as const,
      };
    }

    if (!saveState.message) {
      return null;
    }

    if (saveState.status === "saved" || saveState.status === "deleted") {
      return {
        message: saveState.message,
        tone: "success" as const,
      };
    }

    if (saveState.status === "error") {
      return {
        message: saveState.message,
        tone: "error" as const,
      };
    }

    return null;
  }, [saveState.message, saveState.status]);
  const accessibleStatusMessage = validationMessage ?? statusIcon?.message ?? null;
  const feedback = getGroupStageMatchFeedback({
    prediction: match.prediction,
    officialResult: match.officialResult,
  });
  const hasOfficialResult = Boolean(match.officialResult);
  const pointsLabel = feedback ? `${feedback.points}pts` : null;
  const highlightRealScore = feedback?.kind === "exact";
  const showPreviousPrediction = Boolean(
    match.prediction &&
      match.prediction.homeScore !== null &&
      match.prediction.awayScore !== null &&
      match.officialResult &&
      (match.prediction.homeScore !== match.officialResult.homeScore ||
        match.prediction.awayScore !== match.officialResult.awayScore)
  );

  return (
    <Card className="wc-ticket relative overflow-visible rounded-sm">
      <div className="border-b border-border px-4 py-2.5">
        <div className="relative flex items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-24 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="wc-display font-black text-foreground">
              Jogo {match.matchNumber.toString().padStart(2, "0")}
            </span>
            <span>{formatKickoff(match.scheduledAt)}</span>
            <span className="hidden sm:inline">{match.venueName}</span>
          </div>
          <div className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-2">
            {hasOfficialResult && feedback && pointsLabel ? (
              <div
                className={cn(
                  "wc-display hidden shrink-0 rounded-sm border px-2 py-0.5 text-xs font-black whitespace-nowrap md:block",
                  feedback.points > 0
                    ? "wc-score-box-positive"
                    : "wc-score-box-wrong"
                )}
              >
                {pointsLabel}
              </div>
            ) : null}
            <SaveStateIndicator
              message={validationMessage ?? statusIcon?.message ?? null}
              tone={validationMessage ? "error" : statusIcon?.tone ?? null}
            />
          </div>
        </div>
      </div>

      <div className={cn("px-4", hasOfficialResult ? "pt-3 pb-2" : "py-4")}>
        {!hasOfficialResult ? (
          <div className="grid grid-cols-[minmax(0,1fr)_3.75rem_1.25rem_3.75rem_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 items-center justify-end gap-3">
              <p className="truncate text-base font-bold text-foreground">
                {match.homeTeamName}
              </p>
              <TeamFlag code={match.homeTeamFlagCode} />
            </div>

            <Input
              id={homeInputId}
              inputMode="numeric"
              maxLength={2}
              value={draft.homeScore}
              disabled={isLocked}
              className="wc-score-box h-[3.25rem] px-0 text-center font-heading text-3xl font-black"
              aria-label={`Placar de ${match.homeTeamName}`}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                validationMessage ? validationMessageId : undefined
              }
              onChange={(event) =>
                handleScoreChange("homeScore", event.target.value)
              }
            />

            <span className="text-center font-heading text-xl font-black text-muted-foreground">x</span>

            <Input
              id={awayInputId}
              inputMode="numeric"
              maxLength={2}
              value={draft.awayScore}
              disabled={isLocked}
              className="wc-score-box h-[3.25rem] px-0 text-center font-heading text-3xl font-black"
              aria-label={`Placar de ${match.awayTeamName}`}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                validationMessage ? validationMessageId : undefined
              }
              onChange={(event) =>
                handleScoreChange("awayScore", event.target.value)
              }
            />

            <div className="flex min-w-0 items-center gap-3">
              <TeamFlag code={match.awayTeamFlagCode} />
              <p className="truncate text-base font-bold text-foreground">
                {match.awayTeamName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <p className="truncate text-base font-bold text-foreground">
                  {match.homeTeamName}
                </p>
                <TeamFlag code={match.homeTeamFlagCode} />
              </div>

              <div className="grid grid-cols-[3rem_1.25rem_3rem] items-center text-center">
                <span
                  className={cn(
                    "wc-score-box inline-flex h-11 items-center justify-center rounded-sm font-heading text-3xl font-black",
                    highlightRealScore && "wc-score-box-positive"
                  )}
                >
                  {match.officialResult!.homeScore}
                </span>
                <span className="font-heading text-lg font-black text-muted-foreground">x</span>
                <span
                  className={cn(
                    "wc-score-box inline-flex h-11 items-center justify-center rounded-sm font-heading text-3xl font-black",
                    highlightRealScore && "wc-score-box-positive"
                  )}
                >
                  {match.officialResult!.awayScore}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2.5">
                <TeamFlag code={match.awayTeamFlagCode} />
                <p className="truncate text-base font-bold text-foreground">
                  {match.awayTeamName}
                </p>
              </div>
            </div>

            {showPreviousPrediction && match.prediction ? (
              <div className="flex justify-center">
                <div className="inline-grid grid-cols-[auto_1.75rem_1rem_1.75rem] items-center gap-x-1 rounded-sm border border-border bg-muted/55 px-2 py-1 opacity-75">
                  <span className="wc-display text-[10px] font-black text-muted-foreground">
                    Seu palpite
                  </span>
                  <span className="inline-flex h-6 w-7 items-center justify-center rounded-sm border border-border bg-background px-1 text-sm font-semibold text-muted-foreground line-through">
                    {match.prediction.homeScore!}
                  </span>
                  <span className="flex h-6 items-center justify-center text-center text-xs text-muted-foreground">x</span>
                  <span className="inline-flex h-6 w-7 items-center justify-center rounded-sm border border-border bg-background px-1 text-sm font-semibold text-muted-foreground line-through">
                    {match.prediction.awayScore!}
                  </span>
                </div>
              </div>
            ) : null}

            {hasOfficialResult && feedback && pointsLabel ? (
              <div
                className={cn(
                  "flex justify-end md:hidden",
                  feedback.points > 0 ? "text-primary" : "text-destructive"
                )}
              >
                <span className="wc-display text-sm font-black">{pointsLabel}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="sr-only" aria-live="polite" role="status">
          {accessibleStatusMessage}
        </div>
      </div>
    </Card>
  );
}
