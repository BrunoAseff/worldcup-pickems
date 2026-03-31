import { Edge, Node } from "@xyflow/react";
import { KnockoutMatchView, KnockoutPageView } from "./queries";

export const KNOCKOUT_NODE_WIDTH = 224;
export const KNOCKOUT_NODE_HEIGHT = 148;
export const KNOCKOUT_STAGE_LABEL_HEIGHT = 28;

const BASE_Y = 24;
const FIRST_ROUND_GAP = 28;
const THIRD_PLACE_OFFSET = 240;

const leftColumnX = {
  round_of_32: 0,
  round_of_16: 320,
  quarterfinal: 640,
  semifinal: 960,
} as const;

const finalColumnX = 1280;

const rightColumnX = {
  semifinal: 1600,
  quarterfinal: 1920,
  round_of_16: 2240,
  round_of_32: 2560,
} as const;

export type KnockoutFlowNodeData = {
  match: KnockoutMatchView;
  mode: "player" | "admin";
  isLocked: boolean;
};

export type KnockoutStageLabelNodeData = {
  label: string;
};

export type KnockoutFlowNode =
  | Node<KnockoutFlowNodeData, "knockoutMatch">
  | Node<KnockoutStageLabelNodeData, "stageLabel">;
export type KnockoutFlowEdge = Edge;

const getCenterY = (top: number) => top + KNOCKOUT_NODE_HEIGHT / 2;

const pairPositions = (tops: number[]) =>
  Array.from({ length: Math.floor(tops.length / 2) }, (_, index) => {
    const first = tops[index * 2];
    const second = tops[index * 2 + 1];

    return (
      (getCenterY(first) + getCenterY(second)) / 2 - KNOCKOUT_NODE_HEIGHT / 2
    );
  });

const createFirstRoundTops = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => BASE_Y + index * (KNOCKOUT_NODE_HEIGHT + FIRST_ROUND_GAP)
  );

const createNode = (
  match: KnockoutMatchView,
  x: number,
  y: number,
  mode: "player" | "admin",
  isLocked: boolean
): KnockoutFlowNode => ({
  id: match.id,
  type: "knockoutMatch",
  position: { x, y },
  className: "nopan",
  style: {
    width: KNOCKOUT_NODE_WIDTH,
    height: KNOCKOUT_NODE_HEIGHT,
  },
  draggable: false,
  selectable: false,
  focusable: false,
  data: {
    match,
    mode,
    isLocked,
  },
});

const createStageLabelNode = (
  id: string,
  label: string,
  x: number,
  y: number
): Node<KnockoutStageLabelNodeData, "stageLabel"> => ({
  id,
  type: "stageLabel",
  position: { x, y },
  className: "nopan",
  draggable: false,
  selectable: false,
  focusable: false,
  data: { label },
});

const createEdge = (
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string
): KnockoutFlowEdge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: "smoothstep",
  selectable: false,
  style: {
    strokeWidth: 1.5,
  },
});

export const buildKnockoutFlow = (
  view: KnockoutPageView,
  mode: "player" | "admin"
): { nodes: KnockoutFlowNode[]; edges: KnockoutFlowEdge[] } => {
  const allMatches = view.stages.flatMap((stage) => stage.matches);
  const matchByCode = new Map(
    allMatches.map((match) => [match.bracketCode, match])
  );
  const finalMatch =
    view.stages.find((stage) => stage.stage === "final")?.matches[0] ?? null;
  const thirdPlaceMatch =
    view.stages.find((stage) => stage.stage === "third_place")?.matches[0] ??
    null;

  const collectBranchStageMatches = (
    rootCode: string | null | undefined,
    targetStage: KnockoutMatchView["stage"]
  ): KnockoutMatchView[] => {
    if (!rootCode) {
      return [];
    }

    const rootMatch = matchByCode.get(rootCode);

    if (!rootMatch) {
      return [];
    }

    if (rootMatch.stage === targetStage) {
      return [rootMatch];
    }

    return [
      ...(rootMatch.homeSourceType === "match_winner"
        ? collectBranchStageMatches(rootMatch.homeSourceRef, targetStage)
        : []),
      ...(rootMatch.awaySourceType === "match_winner"
        ? collectBranchStageMatches(rootMatch.awaySourceRef, targetStage)
        : []),
    ];
  };

  const leftSemifinalCode =
    finalMatch?.homeSourceType === "match_winner"
      ? finalMatch.homeSourceRef
      : null;
  const rightSemifinalCode =
    finalMatch?.awaySourceType === "match_winner"
      ? finalMatch.awaySourceRef
      : null;

  const leftBranch = {
    semifinal: collectBranchStageMatches(leftSemifinalCode, "semifinal"),
    quarterfinal: collectBranchStageMatches(leftSemifinalCode, "quarterfinal"),
    round_of_16: collectBranchStageMatches(leftSemifinalCode, "round_of_16"),
    round_of_32: collectBranchStageMatches(leftSemifinalCode, "round_of_32"),
  };

  const rightBranch = {
    semifinal: collectBranchStageMatches(rightSemifinalCode, "semifinal"),
    quarterfinal: collectBranchStageMatches(rightSemifinalCode, "quarterfinal"),
    round_of_16: collectBranchStageMatches(rightSemifinalCode, "round_of_16"),
    round_of_32: collectBranchStageMatches(rightSemifinalCode, "round_of_32"),
  };

  const leftRound32Tops = createFirstRoundTops(leftBranch.round_of_32.length);
  const rightRound32Tops = createFirstRoundTops(rightBranch.round_of_32.length);

  const nodes: KnockoutFlowNode[] = [];
  const edges: KnockoutFlowEdge[] = [];
  const topByBracketCode = new Map<string, number>();

  const pushStageNodes = (
    matches: KnockoutMatchView[],
    x: number,
    resolveTop: (match: KnockoutMatchView, index: number) => number | null
  ) => {
    matches.forEach((match, index) => {
      const top = resolveTop(match, index);

      if (top === null) {
        return;
      }

      topByBracketCode.set(match.bracketCode, top);
      nodes.push(createNode(match, x, top, mode, view.isLocked));
    });
  };

  const resolveTopFromSources = (
    match: KnockoutMatchView,
    fallbackTop: number
  ) => {
    const sourceTops = [match.homeSourceRef, match.awaySourceRef]
      .map((sourceRef) => topByBracketCode.get(sourceRef))
      .filter((top): top is number => top !== undefined);

    if (sourceTops.length === 2) {
      return (
        (getCenterY(sourceTops[0]) + getCenterY(sourceTops[1])) / 2 -
        KNOCKOUT_NODE_HEIGHT / 2
      );
    }

    return fallbackTop;
  };

  const leftRound16Fallback = pairPositions(leftRound32Tops);
  const leftQuarterfinalFallback = pairPositions(leftRound16Fallback);
  const leftSemifinalFallback = pairPositions(leftQuarterfinalFallback);
  const rightRound16Fallback = pairPositions(rightRound32Tops);
  const rightQuarterfinalFallback = pairPositions(rightRound16Fallback);
  const rightSemifinalFallback = pairPositions(rightQuarterfinalFallback);

  pushStageNodes(
    leftBranch.round_of_32,
    leftColumnX.round_of_32,
    (_, index) => leftRound32Tops[index] ?? null
  );
  pushStageNodes(
    leftBranch.round_of_16,
    leftColumnX.round_of_16,
    (match, index) =>
      resolveTopFromSources(match, leftRound16Fallback[index] ?? BASE_Y)
  );
  pushStageNodes(
    leftBranch.quarterfinal,
    leftColumnX.quarterfinal,
    (match, index) =>
      resolveTopFromSources(match, leftQuarterfinalFallback[index] ?? BASE_Y)
  );
  pushStageNodes(leftBranch.semifinal, leftColumnX.semifinal, (match, index) =>
    resolveTopFromSources(match, leftSemifinalFallback[index] ?? BASE_Y)
  );

  pushStageNodes(
    rightBranch.semifinal,
    rightColumnX.semifinal,
    (match, index) =>
      resolveTopFromSources(match, rightSemifinalFallback[index] ?? BASE_Y)
  );
  pushStageNodes(
    rightBranch.quarterfinal,
    rightColumnX.quarterfinal,
    (match, index) =>
      resolveTopFromSources(match, rightQuarterfinalFallback[index] ?? BASE_Y)
  );
  pushStageNodes(
    rightBranch.round_of_16,
    rightColumnX.round_of_16,
    (match, index) =>
      resolveTopFromSources(match, rightRound16Fallback[index] ?? BASE_Y)
  );
  pushStageNodes(
    rightBranch.round_of_32,
    rightColumnX.round_of_32,
    (_, index) => rightRound32Tops[index] ?? null
  );

  const leftSemifinalTop = leftBranch.semifinal[0]
    ? topByBracketCode.get(leftBranch.semifinal[0].bracketCode) ?? BASE_Y
    : BASE_Y;
  const rightSemifinalTop = rightBranch.semifinal[0]
    ? topByBracketCode.get(rightBranch.semifinal[0].bracketCode) ?? BASE_Y
    : BASE_Y;
  const finalTop =
    (getCenterY(leftSemifinalTop) + getCenterY(rightSemifinalTop)) / 2 -
    KNOCKOUT_NODE_HEIGHT / 2;
  const thirdPlaceTop = finalTop + KNOCKOUT_NODE_HEIGHT + THIRD_PLACE_OFFSET;

  if (finalMatch) {
    topByBracketCode.set(finalMatch.bracketCode, finalTop);
    nodes.push(
      createNode(finalMatch, finalColumnX, finalTop, mode, view.isLocked)
    );
  }

  if (thirdPlaceMatch) {
    topByBracketCode.set(thirdPlaceMatch.bracketCode, thirdPlaceTop);
    nodes.push(
      createNode(
        thirdPlaceMatch,
        finalColumnX,
        thirdPlaceTop,
        mode,
        view.isLocked
      )
    );
  }

  nodes.push(
    createStageLabelNode(
      "label-round-of-32-left",
      "16-avos de final",
      leftColumnX.round_of_32,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-round-of-16-left",
      "Oitavas de final",
      leftColumnX.round_of_16,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-quarterfinal-left",
      "Quartas de final",
      leftColumnX.quarterfinal,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-semifinal-left",
      "Semifinais",
      leftColumnX.semifinal,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode("label-final", "Final", finalColumnX, finalTop - 52)
  );
  nodes.push(
    createStageLabelNode(
      "label-third-place",
      "Disputa de 3º lugar",
      finalColumnX,
      thirdPlaceTop - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-semifinal-right",
      "Semifinais",
      rightColumnX.semifinal,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-quarterfinal-right",
      "Quartas de final",
      rightColumnX.quarterfinal,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-round-of-16-right",
      "Oitavas de final",
      rightColumnX.round_of_16,
      BASE_Y - 52
    )
  );
  nodes.push(
    createStageLabelNode(
      "label-round-of-32-right",
      "16-avos de final",
      rightColumnX.round_of_32,
      BASE_Y - 52
    )
  );

  const positionedMatches = new Map(
    nodes
      .filter(
        (node): node is Node<KnockoutFlowNodeData, "knockoutMatch"> =>
          node.type === "knockoutMatch"
      )
      .map((node) => [node.id, node])
  );

  const addEdgeFromSource = (
    sourceCode: string,
    target: KnockoutMatchView,
    sourceHandle: "left-source" | "right-source" | "bottom-source",
    targetHandle: "left-target" | "right-target"
  ) => {
    const source = allMatches.find((match) => match.bracketCode === sourceCode);

    if (!source) {
      return;
    }

    edges.push(
      createEdge(
        `${source.id}->${target.id}`,
        source.id,
        target.id,
        sourceHandle,
        targetHandle
      )
    );
  };

  for (const match of allMatches) {
    if (match.homeSourceType === "match_winner") {
      const source = matchByCode.get(match.homeSourceRef);
      const targetNode = positionedMatches.get(match.id);
      const sourceNode = source ? positionedMatches.get(source.id) : null;

      if (source && targetNode && sourceNode) {
        const sourceHandle =
          match.stage === "third_place"
            ? "bottom-source"
            : sourceNode.position.x < targetNode.position.x
            ? "right-source"
            : "left-source";
        const targetHandle =
          sourceNode.position.x < targetNode.position.x
            ? "left-target"
            : "right-target";

        addEdgeFromSource(
          match.homeSourceRef,
          match,
          sourceHandle,
          targetHandle
        );
      }
    }

    if (match.awaySourceType === "match_winner") {
      const source = matchByCode.get(match.awaySourceRef);
      const targetNode = positionedMatches.get(match.id);
      const sourceNode = source ? positionedMatches.get(source.id) : null;

      if (source && targetNode && sourceNode) {
        const sourceHandle =
          match.stage === "third_place"
            ? "bottom-source"
            : sourceNode.position.x < targetNode.position.x
            ? "right-source"
            : "left-source";
        const targetHandle =
          sourceNode.position.x < targetNode.position.x
            ? "left-target"
            : "right-target";

        addEdgeFromSource(
          match.awaySourceRef,
          match,
          sourceHandle,
          targetHandle
        );
      }
    }
  }

  return { nodes, edges };
};
