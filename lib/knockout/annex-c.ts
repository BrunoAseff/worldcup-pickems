import { readFileSync } from "node:fs";
import { join } from "node:path";

type RoundOf32BestThirdPlaceAllocation = {
  optionCode: number;
  qualifiedThirdPlaceGroups: string[];
  assignments: Record<string, string>;
};

let cachedAllocations: RoundOf32BestThirdPlaceAllocation[] | null = null;

const datasetPath = join(
  process.cwd(),
  "data",
  "round-of-32-best-third-place-allocations.json",
);

export const getRoundOf32BestThirdPlaceAllocations = () => {
  if (cachedAllocations) {
    return cachedAllocations;
  }

  cachedAllocations = JSON.parse(
    readFileSync(datasetPath, "utf-8"),
  ) as RoundOf32BestThirdPlaceAllocation[];

  return cachedAllocations;
};

export const findRoundOf32BestThirdPlaceAllocation = (groupCodes: string[]) => {
  const normalized = [...groupCodes].sort().join("");

  return (
    getRoundOf32BestThirdPlaceAllocations().find(
      (allocation) =>
        [...allocation.qualifiedThirdPlaceGroups].sort().join("") === normalized,
    ) ?? null
  );
};
