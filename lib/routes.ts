export const routes = {
  login: "/login",
  groupStage: "/fase-de-grupos",
  knockout: "/mata-mata",
  ranking: "/ranking",
  api: {
    groupStagePredictions: "/api/group-stage-predictions",
    groupStageResults: "/api/group-stage-results",
    groupStageRecalculations: "/api/group-stage-recalculations",
    groupStageTiebreakOverrides: "/api/group-stage-tiebreak-overrides",
    groupStageBestThirdOverrides: "/api/group-stage-best-third-overrides",
    knockoutPredictions: "/api/knockout-predictions",
    knockoutResults: "/api/knockout-results",
  },
} as const;

export type PrimaryRouteKey = "groupStage" | "knockout" | "ranking";

export const primaryNavItems: Array<{
  key: PrimaryRouteKey;
  href: (typeof routes)[PrimaryRouteKey];
  label: string;
}> = [
  {
    key: "groupStage",
    href: routes.groupStage,
    label: "Fase de Grupos",
  },
  {
    key: "knockout",
    href: routes.knockout,
    label: "Mata-mata",
  },
  {
    key: "ranking",
    href: routes.ranking,
    label: "Ranking",
  },
];
