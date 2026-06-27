import { describe, expect, it } from "vitest";
import { getKnockoutMatchFeedback } from "./feedback";

describe("prediction feedback", () => {
  it("does not show exact knockout points when the opponent is wrong", () => {
    const feedback = getKnockoutMatchFeedback({
      stage: "round_of_16",
      prediction: {
        homeScore: 0,
        awayScore: 3,
        predictedHomeTeamId: "alg",
        predictedAwayTeamId: "arg",
        predictedAdvancingTeamId: null,
      },
      officialResult: {
        homeScore: 0,
        awayScore: 3,
        advancingTeamId: null,
      },
      participants: {
        homeTeamId: "esp",
        awayTeamId: "arg",
      },
    });

    expect(feedback).toEqual({
      kind: "winner",
      label: "Classificado correto",
      points: 15,
    });
  });
});
