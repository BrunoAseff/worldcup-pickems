export const routes = {
  login: "/login",
  groupStage: "/fase-de-grupos",
  knockout: "/mata-mata",
  ranking: "/ranking",
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
