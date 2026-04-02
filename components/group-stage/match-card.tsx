"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SaveStateIndicator } from "@/components/predictions/save-state-indicator";
import { TeamFlag } from "@/components/teams/team-flag";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatKickoff } from "@/lib/formatters/kickoff";
import { predictionInputSchema } from "@/lib/group-stage/prediction-schema";
import { GroupStageMatchView } from "@/lib/group-stage/queries";
import { getGroupStageMatchFeedback } from "@/lib/predictions/feedback";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type MatchCardProps = {
  match: GroupStageMatchView;
  onPredictionChange: (
    prediction: { homeScore: number; awayScore: number } | null
  ) => void;
};

type SaveStatus = "idle" | "saving" | "saved" | "deleted" | "error";

type SaveResponse = {
  error?: string;
  action?: "created" | "updated" | "deleted" | "noop";
};

type PredictionDraft = {
  homeScore: string;
  awayScore: string;
};

export function MatchCard({ match, onPredictionChange }: MatchCardProps) {
  const homeInputId = `${match.id}-home-score`;
  const awayInputId = `${match.id}-away-score`;
  const validationMessageId = `${match.id}-validation-message`;
  const [values, setValues] = useState({
    homeScore: match.prediction?.homeScore?.toString() ?? "",
    awayScore: match.prediction?.awayScore?.toString() ?? "",
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLocked, setIsLocked] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const saveVersionRef = useRef(0);
  const valuesRef = useRef(values);
  const scheduledTimestamp = new Date(match.scheduledAt).getTime();

  const parsed = predictionInputSchema.safeParse(values);
  const bothEmpty = values.homeScore === "" && values.awayScore === "";
  const bothFilled = values.homeScore !== "" && values.awayScore !== "";
  const validationMessage = !parsed.success
    ? parsed.error.issues[0]?.message ?? "Valor inválido."
    : !bothEmpty && !bothFilled
    ? "Preencha os dois placares."
    : null;

  useEffect(() => {
    const updateLockState = () => {
      setIsLocked(scheduledTimestamp <= Date.now());
    };

    updateLockState();

    const intervalId = window.setInterval(updateLockState, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [scheduledTimestamp]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const persistPrediction = (nextValues: PredictionDraft) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

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

    const saveVersion = ++saveVersionRef.current;

    saveTimerRef.current = window.setTimeout(() => {
      startTransition(async () => {
        setStatus("saving");

        try {
          const response = await fetch(routes.api.groupStagePredictions, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              matchId: match.id,
              homeScore:
                nextValues.homeScore === ""
                  ? null
                  : Number(nextValues.homeScore),
              awayScore:
                nextValues.awayScore === ""
                  ? null
                  : Number(nextValues.awayScore),
            }),
          });

          const payload = (await response.json()) as SaveResponse;

          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          if (!response.ok) {
            setStatus("error");
            setServerMessage(payload.error ?? "Não foi possível salvar agora.");
            return;
          }

          if (payload.action === "deleted") {
            setStatus("deleted");
            setServerMessage("Palpite removido.");
            onPredictionChange(null);
            return;
          }

          if (payload.action === "created" || payload.action === "updated") {
            setStatus("saved");
            setServerMessage("Palpite salvo.");
            onPredictionChange({
              homeScore: Number(nextValues.homeScore),
              awayScore: Number(nextValues.awayScore),
            });
            return;
          }

          setStatus("idle");
          setServerMessage(null);
        } catch {
          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          setStatus("error");
          setServerMessage("Não foi possível salvar agora.");
        }
      });
    }, 350);
  };

  const handleScoreChange = (
    field: keyof PredictionDraft,
    rawValue: string
  ) => {
    const sanitizedValue = rawValue.replace(/\D/g, "").slice(0, 2);
    const nextValues = {
      ...valuesRef.current,
      [field]: sanitizedValue,
    };

    valuesRef.current = nextValues;
    setValues(nextValues);
    setStatus("idle");
    setServerMessage(null);
    persistPrediction(nextValues);
  };

  const statusIcon = useMemo(() => {
    if (!serverMessage) {
      return null;
    }

    if (status === "saving") {
      return {
        message: "Salvando...",
        tone: "saving" as const,
      };
    }

    if (status === "saved" || status === "deleted") {
      return {
        message: serverMessage,
        tone: "success" as const,
      };
    }

    if (status === "error") {
      return {
        message: serverMessage,
        tone: "error" as const,
      };
    }

    return null;
  }, [serverMessage, status]);
  const accessibleStatusMessage =
    validationMessage ?? statusIcon?.message ?? (isLocked ? "Fechado" : null);
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
    <Card className="relative overflow-visible">
      <div className="border-b border-border px-5 py-3">
        <div className="relative flex items-center">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pr-24 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="font-semibold text-foreground">
              Jogo {match.matchNumber.toString().padStart(2, "0")}
            </span>
            <span>{formatKickoff(match.scheduledAt)}</span>
            <span>{match.venueName}</span>
          </div>
          <div className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-2">
            {hasOfficialResult && feedback && pointsLabel ? (
              <div
                className={cn(
                  "shrink-0 rounded-sm border px-2 py-0.5 text-xs font-semibold normal-case tracking-normal whitespace-nowrap",
                  feedback.points > 0
                    ? "border-primary/35 bg-primary/8 text-primary"
                    : "border-red-200 bg-red-50 text-destructive"
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

      <div className={cn("px-5", hasOfficialResult ? "pt-3 pb-1" : "py-4")}>
        {!hasOfficialResult ? (
          <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_1rem_3.5rem_minmax(0,1fr)] items-center gap-3">
            <div className="flex min-w-0 items-center justify-end gap-3">
              <p className="truncate text-base font-medium text-foreground">
                {match.homeTeamName}
              </p>
              <TeamFlag code={match.homeTeamFlagCode} />
            </div>

            <Input
              id={homeInputId}
              inputMode="numeric"
              maxLength={2}
              value={values.homeScore}
              disabled={isLocked || isPending}
              className="h-12 px-0 text-center text-lg font-semibold"
              aria-label={`Placar de ${match.homeTeamName}`}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                validationMessage ? validationMessageId : undefined
              }
              onChange={(event) =>
                handleScoreChange("homeScore", event.target.value)
              }
            />

            <span className="text-center text-sm text-muted-foreground">x</span>

            <Input
              id={awayInputId}
              inputMode="numeric"
              maxLength={2}
              value={values.awayScore}
              disabled={isLocked || isPending}
              className="h-12 px-0 text-center text-lg font-semibold"
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
              <p className="truncate text-base font-medium text-foreground">
                {match.awayTeamName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 py-1">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <div className="flex min-w-0 items-center justify-end gap-2.5">
                <p className="truncate text-base font-medium text-foreground">
                  {match.homeTeamName}
                </p>
                <TeamFlag code={match.homeTeamFlagCode} />
              </div>

              <div className="flex items-center gap-3 text-center">
                <span
                  className={cn(
                    "min-w-6 text-center text-[1.05rem] font-semibold text-foreground",
                    highlightRealScore && "text-primary"
                  )}
                >
                  {match.officialResult!.homeScore}
                </span>
                <span className="text-sm text-muted-foreground">x</span>
                <span
                  className={cn(
                    "min-w-6 text-center text-[1.05rem] font-semibold text-foreground",
                    highlightRealScore && "text-primary"
                  )}
                >
                  {match.officialResult!.awayScore}
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2.5">
                <TeamFlag code={match.awayTeamFlagCode} />
                <p className="truncate text-base font-medium text-foreground">
                  {match.awayTeamName}
                </p>
              </div>
            </div>

            {showPreviousPrediction && match.prediction ? (
              <div className="flex justify-center pt-0.5">
                <div className="inline-flex items-center gap-2 rounded-sm bg-muted/55 px-2.5 py-1 opacity-65">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-border bg-background px-1 text-sm font-semibold text-muted-foreground line-through">
                    {match.prediction.homeScore!}
                  </span>
                  <span className="text-xs text-muted-foreground">x</span>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-border bg-background px-1 text-sm font-semibold text-muted-foreground line-through">
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
                <span className="text-sm font-semibold">{pointsLabel}</span>
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
