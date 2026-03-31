import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupTiebreakOverrides,
  groupStandings,
  groupTeams,
  groups,
  matches,
  officialResults,
  recalculationRuns,
  teams,
} from "@/lib/db/schema";
import { computeGroupStandings } from "./standings";

export const GROUP_STAGE_RECALCULATION_PIPELINE_KEY = "group_stage_standings";

export class GroupStageRecalculationConflictError extends Error {
  constructor(public readonly groupCodes: string[]) {
    super("Há grupos com empate pendente de decisão manual.");
  }
}

const isGroupComplete = (
  matchRecords: Array<{ id: string; groupId: string | null }>,
  officialResultByMatchId: Map<string, { homeScore: number; awayScore: number }>,
  groupId: string,
) => {
  const groupMatches = matchRecords.filter((match) => match.groupId === groupId);

  return (
    groupMatches.length > 0 &&
    groupMatches.every((match) => officialResultByMatchId.has(match.id))
  );
};

export const recalculateGroupStageStandings = async (triggeredByUserId: string) => {
  const [
    groupRecords,
    groupTeamRecords,
    teamRecords,
    matchRecords,
    officialResultRecords,
    tiebreakOverrideRecords,
  ] =
    await Promise.all([
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
      db
        .select({
          id: matches.id,
          groupId: matches.groupId,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          scheduledAt: matches.scheduledAt,
        })
        .from(matches)
        .where(eq(matches.stage, "group_stage")),
      db
        .select({
          matchId: officialResults.matchId,
          homeScore: officialResults.homeScore,
          awayScore: officialResults.awayScore,
        })
        .from(officialResults)
        .innerJoin(matches, eq(officialResults.matchId, matches.id))
        .where(eq(matches.stage, "group_stage")),
      db.select().from(groupTiebreakOverrides),
    ]);

  const teamById = new Map(teamRecords.map((team) => [team.id, team]));
  const overrideOrderByGroupId = new Map(
    tiebreakOverrideRecords.map((override) => [
      override.groupId,
      override.orderedTeamIds.split(",").filter(Boolean),
    ]),
  );
  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [
      result.matchId,
      {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    ]),
  );
  const computedByGroupId = new Map<
    string,
    ReturnType<typeof computeGroupStandings>
  >();
  const unresolvedGroupCodes: string[] = [];

  for (const group of groupRecords) {
    const groupTeamsForGroup = groupTeamRecords
      .filter((record) => record.groupId === group.id)
      .map((record) => teamById.get(record.teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team));

    const computed = computeGroupStandings(
      groupTeamsForGroup.map((team) => ({
        id: team.id,
        code: team.code,
        namePt: team.namePt,
        flagCode: team.flagCode,
      })),
      matchRecords
        .filter((match) => match.groupId === group.id)
        .map((match) => {
          const result = officialResultByMatchId.get(match.id);

          if (!match.homeTeamId || !match.awayTeamId || !result) {
            return null;
          }

          return {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            scheduledAt: match.scheduledAt,
          };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match)),
      overrideOrderByGroupId.get(group.id) ?? null,
    );

    if (
      isGroupComplete(matchRecords, officialResultByMatchId, group.id) &&
      computed.unresolvedConflicts.length > 0 &&
      !overrideOrderByGroupId.has(group.id)
    ) {
      unresolvedGroupCodes.push(group.code);
    }

    computedByGroupId.set(group.id, computed);
  }

  if (unresolvedGroupCodes.length > 0) {
    throw new GroupStageRecalculationConflictError(unresolvedGroupCodes);
  }

  return db.transaction(async (tx) => {
    const [run] = await tx
      .insert(recalculationRuns)
      .values({
        pipelineKey: GROUP_STAGE_RECALCULATION_PIPELINE_KEY,
        triggeredByUserId,
      })
      .returning({
        id: recalculationRuns.id,
        createdAt: recalculationRuns.createdAt,
      });

    for (const group of groupRecords) {
      const standings = computedByGroupId.get(group.id)!.standings;

      for (const standing of standings) {
        await tx
          .insert(groupStandings)
          .values({
            groupId: group.id,
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
            recentResults: standing.recentResults.join(""),
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
              recentResults: standing.recentResults.join(""),
              qualificationStatus: standing.qualificationStatus,
              recalculationRunId: run.id,
              updatedAt: new Date(),
            },
          });
      }
    }

    return run.createdAt.toISOString();
  });
};
