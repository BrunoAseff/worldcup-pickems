export type ScoringPrediction = {
  predictedHomeTeamId: string | null;
  predictedAwayTeamId: string | null;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedAdvancingTeamId: string | null;
};

export type ScoringOfficialResult = {
  homeScore: number;
  awayScore: number;
  advancingTeamId: string | null;
};

export type ScoringParticipants = {
  homeTeamId: string | null;
  awayTeamId: string | null;
};

export const scoreGroupStageMatch = (
  prediction:
    | Pick<ScoringPrediction, "predictedHomeScore" | "predictedAwayScore">
    | undefined,
  official: Pick<ScoringOfficialResult, "homeScore" | "awayScore"> | undefined,
) => {
  if (!prediction || !official) {
    return 0;
  }

  if (
    prediction.predictedHomeScore === official.homeScore &&
    prediction.predictedAwayScore === official.awayScore
  ) {
    return 10;
  }

  const predictedOutcome = Math.sign(
    prediction.predictedHomeScore - prediction.predictedAwayScore,
  );
  const officialOutcome = Math.sign(official.homeScore - official.awayScore);

  return predictedOutcome === officialOutcome ? 5 : 0;
};

export const knockoutStagePoints = {
  round_of_32: { winner: 10, exact: 20 },
  round_of_16: { winner: 15, exact: 30 },
  quarterfinal: { winner: 20, exact: 40 },
  semifinal: { winner: 25, exact: 50 },
  third_place: { winner: 25, exact: 50 },
  final: { winner: 50, exact: 100 },
} as const;

const getOfficialAdvancingTeamId = (
  participants: ScoringParticipants,
  result: ScoringOfficialResult | undefined,
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

export const scoreKnockoutMatch = (
  stage: keyof typeof knockoutStagePoints,
  prediction: ScoringPrediction | null,
  official: ScoringOfficialResult | undefined,
  participants: ScoringParticipants,
) => {
  if (!prediction || !official || !participants.homeTeamId || !participants.awayTeamId) {
    return 0;
  }

  const officialAdvancingTeamId = getOfficialAdvancingTeamId(participants, official);

  if (!officialAdvancingTeamId) {
    return 0;
  }

  const exactRegularTime =
    prediction.predictedHomeScore === official.homeScore &&
    prediction.predictedAwayScore === official.awayScore;
  const predictedAdvancingTeamId =
    prediction.predictedHomeScore > prediction.predictedAwayScore
      ? prediction.predictedHomeTeamId
      : prediction.predictedAwayScore > prediction.predictedHomeScore
        ? prediction.predictedAwayTeamId
        : prediction.predictedAdvancingTeamId;
  const correctAdvancingTeam = predictedAdvancingTeamId === officialAdvancingTeamId;
  const stagePoints = knockoutStagePoints[stage];

  if (official.homeScore === official.awayScore) {
    if (exactRegularTime && correctAdvancingTeam) {
      return stagePoints.exact;
    }

    return correctAdvancingTeam ? stagePoints.winner : 0;
  }

  if (exactRegularTime) {
    return stagePoints.exact;
  }

  return correctAdvancingTeam ? stagePoints.winner : 0;
};
