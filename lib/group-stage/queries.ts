import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupTiebreakOverrides,
  groupStandings,
  groupTeams,
  groups,
  matchPredictions,
  matches,
  officialResults,
  recalculationRuns,
  teams,
  venues,
} from "@/lib/db/schema";
import { computeGroupStandings } from "./standings";
type RecentResult = "W" | "D" | "L";

export type GroupStandingRow = {
  teamId: string;
  teamName: string;
  teamCode: string;
  flagCode: string | null;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string;
  recentResults: RecentResult[];
  qualificationStatus: "qualified" | "third_place" | "eliminated";
};

export type GroupStageMatchView = {
  id: string;
  matchNumber: number;
  scheduledAt: string;
  venueName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlagCode: string | null;
  awayTeamFlagCode: string | null;
  groupRound: number;
  officialResult: {
    homeScore: number;
    awayScore: number;
  } | null;
  prediction: {
    homeScore: number | null;
    awayScore: number | null;
  } | null;
};

export type GroupStageGroupView = {
  id: string;
  code: string;
  standings: GroupStandingRow[];
  tiebreak: {
    requiresManualDecision: boolean;
    hasOverride: boolean;
    orderedTeamIds: string[] | null;
  };
  rounds: Array<{
    round: number;
    matches: GroupStageMatchView[];
  }>;
  defaultRound: number;
};

export type GroupStageAdminView = {
  groups: GroupStageGroupView[];
  lastRecalculatedAt: string | null;
};

type GroupStageContext = {
  groups: GroupStageGroupView[];
  lastRecalculatedAt: string | null;
};

const splitRecentResults = (value: string): RecentResult[] =>
  value
    .split("")
    .filter((entry): entry is RecentResult => entry === "W" || entry === "D" || entry === "L");

const buildZeroStanding = (team: {
  id: string;
  code: string;
  namePt: string;
  flagCode: string | null;
}): GroupStandingRow => ({
  teamId: team.id,
  teamName: team.namePt,
  teamCode: team.code,
  flagCode: team.flagCode,
  position: 0,
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  form: "",
  recentResults: [],
  qualificationStatus: "eliminated",
});

const isGroupComplete = (
  groupMatchIds: string[],
  officialResultByMatchId: Map<string, { homeScore: number; awayScore: number }>,
) => groupMatchIds.length > 0 && groupMatchIds.every((matchId) => officialResultByMatchId.has(matchId));

const getGroupStageContext = async (userId?: string): Promise<GroupStageContext> => {
  const [
    groupRecords,
    groupTeamRecords,
    teamRecords,
    venueRecords,
    matchRecords,
    predictionRecords,
    officialResultRecords,
    tiebreakOverrideRecords,
    standingRecords,
    [latestRun],
  ] = await Promise.all([
    db.select().from(groups).orderBy(asc(groups.code)),
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
        id: venues.id,
        name: venues.name,
      })
      .from(venues),
    db
      .select({
        id: matches.id,
        matchNumber: matches.matchNumber,
        scheduledAt: matches.scheduledAt,
        groupId: matches.groupId,
        groupRound: matches.groupRound,
        venueId: matches.venueId,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
      })
      .from(matches)
      .where(eq(matches.stage, "group_stage"))
      .orderBy(asc(matches.matchNumber)),
    userId
      ? db
          .select({
            matchId: matchPredictions.matchId,
            homeScore: matchPredictions.predictedHomeScore,
            awayScore: matchPredictions.predictedAwayScore,
          })
          .from(matchPredictions)
          .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
          .where(and(eq(matchPredictions.userId, userId), eq(matches.stage, "group_stage")))
      : Promise.resolve([]),
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
    db.select().from(groupStandings),
    db
      .select({
        createdAt: recalculationRuns.createdAt,
      })
      .from(recalculationRuns)
      .where(eq(recalculationRuns.pipelineKey, "group_stage_standings"))
      .orderBy(desc(recalculationRuns.createdAt))
      .limit(1),
  ]);

  const teamById = new Map(teamRecords.map((team) => [team.id, team]));
  const venueById = new Map(venueRecords.map((venue) => [venue.id, venue]));
  const predictionByMatchId = new Map(
    predictionRecords.map((prediction) => [
      prediction.matchId,
      {
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
      },
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
  const tiebreakOverrideByGroupId = new Map(
    tiebreakOverrideRecords.map((override) => [
      override.groupId,
      override.orderedTeamIds.split(",").filter(Boolean),
    ]),
  );
  const standingsByGroupId = new Map<string, GroupStandingRow[]>();

  for (const standing of standingRecords) {
    const team = teamById.get(standing.teamId);

    if (!team) {
      continue;
    }

    const bucket = standingsByGroupId.get(standing.groupId) ?? [];
    bucket.push({
      teamId: standing.teamId,
      teamName: team.namePt,
      teamCode: team.code,
      flagCode: team.flagCode,
      position: standing.position,
      points: standing.points,
      played: standing.played,
      wins: standing.wins,
      draws: standing.draws,
      losses: standing.losses,
      goalsFor: standing.goalsFor,
      goalsAgainst: standing.goalsAgainst,
      goalDifference: standing.goalDifference,
      form: standing.recentResults,
      recentResults: splitRecentResults(standing.recentResults),
      qualificationStatus: standing.qualificationStatus,
    });
    standingsByGroupId.set(standing.groupId, bucket);
  }

  const groupsView = groupRecords.map((group) => {
    const groupTeamsForGroup = groupTeamRecords
      .filter((record) => record.groupId === group.id)
      .map((record) => teamById.get(record.teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team));

    const rounds = [1, 2, 3].map((round) => ({
      round,
      matches: [] as GroupStageMatchView[],
    }));

    const groupMatches = matchRecords.filter((match) => match.groupId === group.id);

    for (const match of groupMatches) {
      const homeTeam = match.homeTeamId ? teamById.get(match.homeTeamId) : null;
      const awayTeam = match.awayTeamId ? teamById.get(match.awayTeamId) : null;
      const venue = venueById.get(match.venueId);

      if (!homeTeam || !awayTeam || !venue) {
        continue;
      }

      const round = match.groupRound ?? 1;
      const roundBucket = rounds.find((value) => value.round === round);

      if (!roundBucket) {
        continue;
      }

      roundBucket.matches.push({
        id: match.id,
        matchNumber: match.matchNumber,
        scheduledAt: match.scheduledAt.toISOString(),
        venueName: venue.name,
        homeTeamName: homeTeam.namePt,
        awayTeamName: awayTeam.namePt,
        homeTeamFlagCode: homeTeam.flagCode,
        awayTeamFlagCode: awayTeam.flagCode,
        groupRound: round,
        officialResult: officialResultByMatchId.get(match.id) ?? null,
        prediction: predictionByMatchId.get(match.id) ?? null,
      });
    }

    const groupMatchIds = groupMatches.map((match) => match.id);
    const persistedStandings = standingsByGroupId
      .get(group.id)
      ?.sort((left, right) => left.position - right.position);
    const computedStandings = computeGroupStandings(
      groupTeamsForGroup.map((team) => ({
        id: team.id,
        code: team.code,
        namePt: team.namePt,
        flagCode: team.flagCode,
      })),
      groupMatches
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
      tiebreakOverrideByGroupId.get(group.id) ?? null,
    );

    const standings =
      persistedStandings && persistedStandings.length === groupTeamsForGroup.length
        ? persistedStandings
        : groupTeamsForGroup
            .sort((left, right) => left.namePt.localeCompare(right.namePt))
            .map(buildZeroStanding);
    const groupIsComplete = isGroupComplete(groupMatchIds, officialResultByMatchId);

    const startedRounds = rounds
      .filter((round) =>
        round.matches.some((match) => new Date(match.scheduledAt).getTime() <= Date.now()),
      )
      .map((round) => round.round);

    return {
      id: group.id,
      code: group.code,
      standings,
      tiebreak: {
        requiresManualDecision:
          groupIsComplete && computedStandings.unresolvedConflicts.length > 0,
        hasOverride: tiebreakOverrideByGroupId.has(group.id),
        orderedTeamIds: tiebreakOverrideByGroupId.get(group.id) ?? null,
      },
      rounds,
      defaultRound: startedRounds.length > 0 ? Math.max(...startedRounds) : 1,
    };
  });

  return {
    groups: groupsView,
    lastRecalculatedAt: latestRun?.createdAt.toISOString() ?? null,
  };
};

export const getGroupStageView = async (userId: string): Promise<GroupStageGroupView[]> => {
  const context = await getGroupStageContext(userId);
  return context.groups;
};

export const getGroupStageAdminView = async (): Promise<GroupStageAdminView> => {
  const context = await getGroupStageContext();
  return {
    groups: context.groups,
    lastRecalculatedAt: context.lastRecalculatedAt,
  };
};
