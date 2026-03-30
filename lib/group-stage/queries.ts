import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { groupTeams, groups, matchPredictions, matches, teams, venues } from "@/lib/db/schema";

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
};

export type GroupStageMatchView = {
  id: string;
  matchNumber: number;
  scheduledAt: string;
  isLocked: boolean;
  venueName: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamFlagCode: string | null;
  awayTeamFlagCode: string | null;
  groupRound: number;
  prediction: {
    homeScore: number | null;
    awayScore: number | null;
  } | null;
};

export type GroupStageGroupView = {
  code: string;
  standings: GroupStandingRow[];
  rounds: Array<{
    round: number;
    matches: GroupStageMatchView[];
  }>;
  defaultRound: number;
};

export const getGroupStageView = async (userId: string): Promise<GroupStageGroupView[]> => {
  const [groupRecords, groupTeamRecords, teamRecords, venueRecords, matchRecords, predictionRecords] =
    await Promise.all([
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
      db
        .select({
          matchId: matchPredictions.matchId,
          homeScore: matchPredictions.predictedHomeScore,
          awayScore: matchPredictions.predictedAwayScore,
        })
        .from(matchPredictions)
        .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
        .where(and(eq(matchPredictions.userId, userId), eq(matches.stage, "group_stage"))),
    ]);

  const groupCodeById = new Map(groupRecords.map((group) => [group.id, group.code]));
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

  return groupRecords.map((group) => {
    const standings = groupTeamRecords
      .filter((record) => record.groupId === group.id)
      .map((record) => teamById.get(record.teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team))
      .sort((left, right) => left.namePt.localeCompare(right.namePt))
      .map((team, index) => ({
        teamId: team.id,
        teamName: team.namePt,
        teamCode: team.code,
        flagCode: team.flagCode,
        position: index + 1,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        form: "—",
      }));

    const rounds = [1, 2, 3].map((round) => ({
      round,
      matches: [] as GroupStageMatchView[],
    }));

    for (const match of matchRecords) {
      const groupCode = match.groupId ? groupCodeById.get(match.groupId) : null;

      if (groupCode !== group.code) {
        continue;
      }

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
        isLocked: match.scheduledAt.getTime() <= Date.now(),
        venueName: venue.name,
        homeTeamName: homeTeam.namePt,
        awayTeamName: awayTeam.namePt,
        homeTeamFlagCode: homeTeam.flagCode,
        awayTeamFlagCode: awayTeam.flagCode,
        groupRound: round,
        prediction: predictionByMatchId.get(match.id) ?? null,
      });
    }

    const startedRounds = rounds
      .filter((round) =>
        round.matches.some((match) => new Date(match.scheduledAt).getTime() <= Date.now()),
      )
      .map((round) => round.round);

    return {
      code: group.code,
      standings,
      rounds,
      defaultRound: startedRounds.length > 0 ? Math.max(...startedRounds) : 1,
    };
  });
};
