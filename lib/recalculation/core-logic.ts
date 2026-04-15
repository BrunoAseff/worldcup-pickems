import { computeGroupStandings } from "@/lib/group-stage/standings";
import { findRoundOf32BestThirdPlaceAllocation } from "@/lib/knockout/annex-c";
import { getBestThirdSlotKey, getBestThirdStatus } from "@/lib/knockout/best-third";
import {
  resolveAdvancingTeam,
  scoreGroupStageMatch,
  scoreKnockoutMatch,
} from "@/lib/recalculation/scoring";
export {
  resolveAdvancingTeam,
  scoreGroupStageMatch,
  scoreKnockoutMatch,
} from "@/lib/recalculation/scoring";
export { compareBestThird } from "@/lib/knockout/best-third";

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

export type BestThirdSlotOverrideRecord = {
  slotKey: string;
  teamId: string;
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
  requiresManualBestThirdSelection: boolean;
  flatStandings: GroupStandingRecord[];
  bestThirdQualifiedGroupCodes: string[];
  officialParticipantsByKnockoutMatchId: Map<string, ParticipantPair>;
  invalidPredictionIds: Set<string>;
  rankedUserScores: RankedUserScore[];
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
) => resolveAdvancingTeam(participants, result);

export const buildOfficialKnockoutParticipants = (
  knockoutMatches: MatchRecord[],
  standingByGroupPosition: Map<string, GroupStandingRecord>,
  officialResultByMatchId: Map<string, OfficialResultRecord>,
  bestThirdQualifiedGroupCodes: string[],
  bestThirdSlotAssignments?: Map<string, string>,
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
        const slotKey = getBestThirdSlotKey(oppositeSourceRef);
        const assignedTeamId = bestThirdSlotAssignments?.get(slotKey);

        if (assignedTeamId) {
          return assignedTeamId;
        }

        if (!allocation) {
          return null;
        }

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

  const isDirectSlotSource = (sourceType: MatchRecord["homeSourceType"]) =>
    sourceType === "group_position" || sourceType === "best_third_place";

  const normalizePrediction = (
    match: MatchRecord,
    prediction: MatchPredictionRecord | null,
    participants: ParticipantPair,
  ) => {
    if (!prediction) {
      return null;
    }

    const homeSlotUnresolved =
      isDirectSlotSource(match.homeSourceType) && !participants.homeTeamId;
    const awaySlotUnresolved =
      isDirectSlotSource(match.awaySourceType) && !participants.awayTeamId;

    if (
      (!homeSlotUnresolved &&
        (!participants.homeTeamId ||
          prediction.predictedHomeTeamId !== participants.homeTeamId)) ||
      (!awaySlotUnresolved &&
        (!participants.awayTeamId ||
          prediction.predictedAwayTeamId !== participants.awayTeamId))
    ) {
      return null;
    }

    if (
      participants.homeTeamId &&
      participants.awayTeamId &&
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
      prediction: normalizePrediction(
        match,
        predictionByMatchId.get(match.id) ?? null,
        participants,
      ),
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
  bestThirdSlotOverrideRecords = [],
}: {
  groupRecords: GroupRecord[];
  groupTeamRecords: GroupTeamRecord[];
  teamRecords: TeamRecord[];
  playerRecords: PlayerRecord[];
  matchRecords: MatchRecord[];
  officialResultRecords: OfficialResultRecord[];
  predictionRecords: MatchPredictionRecord[];
  tiebreakOverrideRecords: GroupTiebreakOverrideRecord[];
  bestThirdSlotOverrideRecords?: BestThirdSlotOverrideRecord[];
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
  const bestThirdSlotAssignments = new Map(
    bestThirdSlotOverrideRecords.map((override) => [override.slotKey, override.teamId]),
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

  const completedGroupIds = new Set(
    groupRecords
      .filter((group) => isGroupComplete(groupStageMatches, officialResultByMatchId, group.id))
      .map((group) => group.id),
  );
  const completedGroupCount = completedGroupIds.size;
  const allGroupsComplete = completedGroupCount === groupRecords.length;
  const standingByGroupPosition = new Map(
    (allGroupsComplete ? flatStandings : [])
      .filter((standing) => completedGroupIds.has(standing.groupId))
      .map((standing) => ["".concat(standing.groupCode, String(standing.position)), standing]),
  );
  const bestThirdStatus =
    allGroupsComplete
      ? getBestThirdStatus(flatStandings)
      : {
          resolved: false,
          qualifiedGroupCodes: [] as string[],
          thirdPlaced: [] as GroupStandingRecord[],
          hasBoundaryTie: false,
        };
  const requiredBestThirdSlotKeys = knockoutMatches
    .flatMap((match) => {
      const slotKeys: string[] = [];

      if (match.homeSourceType === "best_third_place") {
        slotKeys.push(getBestThirdSlotKey(match.awaySourceRef));
      }

      if (match.awaySourceType === "best_third_place") {
        slotKeys.push(getBestThirdSlotKey(match.homeSourceRef));
      }

      return slotKeys;
    })
    .sort();
  const hasCompleteBestThirdSlotAssignments =
    allGroupsComplete &&
    requiredBestThirdSlotKeys.length > 0 &&
    requiredBestThirdSlotKeys.every((slotKey) => bestThirdSlotAssignments.has(slotKey));
  const requiresManualBestThirdSelection =
    allGroupsComplete &&
    !bestThirdStatus.resolved &&
    bestThirdStatus.hasBoundaryTie &&
    !hasCompleteBestThirdSlotAssignments;
  const bestThirdQualifiedGroupCodes = bestThirdStatus.resolved
    ? bestThirdStatus.qualifiedGroupCodes
    : hasCompleteBestThirdSlotAssignments
      ? requiredBestThirdSlotKeys
          .map((slotKey) => bestThirdSlotAssignments.get(slotKey)!)
          .map((teamId) => teamRecords.find((team) => team.id === teamId))
          .filter((team): team is TeamRecord => Boolean(team))
          .map((team) => {
            const standing = flatStandings.find(
              (entry) => entry.position === 3 && entry.teamId === team.id,
            );

            return standing?.groupCode ?? "";
          })
          .filter(Boolean)
      : [];

  const officialParticipantsByKnockoutMatchId = buildOfficialKnockoutParticipants(
    knockoutMatches,
    standingByGroupPosition,
    officialResultByMatchId,
    bestThirdQualifiedGroupCodes,
    hasCompleteBestThirdSlotAssignments && !bestThirdStatus.resolved
      ? bestThirdSlotAssignments
      : undefined,
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
    requiresManualBestThirdSelection,
    flatStandings,
    bestThirdQualifiedGroupCodes,
    officialParticipantsByKnockoutMatchId,
    invalidPredictionIds,
    rankedUserScores: computeRankingPositions(userScores),
  };
};
