import { asc, eq } from "drizzle-orm";
import { matches } from "@/lib/db/schema";

export type GroupStagePredictionLockState = {
  isLocked: boolean;
  lockAt: string | null;
};

export const resolveGroupStagePredictionLock = (
  scheduledAtValues: Iterable<Date | string>,
  now = Date.now(),
): GroupStagePredictionLockState => {
  let earliestTimestamp: number | null = null;

  for (const scheduledAtValue of scheduledAtValues) {
    const scheduledAt =
      scheduledAtValue instanceof Date
        ? scheduledAtValue.getTime()
        : new Date(scheduledAtValue).getTime();

    if (Number.isNaN(scheduledAt)) {
      continue;
    }

    if (earliestTimestamp === null || scheduledAt < earliestTimestamp) {
      earliestTimestamp = scheduledAt;
    }
  }

  return {
    isLocked: earliestTimestamp !== null && earliestTimestamp <= now,
    lockAt: earliestTimestamp !== null ? new Date(earliestTimestamp).toISOString() : null,
  };
};

export const getGroupStagePredictionLock = async (
  now = Date.now(),
): Promise<GroupStagePredictionLockState> => {
  const { db } = await import("@/lib/db/client");
  const [firstGroupStageMatch] = await db
    .select({
      scheduledAt: matches.scheduledAt,
    })
    .from(matches)
    .where(eq(matches.stage, "group_stage"))
    .orderBy(asc(matches.scheduledAt))
    .limit(1);

  return resolveGroupStagePredictionLock(
    firstGroupStageMatch ? [firstGroupStageMatch.scheduledAt] : [],
    now,
  );
};
