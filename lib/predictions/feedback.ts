import { scoreGroupStageMatch, scoreKnockoutMatch } from "@/lib/recalculation/scoring";

export type MatchFeedback =
  | {
      kind: "pending";
      label: string;
      points: 0;
    }
  | {
      kind: "exact";
      label: string;
      points: number;
    }
  | {
      kind: "winner";
      label: string;
      points: number;
    }
  | {
      kind: "wrong";
      label: string;
      points: 0;
    };

export const getGroupStageMatchFeedback = ({
  prediction,
  officialResult,
}: {
  prediction: { homeScore: number | null; awayScore: number | null } | null;
  officialResult: { homeScore: number; awayScore: number } | null;
}): MatchFeedback | null => {
  if (!prediction || prediction.homeScore === null || prediction.awayScore === null || !officialResult) {
    return null;
  }

  const points = scoreGroupStageMatch(
    {
      predictedHomeScore: prediction.homeScore,
      predictedAwayScore: prediction.awayScore,
    },
    {
      homeScore: officialResult.homeScore,
      awayScore: officialResult.awayScore,
    },
  );

  if (points === 10) {
    return { kind: "exact", label: "Placar exato", points };
  }

  if (points === 5) {
    return { kind: "winner", label: "Vencedor correto", points };
  }

  return { kind: "wrong", label: "Palpite incorreto", points: 0 };
};

export const getKnockoutMatchFeedback = ({
  stage,
  prediction,
  officialResult,
  participants,
}: {
  stage: "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "third_place" | "final";
  prediction:
    | {
        homeScore: number | null;
        awayScore: number | null;
        predictedAdvancingTeamId: string | null;
        predictedHomeTeamId: string | null;
        predictedAwayTeamId: string | null;
      }
    | null;
  officialResult:
    | {
        homeScore: number;
        awayScore: number;
        advancingTeamId: string | null;
      }
    | null;
  participants: {
    homeTeamId: string | null;
    awayTeamId: string | null;
  };
}): MatchFeedback | null => {
  if (
    !prediction ||
    prediction.homeScore === null ||
    prediction.awayScore === null ||
    !officialResult
  ) {
    return null;
  }

  const points = scoreKnockoutMatch(
    stage,
    {
      predictedHomeTeamId: prediction.predictedHomeTeamId,
      predictedAwayTeamId: prediction.predictedAwayTeamId,
      predictedHomeScore: prediction.homeScore,
      predictedAwayScore: prediction.awayScore,
      predictedAdvancingTeamId: prediction.predictedAdvancingTeamId,
    },
    {
      homeScore: officialResult.homeScore,
      awayScore: officialResult.awayScore,
      advancingTeamId: officialResult.advancingTeamId,
    },
    participants,
  );

  const exact =
    prediction.homeScore === officialResult.homeScore &&
    prediction.awayScore === officialResult.awayScore;

  if (points > 0 && exact) {
    return { kind: "exact", label: "Placar exato", points };
  }

  if (points > 0) {
    return { kind: "winner", label: "Classificado correto", points };
  }

  return { kind: "wrong", label: "Palpite incorreto", points: 0 };
};
