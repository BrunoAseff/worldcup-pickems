"use client";

import { NodeProps } from "@xyflow/react";
import type { KnockoutFlowNode } from "@/lib/knockout/react-flow";

export function KnockoutStageLabelNode({ data }: NodeProps<KnockoutFlowNode>) {
  if (!("label" in data)) {
    return null;
  }

  return (
    <div className="nodrag nopan w-56">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Fase
      </p>
      <h2 className="mt-1 text-center text-lg font-semibold tracking-[-0.02em] text-foreground">
        {data.label}
      </h2>
    </div>
  );
}
