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
import { groupStagePoints } from "./scoring";
import { findRoundOf32BestThirdPlaceAllocation } from "@/lib/knockout/annex-c";

const createTeam = (id: string, namePt = id.toUpperCase()): TeamRecord => ({
  id,
  code: id.toUpperCase(),
  namePt,
  flagCode: null,
});

describe("recalculation core logic", () => {
  it("scores group-stage exact score, winner-only and wrong outcome correctly", () => {
    const official = { homeScore: 2, awayScore: 1 };

    expect(
      scoreGroupStageMatch(
        {
          predictedHomeScore: 2,
          predictedAwayScore: 1,
        },
        official,
      ),
    ).toBe(groupStagePoints.exact);

    expect(
      scoreGroupStageMatch(
        {
          predictedHomeScore: 3,
          predictedAwayScore: 0,
        },
        official,
      ),
    ).toBe(groupStagePoints.winner);

    expect(
      scoreGroupStageMatch(
        {
          predictedHomeScore: 0,
          predictedAwayScore: 1,
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
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 1,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: "a",
        },
        { homeScore: 1, awayScore: 1, advancingTeamId: "a" },
        { homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(40);

    expect(
      scoreKnockoutMatch(
        "quarterfinal",
        {
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 0,
          predictedAwayScore: 0,
          predictedAdvancingTeamId: "a",
        },
        { homeScore: 2, awayScore: 2, advancingTeamId: "a" },
        { homeTeamId: "h", awayTeamId: "a" },
      ),
    ).toBe(20);

    expect(
      scoreKnockoutMatch(
        "final",
        {
          predictedHomeTeamId: "h",
          predictedAwayTeamId: "a",
          predictedHomeScore: 3,
          predictedAwayScore: 2,
          predictedAdvancingTeamId: null,
        },
        { homeScore: 3, awayScore: 2, advancingTeamId: null },
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

  it("ignores manual best-third assignments before all groups are complete", () => {
    const groupRecords: GroupRecord[] = [
      { id: "ga", code: "A" },
      { id: "gb", code: "B" },
    ];
    const groupTeamRecords: GroupTeamRecord[] = [
      { groupId: "ga", teamId: "a1" },
      { groupId: "ga", teamId: "a2" },
      { groupId: "ga", teamId: "a3" },
      { groupId: "ga", teamId: "a4" },
      { groupId: "gb", teamId: "b1" },
      { groupId: "gb", teamId: "b2" },
      { groupId: "gb", teamId: "b3" },
      { groupId: "gb", teamId: "b4" },
    ];
    const teamRecords = [
      createTeam("a1"),
      createTeam("a2"),
      createTeam("a3"),
      createTeam("a4"),
      createTeam("b1"),
      createTeam("b2"),
      createTeam("b3"),
      createTeam("b4"),
    ];
    const matchRecords: MatchRecord[] = [
      {
        id: "ga-1",
        matchNumber: 1,
        bracketCode: "M001",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-01T10:00:00Z"),
        homeTeamId: "a1",
        awayTeamId: "a2",
        homeSourceType: "team",
        homeSourceRef: "A1",
        awaySourceType: "team",
        awaySourceRef: "A2",
      },
      {
        id: "ga-2",
        matchNumber: 2,
        bracketCode: "M002",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-02T10:00:00Z"),
        homeTeamId: "a3",
        awayTeamId: "a4",
        homeSourceType: "team",
        homeSourceRef: "A3",
        awaySourceType: "team",
        awaySourceRef: "A4",
      },
      {
        id: "ga-3",
        matchNumber: 3,
        bracketCode: "M003",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-03T10:00:00Z"),
        homeTeamId: "a1",
        awayTeamId: "a3",
        homeSourceType: "team",
        homeSourceRef: "A1",
        awaySourceType: "team",
        awaySourceRef: "A3",
      },
      {
        id: "ga-4",
        matchNumber: 4,
        bracketCode: "M004",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-04T10:00:00Z"),
        homeTeamId: "a2",
        awayTeamId: "a4",
        homeSourceType: "team",
        homeSourceRef: "A2",
        awaySourceType: "team",
        awaySourceRef: "A4",
      },
      {
        id: "ga-5",
        matchNumber: 5,
        bracketCode: "M005",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-05T10:00:00Z"),
        homeTeamId: "a1",
        awayTeamId: "a4",
        homeSourceType: "team",
        homeSourceRef: "A1",
        awaySourceType: "team",
        awaySourceRef: "A4",
      },
      {
        id: "ga-6",
        matchNumber: 6,
        bracketCode: "M006",
        stage: "group_stage",
        groupId: "ga",
        scheduledAt: new Date("2026-06-06T10:00:00Z"),
        homeTeamId: "a2",
        awayTeamId: "a3",
        homeSourceType: "team",
        homeSourceRef: "A2",
        awaySourceType: "team",
        awaySourceRef: "A3",
      },
      {
        id: "gb-1",
        matchNumber: 7,
        bracketCode: "M007",
        stage: "group_stage",
        groupId: "gb",
        scheduledAt: new Date("2026-06-01T10:00:00Z"),
        homeTeamId: "b1",
        awayTeamId: "b2",
        homeSourceType: "team",
        homeSourceRef: "B1",
        awaySourceType: "team",
        awaySourceRef: "B2",
      },
      {
        id: "r32-1",
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
        awaySourceRef: "ABCDE",
      },
    ];
    const officialResultRecords: OfficialResultRecord[] = [
      { matchId: "ga-1", homeScore: 1, awayScore: 0, advancingTeamId: null },
      { matchId: "ga-2", homeScore: 0, awayScore: 0, advancingTeamId: null },
      { matchId: "ga-3", homeScore: 2, awayScore: 0, advancingTeamId: null },
      { matchId: "ga-4", homeScore: 1, awayScore: 1, advancingTeamId: null },
      { matchId: "ga-5", homeScore: 3, awayScore: 0, advancingTeamId: null },
      { matchId: "ga-6", homeScore: 1, awayScore: 0, advancingTeamId: null },
    ];

    const snapshot = buildApplicationRecalculationSnapshot({
      groupRecords,
      groupTeamRecords,
      teamRecords,
      playerRecords: [] as PlayerRecord[],
      matchRecords,
      officialResultRecords,
      predictionRecords: [] as MatchPredictionRecord[],
      tiebreakOverrideRecords: [],
      bestThirdSlotOverrideRecords: [{ slotKey: "1A", teamId: "a3" }],
    });

    expect(snapshot.bestThirdQualifiedGroupCodes).toEqual([]);
    expect(snapshot.requiresManualBestThirdSelection).toBe(false);
    expect(snapshot.officialParticipantsByKnockoutMatchId.get("r32-1")).toEqual({
      homeTeamId: null,
      awayTeamId: null,
    });
  });

  it("preserves direct-slot predictions while the official slot is still unresolved", () => {
    const knockoutMatches: MatchRecord[] = [
      {
        id: "m73",
        matchNumber: 73,
        bracketCode: "M073",
        stage: "round_of_32",
        groupId: null,
        scheduledAt: new Date("2026-06-28T10:00:00Z"),
        homeTeamId: null,
        awayTeamId: "bra",
        homeSourceType: "group_position",
        homeSourceRef: "A1",
        awaySourceType: "team",
        awaySourceRef: "BRA",
      },
    ];

    const predictionByMatchId = new Map<string, MatchPredictionRecord>([
      [
        "m73",
        {
          id: "p73",
          userId: "u1",
          matchId: "m73",
          predictedHomeTeamId: "hol",
          predictedAwayTeamId: "bra",
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          predictedAdvancingTeamId: "hol",
        },
      ],
    ]);

    const unresolvedResolver = buildNormalizedPredictionResolver(
      knockoutMatches,
      new Map([["m73", { homeTeamId: null, awayTeamId: "bra" }]]),
      predictionByMatchId,
    );

    expect(unresolvedResolver(knockoutMatches[0]!).prediction).not.toBeNull();
    expect(unresolvedResolver(knockoutMatches[0]!).prediction?.predictedHomeTeamId).toBe("hol");

    const resolvedResolver = buildNormalizedPredictionResolver(
      knockoutMatches,
      new Map([["m73", { homeTeamId: "arg", awayTeamId: "bra" }]]),
      predictionByMatchId,
    );

    expect(resolvedResolver(knockoutMatches[0]!).prediction).toBeNull();
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
    expect(snapshot.bestThirdQualifiedGroupCodes).toEqual([]);
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
        { groupCode: "A", teamId: "t1", position: 3, points: 4, goalDifference: 0, goalsFor: 2 },
        { groupCode: "B", teamId: "t2", position: 3, points: 4, goalDifference: 0, goalsFor: 1 },
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
