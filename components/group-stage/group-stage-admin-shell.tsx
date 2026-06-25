"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminMatchCard } from "@/components/group-stage/admin-match-card";
import { BestThirdSlotOverrideCard } from "@/components/group-stage/best-third-slot-override-card";
import { GroupTiebreakOverrideCard } from "@/components/group-stage/group-tiebreak-override-card";
import { Button } from "@/components/ui/button";
import { formatKickoff } from "@/lib/formatters/kickoff";
import { GroupStageAdminView, GroupStageGroupView } from "@/lib/group-stage/queries";
import { routes } from "@/lib/routes";
import { tabTriggerClass } from "@/lib/utils";
import { StandingsTable } from "./standings-table";

type GroupStageAdminShellProps = {
  groups: GroupStageGroupView[];
  lastRecalculatedAt: string | null;
  bestThirdSelection: GroupStageAdminView["bestThirdSelection"];
};

function GroupCutSummary({ standings }: { standings: GroupStageGroupView["standings"] }) {
  const qualified = standings.slice(0, 2);
  const third = standings[2];
  const eliminated = standings[3];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-sm border border-border bg-primary/10 px-3 py-3">
        <p className="wc-display text-[10px] font-black text-muted-foreground">
          Classificados
        </p>
        <p className="mt-1 truncate text-sm font-black text-foreground">
          {qualified.map((team) => team.teamName).join(" + ")}
        </p>
      </div>
      <div className="rounded-sm border border-border bg-[color:color-mix(in_oklch,var(--wc-gold)_16%,transparent)] px-3 py-3">
        <p className="wc-display text-[10px] font-black text-muted-foreground">
          3º lugar
        </p>
        <p className="mt-1 truncate text-sm font-black text-foreground">
          {third?.teamName ?? "-"}
        </p>
      </div>
      <div className="rounded-sm border border-border bg-[color:color-mix(in_oklch,var(--wc-red)_8%,transparent)] px-3 py-3">
        <p className="wc-display text-[10px] font-black text-muted-foreground">
          Lanterna
        </p>
        <p className="mt-1 truncate text-sm font-black text-foreground">
          {eliminated?.teamName ?? "-"}
        </p>
      </div>
    </div>
  );
}

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

export function GroupStageAdminShell({
  groups,
  lastRecalculatedAt,
  bestThirdSelection,
}: GroupStageAdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selection, setSelection] = useState(() =>
    resolveSelection(groups, searchParams.get("grupo"), searchParams.get("rodada")),
  );
  const selectedGroupCode = selection.groupCode;
  const selectedGroup =
    groups.find((group) => group.code === selectedGroupCode) ?? groups[0];
  const selectedRound = selection.round;
  const [recalculationMessage, setRecalculationMessage] = useState<
    string | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [resultEntries, setResultEntries] = useState<
    Record<
      string,
      {
        draft: { homeScore: string; awayScore: string };
        officialResult: { homeScore: number; awayScore: number } | null;
        status: "idle" | "saving" | "saved" | "deleted" | "error";
        message: string | null;
      }
    >
  >({});
  const saveTimersRef = useRef(new Map<string, number>());
  const saveVersionsRef = useRef(new Map<string, number>());

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

  useEffect(() => {
    const saveTimers = saveTimersRef.current;

    return () => {
      for (const timerId of saveTimers.values()) {
        window.clearTimeout(timerId);
      }

      saveTimers.clear();
    };
  }, []);

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

  const triggerRecalculation = () => {
    startTransition(async () => {
      setRecalculationMessage(null);

      try {
        const response = await fetch(routes.api.groupStageRecalculations, {
          method: "POST",
        });
        const payload = (await response.json()) as {
          error?: string;
          recalculatedAt?: string;
        };

        if (!response.ok) {
          setRecalculationMessage(
            payload.error ?? "Não foi possível recalcular agora."
          );
          return;
        }

        setRecalculationMessage("Classificação recalculada.");
        router.refresh();
      } catch {
        setRecalculationMessage("Não foi possível recalcular agora.");
      }
    });
  };

  const updateResultDraft = (
    matchId: string,
    draft: { homeScore: string; awayScore: string },
  ) => {
    setResultEntries((current) => {
      const existing = current[matchId] ?? {
        draft: { homeScore: "", awayScore: "" },
        officialResult: null,
        status: "idle" as const,
        message: null,
      };

      return {
        ...current,
        [matchId]: {
          ...existing,
          draft,
          status: "idle",
          message: null,
        },
      };
    });
  };

  const queueResultSave = (
    matchId: string,
    draft: { homeScore: string; awayScore: string },
  ) => {
    const previousTimer = saveTimersRef.current.get(matchId);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const nextVersion = (saveVersionsRef.current.get(matchId) ?? 0) + 1;
    saveVersionsRef.current.set(matchId, nextVersion);

    const timerId = window.setTimeout(() => {
      saveTimersRef.current.delete(matchId);

      void (async () => {
        setResultEntries((current) => {
          const existing = current[matchId];

          if (!existing) {
            return current;
          }

          return {
            ...current,
            [matchId]: {
              ...existing,
              status: "saving",
              message: null,
            },
          };
        });

        const payload = {
          matchId,
          homeScore: draft.homeScore === "" ? null : Number(draft.homeScore),
          awayScore: draft.awayScore === "" ? null : Number(draft.awayScore),
        };

        try {
          const response = await fetch(routes.api.groupStageResults, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const result = (await response.json()) as {
            error?: string;
            action?: "created" | "updated" | "deleted" | "noop";
          };

          if (saveVersionsRef.current.get(matchId) !== nextVersion) {
            return;
          }

          if (!response.ok) {
            setResultEntries((current) => {
              const existing = current[matchId];

              if (!existing) {
                return current;
              }

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  status: "error",
                  message: result.error ?? "Não foi possível salvar agora.",
                },
              };
            });
            return;
          }

          if (result.action === "deleted") {
            setResultEntries((current) => {
              const existing = current[matchId];

              if (!existing) {
                return current;
              }

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  draft: { homeScore: "", awayScore: "" },
                  officialResult: null,
                  status: "deleted",
                  message: "Resultado removido.",
                },
              };
            });
            return;
          }

          if (result.action === "created" || result.action === "updated") {
            setResultEntries((current) => {
              const existing = current[matchId];

              if (!existing) {
                return current;
              }

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  draft,
                  officialResult: {
                    homeScore: Number(draft.homeScore),
                    awayScore: Number(draft.awayScore),
                  },
                  status: "saved",
                  message: "Resultado salvo.",
                },
              };
            });
            return;
          }

          setResultEntries((current) => {
            const existing = current[matchId];

            if (!existing) {
              return current;
            }

            return {
              ...current,
              [matchId]: {
                ...existing,
                status: "idle",
                message: null,
              },
            };
          });
        } catch {
          if (saveVersionsRef.current.get(matchId) !== nextVersion) {
            return;
          }

          setResultEntries((current) => {
            const existing = current[matchId];

            if (!existing) {
              return current;
            }

            return {
              ...current,
              [matchId]: {
                ...existing,
                status: "error",
                message: "Não foi possível salvar agora.",
              },
            };
          });
        }
      })();
    }, 350);

    saveTimersRef.current.set(matchId, timerId);
  };

  return (
    <div className="mx-auto w-full max-w-360 space-y-7 px-5 pb-6 pt-2 md:px-8 md:pt-3 xl:px-10">
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-sm border border-[color:var(--wc-ink)] bg-[color:var(--wc-ink)] px-5 py-5 text-primary-foreground shadow-[3px_3px_0_var(--wc-gold)] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="wc-display text-xs font-black text-[color:var(--wc-gold)]">
            Mesa de controle
          </p>
          <h1 className="mt-1 font-heading text-5xl font-black leading-none sm:text-7xl">
            Fase de grupos
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/78">
            Lance os resultados oficiais e recalcule a classificação quando
            quiser refletir os novos dados nas tabelas.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Button
            type="button"
            onClick={triggerRecalculation}
            disabled={isPending}
            className="h-11 rounded-sm px-4"
          >
            <RefreshCw
              className={isPending ? "size-4 animate-spin" : "size-4"}
            />
            Recalcular classificação
          </Button>
          <p className="wc-display text-xs font-black text-primary-foreground/72">
            {lastRecalculatedAt
              ? `Último recálculo: ${formatKickoff(lastRecalculatedAt)}`
              : "Ainda não houve recálculo manual."}
          </p>
          {recalculationMessage ? (
            <p className="wc-display max-w-md text-xs font-black text-primary-foreground/72">
              {recalculationMessage}
            </p>
          ) : null}
        </div>
      </div>

      {selectedGroup.tiebreak.requiresManualDecision ? (
        <GroupTiebreakOverrideCard
          key={selectedGroup.id}
          groupId={selectedGroup.id}
          groupCode={selectedGroup.code}
          teams={selectedGroup.standings}
          initialOrderedTeamIds={selectedGroup.tiebreak.orderedTeamIds}
          suggestedOrderedTeamIds={selectedGroup.tiebreak.suggestedOrderedTeamIds}
          conflictTeamIds={selectedGroup.tiebreak.conflictTeamIds}
        />
      ) : null}

      {bestThirdSelection.requiresManualDecision ? (
        <BestThirdSlotOverrideCard
          slots={bestThirdSelection.slots}
          options={bestThirdSelection.options}
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
            className={tabTriggerClass(
              selectedGroupCode === group.code,
              "h-11 rounded-sm px-4 text-sm",
            )}
          >
            Grupo {group.code}
          </Button>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,39rem)_minmax(0,46rem)] xl:items-start xl:justify-between">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="wc-display text-xs font-black text-muted-foreground">
                Classificação
              </p>
              <h2 className="mt-1 font-heading text-4xl font-black leading-none text-foreground">
                Grupo {selectedGroup.code}
              </h2>
            </div>
          </div>

          <StandingsTable standings={selectedGroup.standings} />
          <GroupCutSummary standings={selectedGroup.standings} />
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
                className={tabTriggerClass(
                  selectedRound === round.round,
                  "h-11 rounded-sm px-4 text-sm",
                )}
              >
                Rodada {round.round}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {activeRound?.matches.map((match) => {
              const entry = resultEntries[match.id];
              const effectiveResult = entry?.officialResult ?? match.officialResult;
              const draft = entry?.draft ?? {
                homeScore: effectiveResult?.homeScore?.toString() ?? "",
                awayScore: effectiveResult?.awayScore?.toString() ?? "",
              };

              return (
                <AdminMatchCard
                  key={match.id}
                  match={{ ...match, officialResult: effectiveResult }}
                  draft={draft}
                  saveState={{
                    status: entry?.status ?? "idle",
                    message: entry?.message ?? null,
                  }}
                  onDraftChange={(nextDraft) => {
                    updateResultDraft(match.id, nextDraft);
                  }}
                  onSaveRequested={(nextDraft) => {
                    queueResultSave(match.id, nextDraft);
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
