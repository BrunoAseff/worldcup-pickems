import { describe, expect, it } from "vitest";
import {
  buildApplicationRecalculationSnapshot,
  buildNormalizedPredictionResolver,
  buildOfficialKnockoutParticipants,
  compareBestThird,
  computeRankingPositions,
  getOfficialAdvancingTeamId,
  isGroupComplete,
  scoreGroupStageMatch,
  scoreKnockoutMatch,
  type GroupRecord,
  type GroupTeamRecord,
  type MatchPredictionRecord,
  type MatchRecord,
  type OfficialResultRecord,
  type PlayerRecord,
  type TeamRecord,
} from "./core-logic";
import { findRoundOf32BestThirdPlaceAllocation } from "@/lib/knockout/annex-c";

const createTeam = (id: string, namePt = id.toUpperCase()): TeamRecord => ({
  id,
  code: id.toUpperCase(),
  namePt,
  flagCode: null,
});

describe("recalculation core logic", () => {
  it("scores group-stage exact score, winner-only and wrong outcome correctly", () => {
    const official = { matchId: "m1", homeScore: 2, awayScore: 1, advancingTeamId: null };

    expect(
      scoreGroupStageMatch(
        {
          id: "p1",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: null,
        },
        official,
      ),
    ).toBe(10);

    expect(
      scoreGroupStageMatch(
        {
          id: "p2",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 3,
          predictedAwayScore: 0,
          predictedAdvancingTeamId: null,
        },
        official,
      ),
    ).toBe(5);

    expect(
      scoreGroupStageMatch(
        {
          id: "p3",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 0,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: null,
        },
        official,
      ),
    ).toBe(0);
  });

  it("scores knockout matches using exact score and advancing team rules", () => {
    expect(
      scoreKnockoutMatch(
        "quarterfinal",
        {
          id: "p1",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 1,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: "a",
        },
        { matchId: "m1", homeScore: 1, awayScore: 1, advancingTeamId: "a" },
        { homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(40);

    expect(
      scoreKnockoutMatch(
        "quarterfinal",
        {
          id: "p2",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 0,
          predictedAwayScore: 0,
          predictedAdvancingTeamId: "a",
        },
        { matchId: "m1", homeScore: 2, awayScore: 2, advancingTeamId: "a" },
        { homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(20);

    expect(
      scoreKnockoutMatch(
        "final",
        {
          id: "p3",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 3,
          predictedAwayScore: 2,
          predictedAdvancingTeamId: null,
        },
        { matchId: "m1", homeScore: 3, awayScore: 2, advancingTeamId: null },
        { homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(100);
  });

  it("computes ranking positions with shared top-ranking semantics", () => {
    expect(
      computeRankingPositions([
        { userId: "u1", totalPoints: 200 },
        { userId: "u2", totalPoints: 170 },
        { userId: "u3", totalPoints: 170 },
        { userId: "u4", totalPoints: 120 },
      ]),
    ).toEqual([
      { userId: "u1", totalPoints: 200, rankPosition: 1 },
      { userId: "u2", totalPoints: 170, rankPosition: 2 },
      { userId: "u3", totalPoints: 170, rankPosition: 2 },
      { userId: "u4", totalPoints: 120, rankPosition: 4 },
    ]);
  });

  it("resolves official advancing teams and best-third slots through the knockout tree", () => {
    const assignedBestThirdGroup = findRoundOf32BestThirdPlaceAllocation([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
    ])!.assignments["1A"];
    const knockoutMatches: MatchRecord[] = [
      {
        id: "m73",
        matchNumber: 73,
        bracketCode: "M073",
        stage: "round_of_32",
        groupId: null,
        scheduledAt: new Date("2026-06-28T10:00:00Z"),
        homeTeamId: null,
        awayTeamId: null,
        homeSourceType: "group_position",
        homeSourceRef: "A1",
        awaySourceType: "best_third_place",
        awaySourceRef: "ABCD",
      },
      {
        id: "m89",
        matchNumber: 89,
        bracketCode: "M089",
        stage: "round_of_16",
        groupId: null,
        scheduledAt: new Date("2026-07-04T10:00:00Z"),
        homeTeamId: null,
        awayTeamId: null,
        homeSourceType: "match_winner",
        homeSourceRef: "M073",
        awaySourceType: "group_position",
        awaySourceRef: "B2",
      },
      {
        id: "m103",
        matchNumber: 103,
        bracketCode: "M103",
        stage: "third_place",
        groupId: null,
        scheduledAt: new Date("2026-07-18T10:00:00Z"),
        homeTeamId: null,
        awayTeamId: null,
        homeSourceType: "match_loser",
        homeSourceRef: "M101",
        awaySourceType: "match_loser",
        awaySourceRef: "M102",
      },
      {
        id: "m101",
        matchNumber: 101,
        bracketCode: "M101",
        stage: "semifinal",
        groupId: null,
        scheduledAt: new Date("2026-07-14T10:00:00Z"),
        homeTeamId: "BRA",
        awayTeamId: "ARG",
        homeSourceType: "team",
        homeSourceRef: "BRA",
        awaySourceType: "team",
        awaySourceRef: "ARG",
      },
      {
        id: "m102",
        matchNumber: 102,
        bracketCode: "M102",
        stage: "semifinal",
        groupId: null,
        scheduledAt: new Date("2026-07-15T10:00:00Z"),
        homeTeamId: "FRA",
        awayTeamId: "GER",
        homeSourceType: "team",
        homeSourceRef: "FRA",
        awaySourceType: "team",
        awaySourceRef: "GER",
      },
    ];

    const standings = new Map([
      ["A1", { groupId: "ga", groupCode: "A", teamId: "team-a1", position: 1, points: 7, played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 5, goalsAgainst: 1, goalDifference: 4, recentResults: "WWD", qualificationStatus: "qualified" as const }],
      ["B2", { groupId: "gb", groupCode: "B", teamId: "team-b2", position: 2, points: 4, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, recentResults: "DLW", qualificationStatus: "qualified" as const }],
      [`${assignedBestThirdGroup}3`, { groupId: `g${assignedBestThirdGroup.toLowerCase()}`, groupCode: assignedBestThirdGroup, teamId: `team-${assignedBestThirdGroup.toLowerCase()}3`, position: 3, points: 4, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 2, goalDifference: 0, recentResults: "WDL", qualificationStatus: "third_place" as const }],
    ]);
    const officialResults = new Map<string, OfficialResultRecord>([
      ["m73", { matchId: "m73", homeScore: 2, awayScore: 1, advancingTeamId: null }],
      ["m101", { matchId: "m101", homeScore: 1, awayScore: 2, advancingTeamId: null }],
      ["m102", { matchId: "m102", homeScore: 0, awayScore: 0, advancingTeamId: "GER" }],
    ]);

    const participants = buildOfficialKnockoutParticipants(
      knockoutMatches,
      standings,
      officialResults,
      ["A", "B", "C", "D", "E", "F", "G", "H"],
    );

    expect(participants.get("m73")).toEqual({
      homeTeamId: "team-a1",
      awayTeamId: standings.get(`${assignedBestThirdGroup}3`)?.teamId ?? null,
    });
    expect(participants.get("m89")).toEqual({ homeTeamId: "team-a1", awayTeamId: "team-b2" });
    expect(participants.get("m103")).toEqual({ homeTeamId: "BRA", awayTeamId: "FRA" });
  });

  it("invalidates downstream predictions when participant changes upstream", () => {
    const knockoutMatches: MatchRecord[] = [
      {
        id: "m1",
        matchNumber: 73,
        bracketCode: "M073",
        stage: "round_of_32",
        groupId: null,
        scheduledAt: new Date("2026-06-28T10:00:00Z"),
        homeTeamId: "hol",
        awayTeamId: "sco",
        homeSourceType: "team",
        homeSourceRef: "HOL",
        awaySourceType: "team",
        awaySourceRef: "SCO",
      },
      {
        id: "m2",
        matchNumber: 89,
        bracketCode: "M089",
        stage: "round_of_16",
        groupId: null,
        scheduledAt: new Date("2026-07-04T10:00:00Z"),
        homeTeamId: null,
        awayTeamId: "bra",
        homeSourceType: "match_winner",
        homeSourceRef: "M073",
        awaySourceType: "team",
        awaySourceRef: "BRA",
      },
    ];

    const predictionByMatchId = new Map<string, MatchPredictionRecord>([
      [
        "m1",
        {
          id: "p1",
          userId: "u1",
          matchId: "m1",
          predictedHomeTeamId: "hol",
          predictedAwayTeamId: "sco",
          predictedHomeScore: 3,
          predictedAwayScore: 0,
          predictedAdvancingTeamId: null,
        },
      ],
      [
        "m2",
        {
          id: "p2",
          userId: "u1",
          matchId: "m2",
          predictedHomeTeamId: "hol",
          predictedAwayTeamId: "bra",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: null,
        },
      ],
    ]);

    const unchangedResolver = buildNormalizedPredictionResolver(
      knockoutMatches,
      new Map([
        ["m1", { homeTeamId: "hol", awayTeamId: "sco" }],
        ["m2", { homeTeamId: "hol", awayTeamId: "bra" }],
      ]),
      predictionByMatchId,
    );

    expect(unchangedResolver(knockoutMatches[1]!).prediction?.predictedHomeTeamId).toBe("hol");

    const changedResolver = buildNormalizedPredictionResolver(
      knockoutMatches,
      new Map([
        ["m1", { homeTeamId: "ger", awayTeamId: "sco" }],
        ["m2", { homeTeamId: "sco", awayTeamId: "bra" }],
      ]),
      predictionByMatchId,
    );

    expect(changedResolver(knockoutMatches[1]!).prediction).toBeNull();
  });

  it("builds a full-pass snapshot with standings, scores and invalidation", () => {
    const groupRecords: GroupRecord[] = [{ id: "group-a", code: "A" }];
    const teamRecords = [
      createTeam("a", "Alfa"),
      createTeam("b", "Beta"),
      createTeam("c", "Gama"),
      createTeam("d", "Delta"),
      createTeam("hol", "Holanda"),
      createTeam("sco", "Escócia"),
      createTeam("bra", "Brasil"),
    ];
    const groupTeamRecords: GroupTeamRecord[] = [
      { groupId: "group-a", teamId: "a" },
      { groupId: "group-a", teamId: "b" },
      { groupId: "group-a", teamId: "c" },
      { groupId: "group-a", teamId: "d" },
    ];
    const playerRecords: PlayerRecord[] = [{ id: "u1" }, { id: "u2" }];
    const groupMatches: MatchRecord[] = [
      { id: "g1", matchNumber: 1, bracketCode: "G1", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-11T10:00:00Z"), homeTeamId: "a", awayTeamId: "b", homeSourceType: "team", homeSourceRef: "A", awaySourceType: "team", awaySourceRef: "B" },
      { id: "g2", matchNumber: 2, bracketCode: "G2", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-11T13:00:00Z"), homeTeamId: "c", awayTeamId: "d", homeSourceType: "team", homeSourceRef: "C", awaySourceType: "team", awaySourceRef: "D" },
      { id: "g3", matchNumber: 3, bracketCode: "G3", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-15T10:00:00Z"), homeTeamId: "a", awayTeamId: "c", homeSourceType: "team", homeSourceRef: "A", awaySourceType: "team", awaySourceRef: "C" },
      { id: "g4", matchNumber: 4, bracketCode: "G4", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-15T13:00:00Z"), homeTeamId: "b", awayTeamId: "d", homeSourceType: "team", homeSourceRef: "B", awaySourceType: "team", awaySourceRef: "D" },
      { id: "g5", matchNumber: 5, bracketCode: "G5", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-20T10:00:00Z"), homeTeamId: "a", awayTeamId: "d", homeSourceType: "team", homeSourceRef: "A", awaySourceType: "team", awaySourceRef: "D" },
      { id: "g6", matchNumber: 6, bracketCode: "G6", stage: "group_stage", groupId: "group-a", scheduledAt: new Date("2026-06-20T13:00:00Z"), homeTeamId: "b", awayTeamId: "c", homeSourceType: "team", homeSourceRef: "B", awaySourceType: "team", awaySourceRef: "C" },
    ];
    const knockoutMatches: MatchRecord[] = [
      { id: "k1", matchNumber: 73, bracketCode: "M073", stage: "round_of_32", groupId: null, scheduledAt: new Date("2026-06-28T10:00:00Z"), homeTeamId: null, awayTeamId: "sco", homeSourceType: "group_position", homeSourceRef: "A1", awaySourceType: "team", awaySourceRef: "SCO" },
      { id: "k2", matchNumber: 89, bracketCode: "M089", stage: "round_of_16", groupId: null, scheduledAt: new Date("2026-07-04T10:00:00Z"), homeTeamId: null, awayTeamId: "bra", homeSourceType: "match_winner", homeSourceRef: "M073", awaySourceType: "team", awaySourceRef: "BRA" },
    ];
    const officialResultRecords: OfficialResultRecord[] = [
      { matchId: "g1", homeScore: 1, awayScore: 0, advancingTeamId: null },
      { matchId: "g2", homeScore: 0, awayScore: 0, advancingTeamId: null },
      { matchId: "g3", homeScore: 1, awayScore: 0, advancingTeamId: null },
      { matchId: "g4", homeScore: 1, awayScore: 0, advancingTeamId: null },
      { matchId: "g5", homeScore: 0, awayScore: 0, advancingTeamId: null },
      { matchId: "g6", homeScore: 1, awayScore: 0, advancingTeamId: null },
    ];
    const predictionRecords: MatchPredictionRecord[] = [
      { id: "u1-g1", userId: "u1", matchId: "g1", predictedHomeTeamId: "a", predictedAwayTeamId: "b", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u1-g2", userId: "u1", matchId: "g2", predictedHomeTeamId: "c", predictedAwayTeamId: "d", predictedHomeScore: 0, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u1-g3", userId: "u1", matchId: "g3", predictedHomeTeamId: "a", predictedAwayTeamId: "c", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u1-g4", userId: "u1", matchId: "g4", predictedHomeTeamId: "b", predictedAwayTeamId: "d", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u1-g5", userId: "u1", matchId: "g5", predictedHomeTeamId: "a", predictedAwayTeamId: "d", predictedHomeScore: 0, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u1-g6", userId: "u1", matchId: "g6", predictedHomeTeamId: "b", predictedAwayTeamId: "c", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-g1", userId: "u2", matchId: "g1", predictedHomeTeamId: "a", predictedAwayTeamId: "b", predictedHomeScore: 0, predictedAwayScore: 1, predictedAdvancingTeamId: null },
      { id: "u2-g2", userId: "u2", matchId: "g2", predictedHomeTeamId: "c", predictedAwayTeamId: "d", predictedHomeScore: 0, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-g3", userId: "u2", matchId: "g3", predictedHomeTeamId: "a", predictedAwayTeamId: "c", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-g4", userId: "u2", matchId: "g4", predictedHomeTeamId: "b", predictedAwayTeamId: "d", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-g5", userId: "u2", matchId: "g5", predictedHomeTeamId: "a", predictedAwayTeamId: "d", predictedHomeScore: 0, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-g6", userId: "u2", matchId: "g6", predictedHomeTeamId: "b", predictedAwayTeamId: "c", predictedHomeScore: 1, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-k1", userId: "u2", matchId: "k1", predictedHomeTeamId: "hol", predictedAwayTeamId: "sco", predictedHomeScore: 3, predictedAwayScore: 0, predictedAdvancingTeamId: null },
      { id: "u2-k2", userId: "u2", matchId: "k2", predictedHomeTeamId: "hol", predictedAwayTeamId: "bra", predictedHomeScore: 2, predictedAwayScore: 1, predictedAdvancingTeamId: null },
    ];

    const snapshot = buildApplicationRecalculationSnapshot({
      groupRecords,
      groupTeamRecords,
      teamRecords,
      playerRecords,
      matchRecords: [...groupMatches, ...knockoutMatches],
      officialResultRecords,
      predictionRecords,
      tiebreakOverrideRecords: [],
    });

    expect(snapshot.unresolvedGroupCodes).toEqual([]);
    expect(snapshot.flatStandings.map((entry) => [entry.groupCode, entry.teamId, entry.position])).toEqual([
      ["A", "a", 1],
      ["A", "b", 2],
      ["A", "d", 3],
      ["A", "c", 4],
    ]);
    expect(snapshot.bestThirdQualifiedGroupCodes).toEqual(["A"]);
    expect(snapshot.officialParticipantsByKnockoutMatchId.get("k1")).toEqual({
      homeTeamId: "a",
      awayTeamId: "sco",
    });
    expect(snapshot.invalidPredictionIds.has("u2-k2")).toBe(true);
    expect(snapshot.rankedUserScores).toEqual([
      { userId: "u1", totalPoints: 90, rankPosition: 1 },
      { userId: "u2", totalPoints: 65, rankPosition: 2 },
    ]);
  });

  it("handles simple utility rules for completion, best-third ordering and advancing teams", () => {
    const groupMatches: MatchRecord[] = [
      { id: "g1", matchNumber: 1, bracketCode: "G1", stage: "group_stage", groupId: "ga", scheduledAt: new Date("2026-06-11T10:00:00Z"), homeTeamId: "a", awayTeamId: "b", homeSourceType: "team", homeSourceRef: "A", awaySourceType: "team", awaySourceRef: "B" },
    ];
    const officialResults = new Map<string, OfficialResultRecord>([
      ["g1", { matchId: "g1", homeScore: 1, awayScore: 0, advancingTeamId: null }],
    ]);

    expect(isGroupComplete(groupMatches, officialResults, "ga")).toBe(true);
    expect(
      compareBestThird(
        { groupId: "g1", groupCode: "A", teamId: "t1", position: 3, points: 4, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 2, goalsAgainst: 2, goalDifference: 0, recentResults: "WDL", qualificationStatus: "third_place" },
        { groupId: "g2", groupCode: "B", teamId: "t2", position: 3, points: 4, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 1, goalsAgainst: 1, goalDifference: 0, recentResults: "WDL", qualificationStatus: "third_place" },
      ),
    ).toBeLessThan(0);
    expect(
      getOfficialAdvancingTeamId(
        { homeTeamId: "a", awayTeamId: "b" },
        { matchId: "m1", homeScore: 0, awayScore: 0, advancingTeamId: "b" },
      ),
    ).toBe("b");
  });
});
