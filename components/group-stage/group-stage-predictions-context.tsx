"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { routes } from "@/lib/routes";
import type { GroupStageGroupView } from "@/lib/group-stage/queries";

export type GroupStagePrediction = {
  homeScore: number;
  awayScore: number;
};

export type GroupStagePredictionDraft = {
  homeScore: string;
  awayScore: string;
};

export type GroupStageSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "deleted"
  | "error";

export type GroupStagePredictionEntry = {
  draft: GroupStagePredictionDraft;
  prediction: GroupStagePrediction | null;
  status: GroupStageSaveStatus;
  message: string | null;
};

type SaveResponse = {
  error?: string;
  action?: "created" | "updated" | "deleted" | "noop";
};

type GroupStagePredictionsContextValue = {
  entries: Record<string, GroupStagePredictionEntry>;
  hydrateFromGroups: (groups: GroupStageGroupView[]) => void;
  updateDraft: (matchId: string, draft: GroupStagePredictionDraft) => void;
  queueSave: (matchId: string, draft: GroupStagePredictionDraft) => void;
};

const DEFAULT_SAVE_DELAY_MS = 350;

const GroupStagePredictionsContext =
  createContext<GroupStagePredictionsContextValue | null>(null);

const toDraft = (
  prediction:
    | {
        homeScore: number | null;
        awayScore: number | null;
      }
    | null
    | undefined,
): GroupStagePredictionDraft => ({
  homeScore: prediction?.homeScore?.toString() ?? "",
  awayScore: prediction?.awayScore?.toString() ?? "",
});

const toPrediction = (
  prediction:
    | {
        homeScore: number | null;
        awayScore: number | null;
      }
    | null
    | undefined,
): GroupStagePrediction | null => {
  if (prediction?.homeScore === null || prediction?.awayScore === null) {
    return null;
  }

  if (!prediction) {
    return null;
  }

  return {
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
  };
};

export const createGroupStagePredictionEntry = (
  prediction:
    | {
        homeScore: number | null;
        awayScore: number | null;
      }
    | null
    | undefined,
): GroupStagePredictionEntry => ({
  draft: toDraft(prediction),
  prediction: toPrediction(prediction),
  status: "idle",
  message: null,
});

export function GroupStagePredictionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [entries, setEntries] = useState<Record<string, GroupStagePredictionEntry>>({});
  const saveTimersRef = useRef(new Map<string, number>());
  const saveVersionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const saveTimers = saveTimersRef.current;

    return () => {
      for (const timerId of saveTimers.values()) {
        window.clearTimeout(timerId);
      }

      saveTimers.clear();
    };
  }, []);

  const hydrateFromGroups = (groups: GroupStageGroupView[]) => {
    setEntries((current) => {
      let nextEntries = current;

      for (const group of groups) {
        for (const round of group.rounds) {
          for (const match of round.matches) {
            if (nextEntries[match.id]) {
              continue;
            }

            if (nextEntries === current) {
              nextEntries = { ...current };
            }

            nextEntries[match.id] = createGroupStagePredictionEntry(
              match.prediction,
            );
          }
        }
      }

      return nextEntries;
    });
  };

  const updateDraft = (matchId: string, draft: GroupStagePredictionDraft) => {
    setEntries((current) => {
      const existing = current[matchId] ?? createGroupStagePredictionEntry(null);

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

  const queueSave = (matchId: string, draft: GroupStagePredictionDraft) => {
    const previousTimer = saveTimersRef.current.get(matchId);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    const nextVersion = (saveVersionsRef.current.get(matchId) ?? 0) + 1;
    saveVersionsRef.current.set(matchId, nextVersion);

    const timerId = window.setTimeout(() => {
      saveTimersRef.current.delete(matchId);

      void (async () => {
        setEntries((current) => {
          const existing =
            current[matchId] ?? createGroupStagePredictionEntry(null);

          return {
            ...current,
            [matchId]: {
              ...existing,
              status: "saving",
              message: null,
            },
          };
        });

        try {
          const response = await fetch(routes.api.groupStagePredictions, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              matchId,
              homeScore: draft.homeScore === "" ? null : Number(draft.homeScore),
              awayScore: draft.awayScore === "" ? null : Number(draft.awayScore),
            }),
          });

          const payload = (await response.json()) as SaveResponse;

          if (saveVersionsRef.current.get(matchId) !== nextVersion) {
            return;
          }

          if (!response.ok) {
            setEntries((current) => {
              const existing =
                current[matchId] ?? createGroupStagePredictionEntry(null);

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  status: "error",
                  message: payload.error ?? "Não foi possível salvar agora.",
                },
              };
            });

            return;
          }

          if (payload.action === "deleted") {
            setEntries((current) => {
              const existing =
                current[matchId] ?? createGroupStagePredictionEntry(null);

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  draft: { homeScore: "", awayScore: "" },
                  prediction: null,
                  status: "deleted",
                  message: "Palpite removido.",
                },
              };
            });

            return;
          }

          if (payload.action === "created" || payload.action === "updated") {
            setEntries((current) => {
              const existing =
                current[matchId] ?? createGroupStagePredictionEntry(null);

              return {
                ...current,
                [matchId]: {
                  ...existing,
                  draft,
                  prediction: {
                    homeScore: Number(draft.homeScore),
                    awayScore: Number(draft.awayScore),
                  },
                  status: "saved",
                  message: "Palpite salvo.",
                },
              };
            });

            return;
          }

          setEntries((current) => {
            const existing =
              current[matchId] ?? createGroupStagePredictionEntry(null);

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

          setEntries((current) => {
            const existing =
              current[matchId] ?? createGroupStagePredictionEntry(null);

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
    }, DEFAULT_SAVE_DELAY_MS);

    saveTimersRef.current.set(matchId, timerId);
  };

  const value = useMemo(
    () => ({
      entries,
      hydrateFromGroups,
      updateDraft,
      queueSave,
    }),
    [entries],
  );

  return (
    <GroupStagePredictionsContext.Provider value={value}>
      {children}
    </GroupStagePredictionsContext.Provider>
  );
}

export function useGroupStagePredictions() {
  const context = useContext(GroupStagePredictionsContext);

  if (!context) {
    throw new Error(
      "useGroupStagePredictions must be used within GroupStagePredictionsProvider",
    );
  }

  return context;
}
