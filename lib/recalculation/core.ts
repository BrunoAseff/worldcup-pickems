import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupStandings,
  groupTeams,
  groupTiebreakOverrides,
  groups,
  matchPredictions,
  matches,
  officialResults,
  recalculationRuns,
  teams,
  userScoreSnapshots,
  users,
} from "@/lib/db/schema";
import {
  buildApplicationRecalculationSnapshot,
} from "./core-logic";

export const APPLICATION_RECALCULATION_PIPELINE_KEY = "application_core";

export class ApplicationRecalculationConflictError extends Error {
  constructor(public readonly groupCodes: string[]) {
    super("Há grupos com empate pendente de decisão manual.");
  }
}

export const recalculateApplicationCore = async (triggeredByUserId: string) => {
  const [
    groupRecords,
    groupTeamRecords,
    teamRecords,
    userRecords,
    matchRecords,
    officialResultRecords,
    predictionRecords,
    tiebreakOverrideRecords,
  ] = await Promise.all([
    db.select().from(groups),
    db.select().from(groupTeams),
    db
      .select({
        id: teams.id,
        code: teams.code,
        namePt: teams.namePt,
        flagCode: teams.flagCode,
      })
      .from(teams),
    db.select({ id: users.id, role: users.role }).from(users).where(eq(users.role, "player")),
    db
      .select({
        id: matches.id,
        matchNumber: matches.matchNumber,
        bracketCode: matches.bracketCode,
        stage: matches.stage,
        groupId: matches.groupId,
        scheduledAt: matches.scheduledAt,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeSourceType: matches.homeSourceType,
        homeSourceRef: matches.homeSourceRef,
        awaySourceType: matches.awaySourceType,
        awaySourceRef: matches.awaySourceRef,
      })
      .from(matches),
    db.select().from(officialResults),
    db
      .select({
        id: matchPredictions.id,
        userId: matchPredictions.userId,
        matchId: matchPredictions.matchId,
        predictedHomeTeamId: matchPredictions.predictedHomeTeamId,
        predictedAwayTeamId: matchPredictions.predictedAwayTeamId,
        predictedHomeScore: matchPredictions.predictedHomeScore,
        predictedAwayScore: matchPredictions.predictedAwayScore,
        predictedAdvancingTeamId: matchPredictions.predictedAdvancingTeamId,
      })
      .from(matchPredictions),
    db.select().from(groupTiebreakOverrides),
  ]);

  const snapshot = buildApplicationRecalculationSnapshot({
    groupRecords,
    groupTeamRecords,
    teamRecords,
    playerRecords: userRecords,
    matchRecords,
    officialResultRecords,
    predictionRecords,
    tiebreakOverrideRecords,
  });

  if (snapshot.unresolvedGroupCodes.length > 0) {
    throw new ApplicationRecalculationConflictError(snapshot.unresolvedGroupCodes);
  }

  const knockoutMatches = matchRecords.filter((match) => match.stage !== "group_stage");

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(recalculationRuns)
      .values({
        pipelineKey: APPLICATION_RECALCULATION_PIPELINE_KEY,
        triggeredByUserId,
      })
      .returning({
        id: recalculationRuns.id,
        createdAt: recalculationRuns.createdAt,
      });

    for (const standing of snapshot.flatStandings) {
      await tx
        .insert(groupStandings)
        .values({
          groupId: standing.groupId,
          teamId: standing.teamId,
          position: standing.position,
          points: standing.points,
          played: standing.played,
          wins: standing.wins,
          draws: standing.draws,
          losses: standing.losses,
          goalsFor: standing.goalsFor,
          goalsAgainst: standing.goalsAgainst,
          goalDifference: standing.goalDifference,
          recentResults: standing.recentResults,
          qualificationStatus: standing.qualificationStatus,
          recalculationRunId: run.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [groupStandings.groupId, groupStandings.teamId],
          set: {
            position: standing.position,
            points: standing.points,
            played: standing.played,
            wins: standing.wins,
            draws: standing.draws,
            losses: standing.losses,
            goalsFor: standing.goalsFor,
            goalsAgainst: standing.goalsAgainst,
            goalDifference: standing.goalDifference,
            recentResults: standing.recentResults,
            qualificationStatus: standing.qualificationStatus,
            recalculationRunId: run.id,
            updatedAt: new Date(),
          },
        });
    }

    for (const match of knockoutMatches) {
      const participants = snapshot.officialParticipantsByKnockoutMatchId.get(match.id) ?? {
        homeTeamId: null,
        awayTeamId: null,
      };

      await tx
        .update(matches)
        .set({
          homeTeamId: participants.homeTeamId,
          awayTeamId: participants.awayTeamId,
          updatedAt: new Date(),
        })
        .where(eq(matches.id, match.id));
    }

    if (snapshot.invalidPredictionIds.size > 0) {
      await tx
        .delete(matchPredictions)
        .where(inArray(matchPredictions.id, [...snapshot.invalidPredictionIds]));
    }

    for (const score of snapshot.rankedUserScores) {
      await tx
        .insert(userScoreSnapshots)
        .values({
          userId: score.userId,
          totalPoints: score.totalPoints,
          rankPosition: score.rankPosition,
          recalculationRunId: run.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userScoreSnapshots.userId,
          set: {
            totalPoints: score.totalPoints,
            rankPosition: score.rankPosition,
            recalculationRunId: run.id,
            updatedAt: new Date(),
          },
        });
    }

    return run.createdAt.toISOString();
  });
};
