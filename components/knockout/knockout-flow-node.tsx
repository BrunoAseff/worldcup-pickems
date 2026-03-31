"use client";

import { useEffect } from "react";
import {
  Handle,
  NodeProps,
  Position,
  useUpdateNodeInternals,
} from "@xyflow/react";
import {
  KNOCKOUT_NODE_HEIGHT,
  KNOCKOUT_NODE_WIDTH,
  type KnockoutFlowNode,
} from "@/lib/knockout/react-flow";

const hiddenHandleClassName =
  "!size-2 !border-0 !bg-transparent opacity-0 pointer-events-none";

export function KnockoutFlowMatchNode({ data }: NodeProps<KnockoutFlowNode>) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if ("match" in data) {
      updateNodeInternals(data.match.id);
    }
  }, [data, updateNodeInternals]);

  if (!("match" in data)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none relative"
      style={{ width: KNOCKOUT_NODE_WIDTH, height: KNOCKOUT_NODE_HEIGHT }}
    >
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className={hiddenHandleClassName}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        className={hiddenHandleClassName}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className={hiddenHandleClassName}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className={hiddenHandleClassName}
      />
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className={hiddenHandleClassName}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className={hiddenHandleClassName}
      />
    </div>
  );
}
