import { describe, expect, it } from "vitest";
import { resolveGroupStagePredictionLock } from "./locks";

describe("resolveGroupStagePredictionLock", () => {
  it("keeps predictions open before the first group-stage kickoff", () => {
    expect(
      resolveGroupStagePredictionLock(
        ["2026-06-11T16:00:00.000Z", "2026-06-12T19:00:00.000Z"],
        new Date("2026-06-11T15:59:00.000Z").getTime(),
      ),
    ).toEqual({
      isLocked: false,
      lockAt: "2026-06-11T16:00:00.000Z",
    });
  });

  it("locks all group-stage predictions once the first kickoff is reached", () => {
    expect(
      resolveGroupStagePredictionLock(
        ["2026-06-11T16:00:00.000Z", "2026-06-12T19:00:00.000Z"],
        new Date("2026-06-11T16:00:00.000Z").getTime(),
      ),
    ).toEqual({
      isLocked: true,
      lockAt: "2026-06-11T16:00:00.000Z",
    });
  });

  it("returns an unlocked state when no group-stage matches exist", () => {
    expect(resolveGroupStagePredictionLock([], Date.now())).toEqual({
      isLocked: false,
      lockAt: null,
    });
  });
});
