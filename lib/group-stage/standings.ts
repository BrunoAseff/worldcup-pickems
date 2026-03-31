type ResultMark = "W" | "D" | "L";

type TeamSeed = {
  id: string;
  code: string;
  namePt: string;
  flagCode: string | null;
};

type OfficialMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  scheduledAt: Date;
};

export type ComputedStanding = {
  teamId: string;
  teamCode: string;
  teamName: string;
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
  recentResults: ResultMark[];
  qualificationStatus: "qualified" | "third_place" | "eliminated";
};

export type GroupTiebreakConflict = {
  teamIds: string[];
};

export type GroupStandingsComputation = {
  standings: ComputedStanding[];
  autoOrderedTeamIds: string[];
  unresolvedConflicts: GroupTiebreakConflict[];
};

type StandingAccumulator = Omit<
  ComputedStanding,
  "position" | "form" | "qualificationStatus"
> & {
  fairPlayScore: number;
  fifaRanking: number | null;
};

type RankTiedTeamsResult = {
  orderedTeamIds: string[];
  unresolvedConflicts: GroupTiebreakConflict[];
};

const createEmptyAccumulator = (team: TeamSeed): StandingAccumulator => ({
  teamId: team.id,
  teamCode: team.code,
  teamName: team.namePt,
  flagCode: team.flagCode,
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  recentResults: [],
  fairPlayScore: 0,
  fifaRanking: null,
});

const applyMatchToStats = (
  statsByTeamId: Map<string, StandingAccumulator>,
  match: OfficialMatch,
) => {
  const home = statsByTeamId.get(match.homeTeamId);
  const away = statsByTeamId.get(match.awayTeamId);

  if (!home || !away) {
    return;
  }

  home.played += 1;
  away.played += 1;
  home.goalsFor += match.homeScore;
  home.goalsAgainst += match.awayScore;
  away.goalsFor += match.awayScore;
  away.goalsAgainst += match.homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (match.homeScore > match.awayScore) {
    home.wins += 1;
    away.losses += 1;
    home.points += 3;
    home.recentResults.push("W");
    away.recentResults.push("L");
    return;
  }

  if (match.homeScore < match.awayScore) {
    away.wins += 1;
    home.losses += 1;
    away.points += 3;
    away.recentResults.push("W");
    home.recentResults.push("L");
    return;
  }

  home.draws += 1;
  away.draws += 1;
  home.points += 1;
  away.points += 1;
  home.recentResults.push("D");
  away.recentResults.push("D");
};

const groupByMetric = <T extends string>(
  teamIds: T[],
  getValue: (teamId: T) => number,
) => {
  const groups = new Map<number, T[]>();

  for (const teamId of teamIds) {
    const value = getValue(teamId);
    const bucket = groups.get(value) ?? [];
    bucket.push(teamId);
    groups.set(value, bucket);
  }

  return [...groups.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, ids]) => ids);
};

const resolveByOverallFallback = (
  teamIds: string[],
  overallStatsByTeamId: Map<string, StandingAccumulator>,
): RankTiedTeamsResult => {
  const buckets = groupByMetric(teamIds, (teamId) => overallStatsByTeamId.get(teamId)!.goalDifference);
  const orderedTeamIds: string[] = [];
  const unresolvedConflicts: GroupTiebreakConflict[] = [];

  for (const goalDifferenceBucket of buckets) {
    const goalsForBuckets = groupByMetric(
      goalDifferenceBucket,
      (teamId) => overallStatsByTeamId.get(teamId)!.goalsFor,
    );

    for (const goalsForBucket of goalsForBuckets) {
      if (goalsForBucket.length === 1) {
        orderedTeamIds.push(goalsForBucket[0]!);
        continue;
      }

      const stableOrder = [...goalsForBucket].sort((leftId, rightId) =>
        overallStatsByTeamId.get(leftId)!.teamName.localeCompare(
          overallStatsByTeamId.get(rightId)!.teamName,
        ),
      );

      unresolvedConflicts.push({
        teamIds: stableOrder,
      });
      orderedTeamIds.push(...stableOrder);
    }
  }

  return {
    orderedTeamIds,
    unresolvedConflicts,
  };
};

const rankTiedTeams = (
  tiedTeamIds: string[],
  overallStatsByTeamId: Map<string, StandingAccumulator>,
  matches: OfficialMatch[],
): RankTiedTeamsResult => {
  const miniStatsByTeamId = new Map(
    tiedTeamIds.map((teamId) => {
      const overall = overallStatsByTeamId.get(teamId)!;
      return [
        teamId,
        {
          ...createEmptyAccumulator({
            id: overall.teamId,
            code: overall.teamCode,
            namePt: overall.teamName,
            flagCode: overall.flagCode,
          }),
          fairPlayScore: overall.fairPlayScore,
          fifaRanking: overall.fifaRanking,
        },
      ];
    }),
  );

  for (const match of matches) {
    if (!tiedTeamIds.includes(match.homeTeamId) || !tiedTeamIds.includes(match.awayTeamId)) {
      continue;
    }

    applyMatchToStats(miniStatsByTeamId, match);
  }

  const orderedTeamIds: string[] = [];
  const unresolvedConflicts: GroupTiebreakConflict[] = [];
  const byHeadToHeadPoints = groupByMetric(
    tiedTeamIds,
    (teamId) => miniStatsByTeamId.get(teamId)!.points,
  );

  for (const pointsBucket of byHeadToHeadPoints) {
    if (pointsBucket.length === 1) {
      orderedTeamIds.push(pointsBucket[0]!);
      continue;
    }

    const byHeadToHeadGoalDifference = groupByMetric(
      pointsBucket,
      (teamId) => miniStatsByTeamId.get(teamId)!.goalDifference,
    );

    for (const goalDifferenceBucket of byHeadToHeadGoalDifference) {
      if (goalDifferenceBucket.length === 1) {
        orderedTeamIds.push(goalDifferenceBucket[0]!);
        continue;
      }

      const byHeadToHeadGoalsFor = groupByMetric(
        goalDifferenceBucket,
        (teamId) => miniStatsByTeamId.get(teamId)!.goalsFor,
      );

      for (const goalsForBucket of byHeadToHeadGoalsFor) {
        if (goalsForBucket.length === 1) {
          orderedTeamIds.push(goalsForBucket[0]!);
          continue;
        }

        const fallback = resolveByOverallFallback(goalsForBucket, overallStatsByTeamId);
        orderedTeamIds.push(...fallback.orderedTeamIds);
        unresolvedConflicts.push(...fallback.unresolvedConflicts);
      }
    }
  }

  return {
    orderedTeamIds,
    unresolvedConflicts,
  };
};

const isValidOverrideOrder = (teamIds: string[], overrideOrder: string[] | null | undefined) => {
  if (!overrideOrder || overrideOrder.length !== teamIds.length) {
    return false;
  }

  const left = [...teamIds].sort();
  const right = [...overrideOrder].sort();
  return left.every((teamId, index) => teamId === right[index]);
};

export const computeGroupStandings = (
  teams: TeamSeed[],
  matches: OfficialMatch[],
  overrideOrder?: string[] | null,
): GroupStandingsComputation => {
  const sortedMatches = [...matches].sort(
    (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
  );
  const statsByTeamId = new Map(teams.map((team) => [team.id, createEmptyAccumulator(team)]));

  for (const match of sortedMatches) {
    applyMatchToStats(statsByTeamId, match);
  }

  const teamIds = teams.map((team) => team.id);
  const pointsBuckets = groupByMetric(teamIds, (teamId) => statsByTeamId.get(teamId)!.points);
  const autoOrderedTeamIds: string[] = [];
  const unresolvedConflicts: GroupTiebreakConflict[] = [];

  for (const bucket of pointsBuckets) {
    if (bucket.length === 1) {
      autoOrderedTeamIds.push(bucket[0]!);
      continue;
    }

    const rankedBucket = rankTiedTeams(bucket, statsByTeamId, sortedMatches);
    autoOrderedTeamIds.push(...rankedBucket.orderedTeamIds);
    unresolvedConflicts.push(...rankedBucket.unresolvedConflicts);
  }

  const finalOrderedTeamIds =
    unresolvedConflicts.length > 0 && isValidOverrideOrder(teamIds, overrideOrder)
      ? overrideOrder!
      : autoOrderedTeamIds;

  return {
    standings: finalOrderedTeamIds.map((teamId, index) => {
      const stats = statsByTeamId.get(teamId)!;

      return {
        teamId: stats.teamId,
        teamCode: stats.teamCode,
        teamName: stats.teamName,
        flagCode: stats.flagCode,
        position: index + 1,
        points: stats.points,
        played: stats.played,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        goalDifference: stats.goalDifference,
        form: stats.recentResults.slice(-5).join(""),
        recentResults: stats.recentResults.slice(-5),
        qualificationStatus:
          index < 2 ? "qualified" : index === 2 ? "third_place" : "eliminated",
      };
    }),
    autoOrderedTeamIds,
    unresolvedConflicts,
  };
};
