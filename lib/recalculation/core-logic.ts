import { computeGroupStandings } from "@/lib/group-stage/standings";
import { findRoundOf32BestThirdPlaceAllocation } from "@/lib/knockout/annex-c";
import {
  scoreGroupStageMatch,
  scoreKnockoutMatch,
} from "@/lib/recalculation/scoring";
export { scoreGroupStageMatch, scoreKnockoutMatch } from "@/lib/recalculation/scoring";

export type TeamRecord = {
  id: string;
  code: string;
  namePt: string;
  flagCode: string | null;
};

export type GroupRecord = {
  id: string;
  code: string;
};

export type GroupTeamRecord = {
  groupId: string;
  teamId: string;
};

export type PlayerRecord = {
  id: string;
};

export type GroupStandingRecord = {
  groupId: string;
  groupCode: string;
  teamId: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  recentResults: string;
  qualificationStatus: "qualified" | "third_place" | "eliminated";
};

export type MatchRecord = {
  id: string;
  matchNumber: number;
  bracketCode: string;
  stage:
    | "group_stage"
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "third_place"
    | "final";
  groupId: string | null;
  scheduledAt: Date;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSourceType:
    | "team"
    | "group_position"
    | "best_third_place"
    | "match_winner"
    | "match_loser";
  homeSourceRef: string;
  awaySourceType:
    | "team"
    | "group_position"
    | "best_third_place"
    | "match_winner"
    | "match_loser";
  awaySourceRef: string;
};

export type OfficialResultRecord = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: string | null;
};

export type MatchPredictionRecord = {
  id: string;
  userId: string;
  matchId: string;
  predictedHomeTeamId: string | null;
  predictedAwayTeamId: string | null;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedAdvancingTeamId: string | null;
};

export type GroupTiebreakOverrideRecord = {
  groupId: string;
  orderedTeamIds: string;
};

export type ParticipantPair = {
  homeTeamId: string | null;
  awayTeamId: string | null;
};

export type RankedUserScore = {
  userId: string;
  totalPoints: number;
  rankPosition: number;
};

export type ApplicationRecalculationSnapshot = {
  unresolvedGroupCodes: string[];
  flatStandings: GroupStandingRecord[];
  bestThirdQualifiedGroupCodes: string[];
  officialParticipantsByKnockoutMatchId: Map<string, ParticipantPair>;
  invalidPredictionIds: Set<string>;
  rankedUserScores: RankedUserScore[];
};

export const compareBestThird = (left: GroupStandingRecord, right: GroupStandingRecord) => {
  if (right.points !== left.points) {
    return right.points - left.points;
  }

  if (right.goalDifference !== left.goalDifference) {
    return right.goalDifference - left.goalDifference;
  }

  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor;
  }

  return left.groupCode.localeCompare(right.groupCode);
};

export const isGroupComplete = (
  matchRecords: MatchRecord[],
  officialResultByMatchId: Map<string, OfficialResultRecord>,
  groupId: string,
) => {
  const groupMatches = matchRecords.filter((match) => match.groupId === groupId);

  return groupMatches.length > 0 && groupMatches.every((match) => officialResultByMatchId.has(match.id));
};

export const getOfficialAdvancingTeamId = (
  participants: ParticipantPair,
  result: OfficialResultRecord | undefined,
) => {
  if (!result || !participants.homeTeamId || !participants.awayTeamId) {
    return null;
  }

  if (result.homeScore > result.awayScore) {
    return participants.homeTeamId;
  }

  if (result.awayScore > result.homeScore) {
    return participants.awayTeamId;
  }

  return result.advancingTeamId;
};

export const buildOfficialKnockoutParticipants = (
  knockoutMatches: MatchRecord[],
  standingByGroupPosition: Map<string, GroupStandingRecord>,
  officialResultByMatchId: Map<string, OfficialResultRecord>,
  bestThirdQualifiedGroupCodes: string[],
) => {
  const allocation =
    bestThirdQualifiedGroupCodes.length === 8
      ? findRoundOf32BestThirdPlaceAllocation(bestThirdQualifiedGroupCodes)
      : null;
  const matchByBracketCode = new Map(knockoutMatches.map((match) => [match.bracketCode, match]));
  const cache = new Map<string, ParticipantPair>();

  const resolve = (match: MatchRecord): ParticipantPair => {
    const cached = cache.get(match.id);

    if (cached) {
      return cached;
    }

    const resolveSource = (
      sourceType: MatchRecord["homeSourceType"],
      sourceRef: string,
      oppositeSourceRef: string,
      directTeamId: string | null,
    ): string | null => {
      if (sourceType === "team") {
        return directTeamId;
      }

      if (sourceType === "group_position") {
        return standingByGroupPosition.get(sourceRef)?.teamId ?? null;
      }

      if (sourceType === "best_third_place") {
        if (!allocation) {
          return null;
        }

        const slotKey = `1${oppositeSourceRef[0]}`;
        const assignedGroupCode = allocation.assignments[slotKey];
        return assignedGroupCode
          ? standingByGroupPosition.get(`${assignedGroupCode}3`)?.teamId ?? null
          : null;
      }

      const referencedMatch = matchByBracketCode.get(sourceRef);

      if (!referencedMatch) {
        return null;
      }

      const referencedParticipants = resolve(referencedMatch);
      const advancingTeamId = getOfficialAdvancingTeamId(
        referencedParticipants,
        officialResultByMatchId.get(referencedMatch.id),
      );

      if (sourceType === "match_winner") {
        return advancingTeamId;
      }

      if (
        !advancingTeamId ||
        !referencedParticipants.homeTeamId ||
        !referencedParticipants.awayTeamId
      ) {
        return null;
      }

      return advancingTeamId === referencedParticipants.homeTeamId
        ? referencedParticipants.awayTeamId
        : referencedParticipants.homeTeamId;
    };

    const participants = {
      homeTeamId: resolveSource(
        match.homeSourceType,
        match.homeSourceRef,
        match.awaySourceRef,
        match.homeTeamId,
      ),
      awayTeamId: resolveSource(
        match.awaySourceType,
        match.awaySourceRef,
        match.homeSourceRef,
        match.awayTeamId,
      ),
    } satisfies ParticipantPair;

    cache.set(match.id, participants);
    return participants;
  };

  return new Map(knockoutMatches.map((match) => [match.id, resolve(match)]));
};

export const buildNormalizedPredictionResolver = (
  knockoutMatches: MatchRecord[],
  officialParticipantsByMatchId: Map<string, ParticipantPair>,
  predictionByMatchId: Map<string, MatchPredictionRecord>,
) => {
  const matchByBracketCode = new Map(knockoutMatches.map((match) => [match.bracketCode, match]));
  const cache = new Map<
    string,
    {
      participants: ParticipantPair;
      prediction: MatchPredictionRecord | null;
    }
  >();

  const normalizePrediction = (
    prediction: MatchPredictionRecord | null,
    participants: ParticipantPair,
  ) => {
    if (!prediction) {
      return null;
    }

    if (
      !participants.homeTeamId ||
      !participants.awayTeamId ||
      prediction.predictedHomeTeamId !== participants.homeTeamId ||
      prediction.predictedAwayTeamId !== participants.awayTeamId
    ) {
      return null;
    }

    if (
      prediction.predictedAdvancingTeamId &&
      prediction.predictedAdvancingTeamId !== participants.homeTeamId &&
      prediction.predictedAdvancingTeamId !== participants.awayTeamId
    ) {
      return {
        ...prediction,
        predictedAdvancingTeamId: null,
      };
    }

    return prediction;
  };

  const resolve = (
    match: MatchRecord,
  ): {
    participants: ParticipantPair;
    prediction: MatchPredictionRecord | null;
  } => {
    const cached = cache.get(match.id);

    if (cached) {
      return cached;
    }

    const officialParticipants = officialParticipantsByMatchId.get(match.id) ?? {
      homeTeamId: null,
      awayTeamId: null,
    };

    const resolveSource = (
      sourceType: MatchRecord["homeSourceType"],
      sourceRef: string,
      officialTeamId: string | null,
    ) => {
      if (
        sourceType === "team" ||
        sourceType === "group_position" ||
        sourceType === "best_third_place"
      ) {
        return officialTeamId;
      }

      const referencedMatch = matchByBracketCode.get(sourceRef);

      if (!referencedMatch) {
        return null;
      }

      const referencedState = resolve(referencedMatch);
      const referencedPrediction = referencedState.prediction;

      if (!referencedPrediction) {
        return null;
      }

      if (sourceType === "match_winner") {
        if (
          referencedPrediction.predictedHomeScore > referencedPrediction.predictedAwayScore
        ) {
          return referencedPrediction.predictedHomeTeamId;
        }

        if (
          referencedPrediction.predictedAwayScore > referencedPrediction.predictedHomeScore
        ) {
          return referencedPrediction.predictedAwayTeamId;
        }

        return referencedPrediction.predictedAdvancingTeamId;
      }

      if (
        !referencedPrediction.predictedAdvancingTeamId ||
        !referencedPrediction.predictedHomeTeamId ||
        !referencedPrediction.predictedAwayTeamId
      ) {
        return null;
      }

      return referencedPrediction.predictedAdvancingTeamId ===
        referencedPrediction.predictedHomeTeamId
        ? referencedPrediction.predictedAwayTeamId
        : referencedPrediction.predictedHomeTeamId;
    };

    const participants = {
      homeTeamId: resolveSource(
        match.homeSourceType,
        match.homeSourceRef,
        officialParticipants.homeTeamId,
      ),
      awayTeamId: resolveSource(
        match.awaySourceType,
        match.awaySourceRef,
        officialParticipants.awayTeamId,
      ),
    } satisfies ParticipantPair;

    const state = {
      participants,
      prediction: normalizePrediction(predictionByMatchId.get(match.id) ?? null, participants),
    };

    cache.set(match.id, state);
    return state;
  };

  return resolve;
};

export const computeRankingPositions = (userScores: Array<{ userId: string; totalPoints: number }>) => {
  const sorted = [...userScores].sort((left, right) => {
    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    return left.userId.localeCompare(right.userId);
  });

  return sorted.reduce<RankedUserScore[]>((accumulator, entry, index) => {
    const previous = accumulator[index - 1];
    const rankPosition =
      previous && previous.totalPoints === entry.totalPoints
        ? previous.rankPosition
        : index + 1;

    accumulator.push({
      userId: entry.userId,
      totalPoints: entry.totalPoints,
      rankPosition,
    });

    return accumulator;
  }, []);
};

export const buildApplicationRecalculationSnapshot = ({
  groupRecords,
  groupTeamRecords,
  teamRecords,
  playerRecords,
  matchRecords,
  officialResultRecords,
  predictionRecords,
  tiebreakOverrideRecords,
}: {
  groupRecords: GroupRecord[];
  groupTeamRecords: GroupTeamRecord[];
  teamRecords: TeamRecord[];
  playerRecords: PlayerRecord[];
  matchRecords: MatchRecord[];
  officialResultRecords: OfficialResultRecord[];
  predictionRecords: MatchPredictionRecord[];
  tiebreakOverrideRecords: GroupTiebreakOverrideRecord[];
}): ApplicationRecalculationSnapshot => {
  const teamById = new Map(teamRecords.map((team) => [team.id, team]));
  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [result.matchId, result]),
  );
  const overrideOrderByGroupId = new Map(
    tiebreakOverrideRecords.map((override) => [
      override.groupId,
      override.orderedTeamIds.split(",").filter(Boolean),
    ]),
  );
  const groupStageMatches = matchRecords.filter((match) => match.stage === "group_stage");
  const knockoutMatches = matchRecords.filter(
    (match): match is MatchRecord & { stage: Exclude<MatchRecord["stage"], "group_stage"> } =>
      match.stage !== "group_stage",
  );
  const computedStandingsByGroupId = new Map<string, ReturnType<typeof computeGroupStandings>>();
  const unresolvedGroupCodes: string[] = [];

  for (const group of groupRecords) {
    const teamsInGroup = groupTeamRecords
      .filter((record) => record.groupId === group.id)
      .map((record) => teamById.get(record.teamId))
      .filter((team): team is TeamRecord => Boolean(team));
    const computed = computeGroupStandings(
      teamsInGroup,
      groupStageMatches
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
      isGroupComplete(groupStageMatches, officialResultByMatchId, group.id) &&
      computed.unresolvedConflicts.length > 0 &&
      !overrideOrderByGroupId.has(group.id)
    ) {
      unresolvedGroupCodes.push(group.code);
    }

    computedStandingsByGroupId.set(group.id, computed);
  }

  const flatStandings = groupRecords.flatMap((group) =>
    (computedStandingsByGroupId.get(group.id)?.standings ?? []).map((standing) => ({
      groupId: group.id,
      groupCode: group.code,
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
    }) satisfies GroupStandingRecord),
  );

  const standingByGroupPosition = new Map(
    flatStandings.map((standing) => [`${standing.groupCode}${standing.position}`, standing]),
  );

  const completedGroupCount = groupRecords.filter((group) =>
    isGroupComplete(groupStageMatches, officialResultByMatchId, group.id),
  ).length;
  const bestThirdQualifiedGroupCodes =
    completedGroupCount === groupRecords.length
      ? flatStandings
          .filter((standing) => standing.position === 3)
          .sort(compareBestThird)
          .slice(0, 8)
          .map((standing) => standing.groupCode)
      : [];

  const officialParticipantsByKnockoutMatchId = buildOfficialKnockoutParticipants(
    knockoutMatches,
    standingByGroupPosition,
    officialResultByMatchId,
    bestThirdQualifiedGroupCodes,
  );

  const predictionsByUserId = new Map<string, MatchPredictionRecord[]>();

  for (const prediction of predictionRecords) {
    const bucket = predictionsByUserId.get(prediction.userId) ?? [];
    bucket.push(prediction);
    predictionsByUserId.set(prediction.userId, bucket);
  }

  const invalidPredictionIds = new Set<string>();
  const userScores = playerRecords.map((user) => {
    const userPredictions = predictionsByUserId.get(user.id) ?? [];
    const predictionByMatchId = new Map(
      userPredictions.map((prediction) => [prediction.matchId, prediction]),
    );
    const resolvePrediction = buildNormalizedPredictionResolver(
      knockoutMatches,
      officialParticipantsByKnockoutMatchId,
      predictionByMatchId,
    );

    for (const match of knockoutMatches) {
      const rawPrediction = predictionByMatchId.get(match.id);
      const normalizedState = resolvePrediction(match);

      if (rawPrediction && !normalizedState.prediction) {
        invalidPredictionIds.add(rawPrediction.id);
      }
    }

    let totalPoints = 0;

    for (const match of groupStageMatches) {
      totalPoints += scoreGroupStageMatch(
        predictionByMatchId.get(match.id),
        officialResultByMatchId.get(match.id),
      );
    }

    for (const group of groupRecords) {
      if (!isGroupComplete(groupStageMatches, officialResultByMatchId, group.id)) {
        continue;
      }

      const groupMatchIds = groupStageMatches
        .filter((match) => match.groupId === group.id)
        .map((match) => match.id);
      const predictedGroupMatches = groupStageMatches
        .filter((match) => groupMatchIds.includes(match.id))
        .map((match) => {
          const prediction = predictionByMatchId.get(match.id);

          if (!prediction || !match.homeTeamId || !match.awayTeamId) {
            return null;
          }

          return {
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            homeScore: prediction.predictedHomeScore,
            awayScore: prediction.predictedAwayScore,
            scheduledAt: match.scheduledAt,
          };
        })
        .filter((match): match is NonNullable<typeof match> => Boolean(match));

      if (predictedGroupMatches.length !== groupMatchIds.length) {
        continue;
      }

      const teamsInGroup = groupTeamRecords
        .filter((record) => record.groupId === group.id)
        .map((record) => teamById.get(record.teamId))
        .filter((team): team is TeamRecord => Boolean(team));

      const predictedStandings = computeGroupStandings(teamsInGroup, predictedGroupMatches).standings;
      const officialStandings = computedStandingsByGroupId.get(group.id)!.standings;
      const predictedOrder = predictedStandings.map((standing) => standing.teamId);
      const officialOrder = officialStandings.map((standing) => standing.teamId);
      const predictedQualified = new Set(predictedOrder.slice(0, 2));
      const officialQualified = new Set(officialOrder.slice(0, 2));
      const sameQualified =
        [...predictedQualified].every((teamId) => officialQualified.has(teamId)) &&
        predictedQualified.size === officialQualified.size;

      if (predictedOrder.every((teamId, index) => teamId === officialOrder[index])) {
        totalPoints += 30;
      } else if (sameQualified) {
        totalPoints += 15;
      }
    }

    for (const match of knockoutMatches) {
      const normalizedState = resolvePrediction(match);

      totalPoints += scoreKnockoutMatch(
        match.stage,
        normalizedState.prediction,
        officialResultByMatchId.get(match.id),
        officialParticipantsByKnockoutMatchId.get(match.id) ?? {
          homeTeamId: null,
          awayTeamId: null,
        },
      );
    }

    return {
      userId: user.id,
      totalPoints,
    };
  });

  return {
    unresolvedGroupCodes,
    flatStandings,
    bestThirdQualifiedGroupCodes,
    officialParticipantsByKnockoutMatchId,
    invalidPredictionIds,
    rankedUserScores: computeRankingPositions(userScores),
  };
};
