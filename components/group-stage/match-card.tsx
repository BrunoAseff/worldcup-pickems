"use client";

import { formatInTimeZone } from "date-fns-tz";
import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TeamFlag } from "@/components/teams/team-flag";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { predictionInputSchema } from "@/lib/group-stage/prediction-schema";
import { GroupStageMatchView } from "@/lib/group-stage/queries";
import { routes } from "@/lib/routes";

type MatchCardProps = {
  match: GroupStageMatchView;
  onPredictionChange: (prediction: { homeScore: number; awayScore: number } | null) => void;
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

const formatKickoff = (scheduledAt: string) =>
  formatInTimeZone(new Date(scheduledAt), "America/Sao_Paulo", "dd/MM • HH:mm");

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
    const nextBothEmpty = nextValues.homeScore === "" && nextValues.awayScore === "";
    const nextBothFilled = nextValues.homeScore !== "" && nextValues.awayScore !== "";

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
              homeScore: nextValues.homeScore === "" ? null : Number(nextValues.homeScore),
              awayScore: nextValues.awayScore === "" ? null : Number(nextValues.awayScore),
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

  const handleScoreChange = (field: keyof PredictionDraft, rawValue: string) => {
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
    if (validationMessage || !serverMessage) {
      return null;
    }

    if (status === "saving") {
      return {
        icon: <LoaderCircle className="size-4 animate-spin text-muted-foreground" />,
        message: "Salvando...",
      };
    }

    if (status === "saved" || status === "deleted") {
      return {
        icon: <Check className="size-4 text-primary" />,
        message: serverMessage,
      };
    }

    if (status === "error") {
      return {
        icon: <AlertCircle className="size-4 text-destructive" />,
        message: serverMessage,
      };
    }

    return null;
  }, [serverMessage, status, validationMessage]);
  const accessibleStatusMessage = validationMessage ?? statusIcon?.message ?? (isLocked ? "Fechado" : null);

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
          {validationMessage ? (
            <>
              <AlertCircle
                tabIndex={0}
                aria-describedby={validationMessageId}
                className="peer size-4 text-destructive"
              />
              <div
                id={validationMessageId}
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-card-foreground opacity-0 transition-opacity peer-hover:opacity-100 peer-focus:opacity-100 peer-focus-visible:opacity-100"
              >
                {validationMessage}
              </div>
            </>
          ) : statusIcon ? (
            <>
              <div
                tabIndex={0}
                aria-describedby={validationMessageId}
                className="peer flex size-5 items-center justify-center"
              >
                {statusIcon.icon}
              </div>
              <div
                id={validationMessageId}
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-card-foreground opacity-0 transition-opacity peer-hover:opacity-100 peer-focus:opacity-100 peer-focus-visible:opacity-100"
              >
                {statusIcon.message}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_1rem_3.5rem_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center justify-end gap-3">
            <p className="truncate text-base font-medium text-foreground">{match.homeTeamName}</p>
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
            aria-describedby={validationMessage ? validationMessageId : undefined}
            onChange={(event) => handleScoreChange("homeScore", event.target.value)}
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
