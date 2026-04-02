import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  matches,
  officialResults,
  userScoreSnapshots,
  users,
} from "@/lib/db/schema";

export type ViewerRankingStatus = {
  totalPoints: number | null;
  rankPosition: number | null;
};

export type RankingEntry = {
  userId: string;
  displayName: string;
  totalPoints: number;
  rankPosition: number;
  medal: "gold" | "silver" | "bronze" | "cesium";
};

export type RankingPageView = {
  entries: RankingEntry[];
  viewerStatus: ViewerRankingStatus;
  showConfetti: boolean;
  finalCompleted: boolean;
};

const getMedal = (rankPosition: number): RankingEntry["medal"] => {
  if (rankPosition === 1) return "gold";

  if (rankPosition === 2) return "silver";

  if (rankPosition === 3) return "bronze";

  return "cesium";
};

export const getViewerRankingStatus = async (
  userId: string,
  role: "player" | "admin"
): Promise<ViewerRankingStatus> => {
  if (role !== "player") {
    return {
      totalPoints: null,
      rankPosition: null,
    };
  }

  const [snapshot] = await db
    .select({
      totalPoints: userScoreSnapshots.totalPoints,
      rankPosition: userScoreSnapshots.rankPosition,
    })
    .from(userScoreSnapshots)
    .where(eq(userScoreSnapshots.userId, userId))
    .limit(1);

  return {
    totalPoints: snapshot?.totalPoints ?? null,
    rankPosition: snapshot?.rankPosition ?? null,
  };
};

export const getRankingPageView = async (
  userId: string,
  role: "player" | "admin"
): Promise<RankingPageView> => {
  const [entries, viewerStatus, finalResult] = await Promise.all([
    db
      .select({
        userId: users.id,
        displayName: users.displayName,
        totalPoints: userScoreSnapshots.totalPoints,
        rankPosition: userScoreSnapshots.rankPosition,
      })
      .from(userScoreSnapshots)
      .innerJoin(users, eq(userScoreSnapshots.userId, users.id))
      .orderBy(
        asc(userScoreSnapshots.rankPosition),
        desc(userScoreSnapshots.totalPoints),
        asc(users.displayName)
      ),
    getViewerRankingStatus(userId, role),
    db
      .select({
        matchId: officialResults.matchId,
      })
      .from(officialResults)
      .innerJoin(matches, eq(officialResults.matchId, matches.id))
      .where(eq(matches.stage, "final"))
      .limit(1),
  ]);

  return {
    entries: entries.map((entry) => ({
      ...entry,
      medal: getMedal(entry.rankPosition),
    })),
    viewerStatus,
    finalCompleted: Boolean(finalResult),
    showConfetti: role === "player" && Boolean(finalResult),
  };
};
