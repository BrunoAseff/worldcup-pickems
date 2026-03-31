"use client";

import { formatInTimeZone } from "date-fns-tz";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  LockKeyhole,
  Trophy,
} from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TeamFlag } from "@/components/teams/team-flag";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KnockoutMatchView } from "@/lib/knockout/queries";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

type KnockoutMatchCardProps = {
  match: KnockoutMatchView;
  mode: "player" | "admin";
  isLocked: boolean;
  compact?: boolean;
};

type SaveStatus = "idle" | "saving" | "saved" | "deleted" | "error";

type SaveResponse = {
  error?: string;
  action?: "created" | "updated" | "deleted" | "noop";
};

type Draft = {
  homeScore: string;
  awayScore: string;
  advancingTeamId: string | null;
};

const formatKickoff = (scheduledAt: string) =>
  formatInTimeZone(new Date(scheduledAt), "America/Sao_Paulo", "dd/MM • HH:mm");

export function KnockoutMatchCard({
  match,
  mode,
  isLocked,
  compact = false,
}: KnockoutMatchCardProps) {
  const router = useRouter();
  const existingState =
    mode === "player" ? match.prediction : match.officialResult;
  const initialValues = useMemo(
    () => ({
      homeScore: existingState?.homeScore?.toString() ?? "",
      awayScore: existingState?.awayScore?.toString() ?? "",
      advancingTeamId:
        mode === "player"
          ? match.prediction?.predictedAdvancingTeamId ?? null
          : match.officialResult?.advancingTeamId ?? null,
    }),
    [
      existingState?.awayScore,
      existingState?.homeScore,
      match.officialResult?.advancingTeamId,
      match.prediction?.predictedAdvancingTeamId,
      mode,
    ],
  );
  const [values, setValues] = useState<Draft>(initialValues);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimerRef = useRef<number | null>(null);
  const saveVersionRef = useRef(0);
  const canEdit =
    mode === "player"
      ? match.canEditPrediction && !isLocked
      : match.homeParticipant.resolved && match.awayParticipant.resolved;

  const bothEmpty = values.homeScore === "" && values.awayScore === "";
  const bothFilled = values.homeScore !== "" && values.awayScore !== "";
  const isDraw = bothFilled && values.homeScore === values.awayScore;
  const unresolved =
    !match.homeParticipant.resolved || !match.awayParticipant.resolved;
  const showScores = !unresolved;
  const validationMessage =
    !bothEmpty && !bothFilled
      ? "Preencha os dois placares."
      : isDraw && !values.advancingTeamId
      ? mode === "player"
        ? "Marque quem avança."
        : "Marque quem avançou."
      : null;
  const saveDraft = (nextValues: Draft) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (!canEdit) {
      return;
    }

    const nextBothEmpty =
      nextValues.homeScore === "" && nextValues.awayScore === "";
    const nextBothFilled =
      nextValues.homeScore !== "" && nextValues.awayScore !== "";
    const nextIsDraw =
      nextBothFilled && nextValues.homeScore === nextValues.awayScore;

    if (!nextBothEmpty && !nextBothFilled) {
      return;
    }

    if (nextIsDraw && !nextValues.advancingTeamId) {
      return;
    }

    const saveVersion = ++saveVersionRef.current;

    saveTimerRef.current = window.setTimeout(() => {
      startTransition(async () => {
        setStatus("saving");
        setServerMessage(null);

        const payload =
          mode === "player"
            ? {
                matchId: match.id,
                predictedHomeTeamId: match.homeParticipant.teamId,
                predictedAwayTeamId: match.awayParticipant.teamId,
                homeScore:
                  nextValues.homeScore === ""
                    ? null
                    : Number(nextValues.homeScore),
                awayScore:
                  nextValues.awayScore === ""
                    ? null
                    : Number(nextValues.awayScore),
                predictedAdvancingTeamId: nextValues.advancingTeamId,
              }
            : {
                matchId: match.id,
                homeScore:
                  nextValues.homeScore === ""
                    ? null
                    : Number(nextValues.homeScore),
                awayScore:
                  nextValues.awayScore === ""
                    ? null
                    : Number(nextValues.awayScore),
                advancingTeamId: nextValues.advancingTeamId,
              };

        try {
          const response = await fetch(
            mode === "player"
              ? routes.api.knockoutPredictions
              : routes.api.knockoutResults,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );

          const result = (await response.json()) as SaveResponse;

          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          if (!response.ok) {
            setStatus("error");
            setServerMessage(result.error ?? "Não foi possível salvar agora.");
            return;
          }

          setStatus(result.action === "deleted" ? "deleted" : "saved");
          setServerMessage(
            result.action === "deleted"
              ? mode === "player"
                ? "Palpite removido."
                : "Resultado removido."
              : mode === "player"
              ? "Palpite salvo."
              : "Resultado salvo."
          );
          router.refresh();
        } catch {
          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          setStatus("error");
          setServerMessage("Não foi possível salvar agora.");
        }
      });
    }, 300);
  };

  const handleScoreChange = (
    field: "homeScore" | "awayScore",
    rawValue: string
  ) => {
    const sanitizedValue = rawValue.replace(/\D/g, "").slice(0, 2);
    const nextValues = {
      ...values,
      [field]: sanitizedValue,
    };
    const nextBothFilled =
      nextValues.homeScore !== "" && nextValues.awayScore !== "";

    if (nextBothFilled && nextValues.homeScore !== nextValues.awayScore) {
      nextValues.advancingTeamId =
        Number(nextValues.homeScore) > Number(nextValues.awayScore)
          ? match.homeParticipant.teamId
          : match.awayParticipant.teamId;
    }

    if (!nextBothFilled) {
      nextValues.advancingTeamId = null;
    }

    setValues(nextValues);
    setStatus("idle");
    setServerMessage(null);
    saveDraft(nextValues);
  };

  const selectAdvancingTeam = (teamId: string | null) => {
    const nextValues = {
      ...values,
      advancingTeamId: teamId,
    };

    setValues(nextValues);
    setStatus("idle");
    setServerMessage(null);
    saveDraft(nextValues);
  };

  const headerIcon = useMemo(() => {
    if (validationMessage) {
      return {
        icon: <AlertCircle className="size-3.5 text-destructive" />,
        message: validationMessage,
      };
    }

    if (status === "saving") {
      return {
        icon: (
          <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
        ),
        message: "Salvando...",
      };
    }

    if (status === "saved" || status === "deleted") {
      return {
        icon: <Check className="size-3.5 text-primary" />,
        message: serverMessage,
      };
    }

    if (status === "error") {
      return {
        icon: <AlertCircle className="size-3.5 text-destructive" />,
        message: serverMessage,
      };
    }

    if (mode === "player" && isLocked) {
      return {
        icon: <LockKeyhole className="size-3.5 text-muted-foreground" />,
        message: "Mata-mata travado.",
      };
    }

    return null;
  }, [isLocked, mode, serverMessage, status, validationMessage]);

  return (
    <Card
      className={cn(
        "nodrag nopan relative z-10 overflow-visible rounded-sm focus-within:z-30 hover:z-20",
        compact ? "w-full" : "w-full"
      )}
      onPointerDownCapture={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onClickCapture={(event) => event.stopPropagation()}
    >
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground">
            {match.bracketCode} <span className="text-muted-foreground">•</span>{" "}
            <span className="text-muted-foreground">
              {formatKickoff(match.scheduledAt)}
            </span>
          </p>
          <div className="relative flex items-center gap-1.5">
            {match.officialResult ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                oficial
              </span>
            ) : null}
            {headerIcon ? (
              <>
                <div
                  tabIndex={0}
                  className="peer flex size-4 items-center justify-center"
                >
                  {headerIcon.icon}
                </div>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs whitespace-nowrap text-card-foreground opacity-0 transition-opacity peer-hover:opacity-100 peer-focus:opacity-100 peer-focus-visible:opacity-100">
                  {headerIcon.message}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2 px-3 py-3">
        {[
          {
            side: "home" as const,
            participant: match.homeParticipant,
            value: values.homeScore,
          },
          {
            side: "away" as const,
            participant: match.awayParticipant,
            value: values.awayScore,
          },
        ].map((entry) => {
          const isSelectedAdvancer =
            Boolean(entry.participant.teamId) &&
            values.advancingTeamId === entry.participant.teamId;

          return (
            <div
              key={`${match.id}-${entry.side}`}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-border px-2.5 py-2",
                isSelectedAdvancer && "border-primary/45 bg-primary/6"
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <TeamFlag
                  code={entry.participant.flagCode}
                  className="shrink-0"
                />
                <p className="truncate text-[13px] font-medium text-foreground">
                  {entry.participant.name}
                </p>
              </div>

              <div className="flex items-center justify-end gap-1.5">
                {showScores && isDraw && entry.participant.teamId ? (
                  <Button
                    type="button"
                    variant={isSelectedAdvancer ? "default" : "outline"}
                    size="icon-xs"
                    disabled={!canEdit || isPending}
                    onClick={() =>
                      selectAdvancingTeam(entry.participant.teamId)
                    }
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      selectAdvancingTeam(entry.participant.teamId);
                    }}
                    onMouseDownCapture={(event) => event.stopPropagation()}
                    onMouseUp={(event) => {
                      event.stopPropagation();
                      selectAdvancingTeam(entry.participant.teamId);
                    }}
                    onClickCapture={(event) => event.stopPropagation()}
                    className="nodrag nopan h-7 w-7 rounded-sm"
                  >
                    <Trophy className="size-3" />
                  </Button>
                ) : null}

                {showScores ? (
                  <Input
                    inputMode="numeric"
                    maxLength={2}
                    value={entry.value}
                    disabled={!canEdit || isPending}
                    className="nodrag nopan h-8 w-10 rounded-sm px-0 text-center text-sm font-semibold"
                    onPointerDownCapture={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      handleScoreChange(
                        entry.side === "home" ? "homeScore" : "awayScore",
                        event.target.value
                      )
                    }
                  />
                ) : (
                  <span className="inline-flex h-8 min-w-10 items-center justify-center rounded-sm border border-border bg-muted px-2 text-[11px] font-semibold text-muted-foreground">
                    ?
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
