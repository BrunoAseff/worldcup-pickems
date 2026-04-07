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

export const groupStagePoints = {
  exact: 10,
  winner: 5,
} as const;

export const groupStandingsPoints = {
  exactOrder: 30,
  qualifiedTeams: 15,
} as const;

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
    return groupStagePoints.exact;
  }

  const predictedOutcome = Math.sign(
    prediction.predictedHomeScore - prediction.predictedAwayScore,
  );
  const officialOutcome = Math.sign(official.homeScore - official.awayScore);

  return predictedOutcome === officialOutcome ? groupStagePoints.winner : 0;
};

export const knockoutStagePoints = {
  round_of_32: { winner: 10, exact: 20 },
  round_of_16: { winner: 15, exact: 30 },
  quarterfinal: { winner: 20, exact: 40 },
  semifinal: { winner: 25, exact: 50 },
  third_place: { winner: 25, exact: 50 },
  final: { winner: 50, exact: 100 },
} as const;

export const resolveAdvancingTeam = (
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

export const scoringRuleSections = [
  {
    title: "Partidas da fase de grupos",
    items: [
      `Placar exato: ${groupStagePoints.exact} pontos.`,
      `Mesmo vencedor ou empate: ${groupStagePoints.winner} pontos.`,
    ],
  },
  {
    title: "Classificação dos grupos",
    items: [
      `Ordem completa das quatro seleções: ${groupStandingsPoints.exactOrder} pontos.`,
      `Duas seleções classificadas corretas, em qualquer ordem: ${groupStandingsPoints.qualifiedTeams} pontos.`,
    ],
  },
  {
    title: "Mata-mata",
    items: [
      `16-avos: ${knockoutStagePoints.round_of_32.exact} no placar exato ou ${knockoutStagePoints.round_of_32.winner} ao acertar quem avança.`,
      `Oitavas: ${knockoutStagePoints.round_of_16.exact} no placar exato ou ${knockoutStagePoints.round_of_16.winner} ao acertar quem avança.`,
      `Quartas: ${knockoutStagePoints.quarterfinal.exact} no placar exato ou ${knockoutStagePoints.quarterfinal.winner} ao acertar quem avança.`,
      `Semifinais e disputa de 3º lugar: ${knockoutStagePoints.semifinal.exact} no placar exato ou ${knockoutStagePoints.semifinal.winner} ao acertar quem avança.`,
      `Final: ${knockoutStagePoints.final.exact} no placar exato ou ${knockoutStagePoints.final.winner} ao acertar o campeão.`,
    ],
  },
] as const;

export const scoreKnockoutMatch = (
  stage: keyof typeof knockoutStagePoints,
  prediction: ScoringPrediction | null,
  official: ScoringOfficialResult | undefined,
  participants: ScoringParticipants,
) => {
  if (!prediction || !official || !participants.homeTeamId || !participants.awayTeamId) {
    return 0;
  }

  const officialAdvancingTeamId = resolveAdvancingTeam(participants, official);

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
