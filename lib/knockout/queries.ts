import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupStandings,
  groups,
  matchPredictions,
  matches,
  officialResults,
  teams,
  venues,
} from "@/lib/db/schema";
import { findRoundOf32BestThirdPlaceAllocation } from "./annex-c";

export type KnockoutParticipantView = {
  teamId: string | null;
  name: string;
  flagCode: string | null;
  resolved: boolean;
};

export type KnockoutMatchView = {
  id: string;
  matchNumber: number;
  bracketCode: string;
  stage:
    | "round_of_32"
    | "round_of_16"
    | "quarterfinal"
    | "semifinal"
    | "third_place"
    | "final";
  stageMatchNumber: number;
  scheduledAt: string;
  venueName: string;
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
  homeParticipant: KnockoutParticipantView;
  awayParticipant: KnockoutParticipantView;
  officialResult: {
    homeScore: number;
    awayScore: number;
    advancingTeamId: string | null;
  } | null;
  prediction: {
    homeScore: number | null;
    awayScore: number | null;
    predictedHomeTeamId: string | null;
    predictedAwayTeamId: string | null;
    predictedAdvancingTeamId: string | null;
  } | null;
  canEditPrediction: boolean;
};

export type KnockoutStageView = {
  stage: KnockoutMatchView["stage"];
  title: string;
  matches: KnockoutMatchView[];
};

export type KnockoutPageView = {
  stages: KnockoutStageView[];
  bestThirdStatus: {
    resolved: boolean;
    qualifiedGroupCodes: string[];
  };
  isLocked: boolean;
};

type TeamRecord = {
  id: string;
  namePt: string;
  flagCode: string | null;
};

type StandingRecord = {
  groupCode: string;
  teamId: string;
  position: number;
  points: number;
  played: number;
  goalsFor: number;
  goalDifference: number;
};

type MatchRecord = {
  id: string;
  matchNumber: number;
  bracketCode: string;
  stage: KnockoutMatchView["stage"];
  stageMatchNumber: number;
  scheduledAt: Date;
  venueName: string;
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

type OfficialResultRecord = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: string | null;
};

type PredictionRecord = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  predictedHomeTeamId: string | null;
  predictedAwayTeamId: string | null;
  predictedAdvancingTeamId: string | null;
};

type ResolvedPredictionState = {
  participants: {
    home: KnockoutParticipantView;
    away: KnockoutParticipantView;
  };
  prediction: PredictionRecord | null;
};

const stageTitleByStage: Record<KnockoutStageView["stage"], string> = {
  round_of_32: "16-avos de final",
  round_of_16: "Oitavas de final",
  quarterfinal: "Quartas de final",
  semifinal: "Semifinais",
  third_place: "Disputa de 3º lugar",
  final: "Final",
};

const stageOrder: KnockoutStageView["stage"][] = [
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "third_place",
  "final",
];

const compareBestThird = (left: StandingRecord, right: StandingRecord) => {
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

const getBestThirdStatus = (standings: StandingRecord[]) => {
  const thirdPlaced = standings.filter((standing) => standing.position === 3).sort(compareBestThird);

  if (thirdPlaced.length < 8) {
    return { resolved: false, qualifiedGroupCodes: [] as string[] };
  }

  const eighth = thirdPlaced[7];
  const ninth = thirdPlaced[8];
  const hasBoundaryTie =
    Boolean(eighth) &&
    Boolean(ninth) &&
    eighth!.points === ninth!.points &&
    eighth!.goalDifference === ninth!.goalDifference &&
    eighth!.goalsFor === ninth!.goalsFor;

  if (hasBoundaryTie) {
    return { resolved: false, qualifiedGroupCodes: [] as string[] };
  }

  return {
    resolved: true,
    qualifiedGroupCodes: thirdPlaced.slice(0, 8).map((standing) => standing.groupCode),
  };
};

const unresolvedParticipant = (name: string): KnockoutParticipantView => ({
  teamId: null,
  name,
  flagCode: null,
  resolved: false,
});

const toParticipant = (
  teamById: Map<string, TeamRecord>,
  teamId: string | null,
  fallbackName: string,
) => {
  if (!teamId) {
    return unresolvedParticipant(fallbackName);
  }

  const team = teamById.get(teamId);

  if (!team) {
    return unresolvedParticipant(fallbackName);
  }

  return {
    teamId: team.id,
    name: team.namePt,
    flagCode: team.flagCode,
    resolved: true,
  } satisfies KnockoutParticipantView;
};

const getFirstKnockoutKickoff = (matchRecords: MatchRecord[]) =>
  matchRecords.reduce<number | null>((current, match) => {
    const timestamp = match.scheduledAt.getTime();

    if (current === null || timestamp < current) {
      return timestamp;
    }

    return current;
  }, null);

const getOfficialAdvancingTeamId = (
  matchId: string,
  participantsByMatchId: Map<string, { home: KnockoutParticipantView; away: KnockoutParticipantView }>,
  officialResultByMatchId: Map<string, OfficialResultRecord>,
) => {
  const result = officialResultByMatchId.get(matchId);
  const participants = participantsByMatchId.get(matchId);

  if (!result || !participants) {
    return null;
  }

  if (result.homeScore > result.awayScore) {
    return participants.home.teamId;
  }

  if (result.awayScore > result.homeScore) {
    return participants.away.teamId;
  }

  return result.advancingTeamId;
};

const buildOfficialResolver = (
  teamById: Map<string, TeamRecord>,
  standingByGroupPosition: Map<string, StandingRecord>,
  matchByBracketCode: Map<string, MatchRecord>,
  officialResultByMatchId: Map<string, OfficialResultRecord>,
  bestThirdStatus: { resolved: boolean; qualifiedGroupCodes: string[] },
) => {
  const allocation = bestThirdStatus.resolved
    ? findRoundOf32BestThirdPlaceAllocation(bestThirdStatus.qualifiedGroupCodes)
    : null;
  const cache = new Map<string, { home: KnockoutParticipantView; away: KnockoutParticipantView }>();

  const resolveMatchParticipants = (match: MatchRecord) => {
    const cached = cache.get(match.id);

    if (cached) {
      return cached;
    }

    const resolveSource = (
      sourceType: MatchRecord["homeSourceType"],
      sourceRef: string,
      oppositeSourceRef: string,
      directTeamId: string | null,
    ): KnockoutParticipantView => {
      if (sourceType === "team") {
        return toParticipant(teamById, directTeamId, sourceRef);
      }

      if (sourceType === "group_position") {
        const standing = standingByGroupPosition.get(sourceRef);
        return toParticipant(teamById, standing?.teamId ?? null, `${sourceRef[1]}º ${sourceRef[0]}`);
      }

      if (sourceType === "best_third_place") {
        if (directTeamId) {
          return toParticipant(teamById, directTeamId, sourceRef);
        }

        if (!allocation) {
          return unresolvedParticipant(`3º ${sourceRef}`);
        }

        const slotKey = `1${oppositeSourceRef[0]}`;
        const assignedGroupCode = allocation.assignments[slotKey];
        const standing = assignedGroupCode
          ? standingByGroupPosition.get(`${assignedGroupCode}3`)
          : null;

        return toParticipant(
          teamById,
          standing?.teamId ?? null,
          assignedGroupCode ? `3º ${assignedGroupCode}` : `3º ${sourceRef}`,
        );
      }

      const referencedMatch = matchByBracketCode.get(sourceRef);

      if (!referencedMatch) {
        return unresolvedParticipant(
          sourceType === "match_winner" ? `Venc. ${sourceRef}` : `Perd. ${sourceRef}`,
        );
      }

      const referencedParticipants = resolveMatchParticipants(referencedMatch);
      const advancingTeamId = getOfficialAdvancingTeamId(
        referencedMatch.id,
        cache,
        officialResultByMatchId,
      );

      if (sourceType === "match_winner") {
        return toParticipant(teamById, advancingTeamId, `Venc. ${sourceRef}`);
      }

      const losingTeamId =
        advancingTeamId &&
        referencedParticipants.home.teamId &&
        referencedParticipants.away.teamId
          ? advancingTeamId === referencedParticipants.home.teamId
            ? referencedParticipants.away.teamId
            : referencedParticipants.home.teamId
          : null;

      return toParticipant(teamById, losingTeamId, `Perd. ${sourceRef}`);
    };

    const resolved = {
      home: resolveSource(
        match.homeSourceType,
        match.homeSourceRef,
        match.awaySourceRef,
        match.homeTeamId,
      ),
      away: resolveSource(
        match.awaySourceType,
        match.awaySourceRef,
        match.homeSourceRef,
        match.awayTeamId,
      ),
    };

    cache.set(match.id, resolved);
    return resolved;
  };

  return resolveMatchParticipants;
};

const buildPredictionResolver = (
  teamById: Map<string, TeamRecord>,
  officialResolver: (match: MatchRecord) => { home: KnockoutParticipantView; away: KnockoutParticipantView },
  matchByBracketCode: Map<string, MatchRecord>,
  predictionByMatchId: Map<string, PredictionRecord>,
) => {
  const cache = new Map<string, ResolvedPredictionState>();

  const normalizePrediction = (
    prediction: PredictionRecord | null,
    participants: { home: KnockoutParticipantView; away: KnockoutParticipantView },
  ): PredictionRecord | null => {
    if (!prediction) {
      return null;
    }

    if (
      !participants.home.teamId ||
      !participants.away.teamId ||
      prediction.predictedHomeTeamId !== participants.home.teamId ||
      prediction.predictedAwayTeamId !== participants.away.teamId
    ) {
      return null;
    }

    if (
      prediction.predictedAdvancingTeamId &&
      prediction.predictedAdvancingTeamId !== participants.home.teamId &&
      prediction.predictedAdvancingTeamId !== participants.away.teamId
    ) {
      return {
        ...prediction,
        predictedAdvancingTeamId: null,
      };
    }

    return prediction;
  };

  const resolvePredictionState = (match: MatchRecord): ResolvedPredictionState => {
    const cached = cache.get(match.id);

    if (cached) {
      return cached;
    }

    const officialParticipants = officialResolver(match);

    const resolveSource = (
      sourceType: MatchRecord["homeSourceType"],
      sourceRef: string,
      officialParticipant: KnockoutParticipantView,
    ): KnockoutParticipantView => {
      if (sourceType === "team" || sourceType === "group_position" || sourceType === "best_third_place") {
        return officialParticipant;
      }

      const referencedMatch = matchByBracketCode.get(sourceRef);

      if (!referencedMatch) {
        return unresolvedParticipant(
          sourceType === "match_winner" ? `Venc. ${sourceRef}` : `Perd. ${sourceRef}`,
        );
      }

      const referencedState = resolvePredictionState(referencedMatch);
      const referencedPrediction = referencedState.prediction;

      if (!referencedPrediction) {
        return unresolvedParticipant(
          sourceType === "match_winner" ? `Venc. ${sourceRef}` : `Perd. ${sourceRef}`,
        );
      }

      if (sourceType === "match_winner") {
        return toParticipant(
          teamById,
          referencedPrediction.predictedAdvancingTeamId,
          `Venc. ${sourceRef}`,
        );
      }

      const losingTeamId =
        referencedPrediction.predictedAdvancingTeamId &&
        referencedPrediction.predictedHomeTeamId &&
        referencedPrediction.predictedAwayTeamId
          ? referencedPrediction.predictedAdvancingTeamId ===
            referencedPrediction.predictedHomeTeamId
            ? referencedPrediction.predictedAwayTeamId
            : referencedPrediction.predictedHomeTeamId
          : null;

      return toParticipant(teamById, losingTeamId, `Perd. ${sourceRef}`);
    };

    const resolved = {
      home: resolveSource(match.homeSourceType, match.homeSourceRef, officialParticipants.home),
      away: resolveSource(match.awaySourceType, match.awaySourceRef, officialParticipants.away),
    };

    const normalizedPrediction = normalizePrediction(
      predictionByMatchId.get(match.id) ?? null,
      resolved,
    );

    const state = {
      participants: resolved,
      prediction: normalizedPrediction,
    } satisfies ResolvedPredictionState;

    cache.set(match.id, state);
    return state;
  };

  return resolvePredictionState;
};

const buildStages = (
  matches: MatchRecord[],
  createView: (match: MatchRecord) => KnockoutMatchView,
) =>
  stageOrder.map((stage) => ({
    stage,
    title: stageTitleByStage[stage],
    matches: matches
      .filter((match) => match.stage === stage)
      .sort((left, right) => left.matchNumber - right.matchNumber)
      .map(createView),
  }));

const getKnockoutContext = async (userId?: string) => {
  const [
    groupRecords,
    teamRecords,
    standingRecords,
    officialResultRecords,
    predictionRecords,
    knockoutMatches,
  ] =
    await Promise.all([
      db.select({ code: groups.code }).from(groups),
      db.select({ id: teams.id, namePt: teams.namePt, flagCode: teams.flagCode }).from(teams),
      db
        .select({
          groupCode: groups.code,
          teamId: groupStandings.teamId,
          position: groupStandings.position,
          points: groupStandings.points,
          played: groupStandings.played,
          goalsFor: groupStandings.goalsFor,
          goalDifference: groupStandings.goalDifference,
        })
        .from(groupStandings)
        .innerJoin(groups, eq(groupStandings.groupId, groups.id)),
      db
        .select({
          matchId: officialResults.matchId,
          homeScore: officialResults.homeScore,
          awayScore: officialResults.awayScore,
          advancingTeamId: officialResults.advancingTeamId,
        })
        .from(officialResults)
        .innerJoin(matches, eq(officialResults.matchId, matches.id))
        .where(ne(matches.stage, "group_stage")),
      userId
        ? db
            .select({
              matchId: matchPredictions.matchId,
              homeScore: matchPredictions.predictedHomeScore,
              awayScore: matchPredictions.predictedAwayScore,
              predictedHomeTeamId: matchPredictions.predictedHomeTeamId,
              predictedAwayTeamId: matchPredictions.predictedAwayTeamId,
              predictedAdvancingTeamId: matchPredictions.predictedAdvancingTeamId,
            })
            .from(matchPredictions)
            .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
            .where(and(eq(matchPredictions.userId, userId), ne(matches.stage, "group_stage")))
        : Promise.resolve([]),
      db
        .select({
          id: matches.id,
          matchNumber: matches.matchNumber,
          bracketCode: matches.bracketCode,
          stage: matches.stage,
          stageMatchNumber: matches.stageMatchNumber,
          scheduledAt: matches.scheduledAt,
          venueName: venues.name,
          homeTeamId: matches.homeTeamId,
          awayTeamId: matches.awayTeamId,
          homeSourceType: matches.homeSourceType,
          homeSourceRef: matches.homeSourceRef,
          awaySourceType: matches.awaySourceType,
          awaySourceRef: matches.awaySourceRef,
        })
        .from(matches)
        .innerJoin(venues, eq(matches.venueId, venues.id))
        .where(ne(matches.stage, "group_stage"))
        .orderBy(asc(matches.matchNumber)),
    ]);

  const typedMatches = knockoutMatches.filter(
    (match): match is MatchRecord =>
      match.stage !== "group_stage",
  ) as MatchRecord[];
  const teamById = new Map(teamRecords.map((team) => [team.id, team]));
  const standingByGroupPosition = new Map(
    standingRecords.map((standing) => [`${standing.groupCode}${standing.position}`, standing]),
  );
  const officialResultByMatchId = new Map(
    officialResultRecords.map((result) => [result.matchId, result]),
  );
  const predictionByMatchId = new Map(
    predictionRecords.map((prediction) => [prediction.matchId, prediction]),
  );
  const matchByBracketCode = new Map(typedMatches.map((match) => [match.bracketCode, match]));
  const standingsByGroupCode = new Map<string, StandingRecord[]>();

  for (const standing of standingRecords) {
    const bucket = standingsByGroupCode.get(standing.groupCode) ?? [];
    bucket.push(standing);
    standingsByGroupCode.set(standing.groupCode, bucket);
  }

  const allGroupsComplete =
    groupRecords.length > 0 &&
    groupRecords.every((group) => {
      const standings = standingsByGroupCode.get(group.code) ?? [];
      return standings.length === 4 && standings.every((standing) => standing.played === 3);
    });
  const bestThirdStatus = allGroupsComplete
    ? getBestThirdStatus(standingRecords)
    : { resolved: false, qualifiedGroupCodes: [] as string[] };
  const officialResolver = buildOfficialResolver(
    teamById,
    standingByGroupPosition,
    matchByBracketCode,
    officialResultByMatchId,
    bestThirdStatus,
  );
  const predictionResolver = buildPredictionResolver(
    teamById,
    officialResolver,
    matchByBracketCode,
    predictionByMatchId,
  );
  const firstKickoff = getFirstKnockoutKickoff(typedMatches);

  return {
    matches: typedMatches,
    officialResolver,
    predictionResolver,
    bestThirdStatus,
    officialResultByMatchId,
    predictionByMatchId,
    isLocked: firstKickoff !== null ? firstKickoff <= Date.now() : false,
  };
};

export const getKnockoutPlayerView = async (userId: string): Promise<KnockoutPageView> => {
  const context = await getKnockoutContext(userId);

  return {
    bestThirdStatus: context.bestThirdStatus,
    isLocked: context.isLocked,
    stages: buildStages(context.matches, (match) => {
      const predictedState = context.predictionResolver(match);
      const predictedParticipants = predictedState.participants;
      const prediction = predictedState.prediction;

      return {
        id: match.id,
        matchNumber: match.matchNumber,
        bracketCode: match.bracketCode,
        stage: match.stage,
        stageMatchNumber: match.stageMatchNumber,
        scheduledAt: match.scheduledAt.toISOString(),
        venueName: match.venueName,
        homeSourceType: match.homeSourceType,
        homeSourceRef: match.homeSourceRef,
        awaySourceType: match.awaySourceType,
        awaySourceRef: match.awaySourceRef,
        homeParticipant: predictedParticipants.home,
        awayParticipant: predictedParticipants.away,
        officialResult: context.officialResultByMatchId.get(match.id) ?? null,
        prediction: prediction
          ? {
              homeScore: prediction.homeScore,
              awayScore: prediction.awayScore,
              predictedHomeTeamId: prediction.predictedHomeTeamId,
              predictedAwayTeamId: prediction.predictedAwayTeamId,
              predictedAdvancingTeamId: prediction.predictedAdvancingTeamId,
            }
          : null,
        canEditPrediction:
          !context.isLocked &&
          predictedParticipants.home.resolved &&
          predictedParticipants.away.resolved,
      } satisfies KnockoutMatchView;
    }),
  };
};

export const getKnockoutAdminView = async (): Promise<KnockoutPageView> => {
  const context = await getKnockoutContext();

  return {
    bestThirdStatus: context.bestThirdStatus,
    isLocked: context.isLocked,
    stages: buildStages(context.matches, (match) => {
      const officialParticipants = context.officialResolver(match);

      return {
        id: match.id,
        matchNumber: match.matchNumber,
        bracketCode: match.bracketCode,
        stage: match.stage,
        stageMatchNumber: match.stageMatchNumber,
        scheduledAt: match.scheduledAt.toISOString(),
        venueName: match.venueName,
        homeSourceType: match.homeSourceType,
        homeSourceRef: match.homeSourceRef,
        awaySourceType: match.awaySourceType,
        awaySourceRef: match.awaySourceRef,
        homeParticipant: officialParticipants.home,
        awayParticipant: officialParticipants.away,
        officialResult: context.officialResultByMatchId.get(match.id) ?? null,
        prediction: null,
        canEditPrediction: false,
      } satisfies KnockoutMatchView;
    }),
  };
};
