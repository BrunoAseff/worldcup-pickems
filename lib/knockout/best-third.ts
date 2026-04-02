export type BestThirdStandingLike = {
  groupCode: string;
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  position: number;
};

export const compareBestThird = (
  left: BestThirdStandingLike,
  right: BestThirdStandingLike,
) => {
  if (right.points !== left.points) {
    return right.points - left.points;
  }

  if (right.goalDifference !== left.goalDifference) {
    return right.goalDifference - left.goalDifference;
  }

  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor;
  }

  return left.groupCode.localeCompare(right.groupCode);
};

export const getBestThirdSlotKey = (oppositeSourceRef: string) => `1${oppositeSourceRef[0]}`;

export const getBestThirdStatus = <T extends BestThirdStandingLike>(standings: T[]) => {
  const thirdPlaced = standings.filter((standing) => standing.position === 3).sort(compareBestThird);

  if (thirdPlaced.length < 8) {
    return {
      resolved: false,
      qualifiedGroupCodes: [] as string[],
      thirdPlaced,
      hasBoundaryTie: false,
    };
  }

  const eighth = thirdPlaced[7];
  const ninth = thirdPlaced[8];
  const hasBoundaryTie =
    Boolean(eighth) &&
    Boolean(ninth) &&
    eighth!.points === ninth!.points &&
    eighth!.goalDifference === ninth!.goalDifference &&
    eighth!.goalsFor === ninth!.goalsFor;

  if (hasBoundaryTie) {
    return {
      resolved: false,
      qualifiedGroupCodes: [] as string[],
      thirdPlaced,
      hasBoundaryTie: true,
    };
  }

  return {
    resolved: true,
    qualifiedGroupCodes: thirdPlaced.slice(0, 8).map((standing) => standing.groupCode),
    thirdPlaced,
    hasBoundaryTie: false,
  };
};
