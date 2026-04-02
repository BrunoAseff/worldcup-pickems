import { Award, Medal, Radiation, Trophy } from "lucide-react";

export const rankingMedalMeta = {
  gold: {
    label: "Ouro",
    icon: Trophy,
    shellClassName: "ranking-medal-gold-shell",
    iconClassName: "ranking-medal-gold-icon",
    rankClassName: "ranking-medal-gold-rank",
  },
  silver: {
    label: "Prata",
    icon: Medal,
    shellClassName: "ranking-medal-silver-shell",
    iconClassName: "ranking-medal-silver-icon",
    rankClassName: "ranking-medal-silver-rank",
  },
  bronze: {
    label: "Bronze",
    icon: Award,
    shellClassName: "ranking-medal-bronze-shell",
    iconClassName: "ranking-medal-bronze-icon",
    rankClassName: "ranking-medal-bronze-rank",
  },
  cesium: {
    label: "Césio-137",
    icon: Radiation,
    shellClassName: "ranking-medal-cesium-shell",
    iconClassName: "ranking-medal-cesium-icon",
    rankClassName: "ranking-medal-cesium-rank",
  },
} as const;

export const rankingConfettiColorClasses = [
  "ranking-confetti-primary",
  "ranking-confetti-gold",
  "ranking-confetti-dark",
  "ranking-confetti-silver",
  "ranking-confetti-emerald",
] as const;
