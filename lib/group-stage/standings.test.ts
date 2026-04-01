import { describe, expect, it } from "vitest";
import { computeGroupStandings } from "./standings";

const teams = [
  { id: "a", code: "A", namePt: "Alfa", flagCode: "BR" },
  { id: "b", code: "B", namePt: "Beta", flagCode: "AR" },
  { id: "c", code: "C", namePt: "Gama", flagCode: "CL" },
  { id: "d", code: "D", namePt: "Delta", flagCode: "UY" },
];

describe("computeGroupStandings", () => {
  it("computes points, ordering and qualification status from official results", () => {
    const standings = computeGroupStandings(teams, [
      { homeTeamId: "a", awayTeamId: "b", homeScore: 1, awayScore: 0, scheduledAt: new Date("2026-06-11T10:00:00Z") },
      { homeTeamId: "c", awayTeamId: "d", homeScore: 0, awayScore: 0, scheduledAt: new Date("2026-06-11T13:00:00Z") },
      { homeTeamId: "a", awayTeamId: "c", homeScore: 1, awayScore: 0, scheduledAt: new Date("2026-06-15T10:00:00Z") },
      { homeTeamId: "b", awayTeamId: "d", homeScore: 1, awayScore: 0, scheduledAt: new Date("2026-06-15T13:00:00Z") },
      { homeTeamId: "a", awayTeamId: "d", homeScore: 0, awayScore: 0, scheduledAt: new Date("2026-06-20T10:00:00Z") },
      { homeTeamId: "b", awayTeamId: "c", homeScore: 1, awayScore: 0, scheduledAt: new Date("2026-06-20T13:00:00Z") },
    ]);

    expect(standings.standings.map((entry) => [entry.teamId, entry.position, entry.points, entry.qualificationStatus])).toEqual([
      ["a", 1, 7, "qualified"],
      ["b", 2, 6, "qualified"],
      ["d", 3, 2, "third_place"],
      ["c", 4, 1, "eliminated"],
    ]);
    expect(standings.unresolvedConflicts).toEqual([]);
  });

  it("applies a manual override only when there is an unresolved extreme tie", () => {
    const withoutOverride = computeGroupStandings(teams, []);
    const withOverride = computeGroupStandings(teams, [], ["d", "c", "b", "a"]);

    expect(withoutOverride.unresolvedConflicts).toHaveLength(1);
    expect(withoutOverride.standings.map((entry) => entry.teamId)).toEqual(["a", "b", "d", "c"]);
    expect(withOverride.standings.map((entry) => entry.teamId)).toEqual(["d", "c", "b", "a"]);
    expect(withOverride.standings.map((entry) => entry.position)).toEqual([1, 2, 3, 4]);
  });
});
