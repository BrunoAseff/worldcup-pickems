"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ControlButton,
  Controls,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
  ReactFlowProvider,
  ViewportPortal,
  useReactFlow,
} from "@xyflow/react";
import { ScanSearch } from "lucide-react";
import { KnockoutPageView } from "@/lib/knockout/queries";
import { buildKnockoutFlow } from "@/lib/knockout/react-flow";
import { KnockoutFlowMatchNode } from "./knockout-flow-node";
import { KnockoutMatchCard } from "./knockout-match-card";
type KnockoutShellProps = {
  view: KnockoutPageView;
  mode: "player" | "admin";
};

const KNOCKOUT_MIN_ZOOM = 0.2;
const KNOCKOUT_MAX_ZOOM = 1.35;
const KNOCKOUT_FIT_VIEW_OPTIONS = { padding: 0.22, duration: 0 } as const;

const nodeTypes: NodeTypes = {
  knockoutMatch: KnockoutFlowMatchNode,
};

function KnockoutShellCanvas({ view, mode }: KnockoutShellProps) {
  const reactFlow = useReactFlow();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fitSignatureRef = useRef<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(
    null
  );
  const [initialViewportReady, setInitialViewportReady] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const { nodes, edges } = useMemo(
    () => buildKnockoutFlow(view, mode),
    [mode, view]
  );
  const matchNodes = nodes.filter((node) => node.type === "knockoutMatch");
  const labelNodes = nodes.filter((node) => node.type === "stageLabel");
  const fitSignature = useMemo(
    () =>
      JSON.stringify({
        width: viewportSize.width,
        height: viewportSize.height,
        ids: matchNodes.map((node) => node.id),
      }),
    [matchNodes, viewportSize.height, viewportSize.width]
  );

  const runFitView = useMemo(
    () =>
      async (instance: ReactFlowInstance, markReady = false) => {
        await instance.fitView(KNOCKOUT_FIT_VIEW_OPTIONS);

        if (markReady) {
          setInitialViewportReady(true);
        }
      },
    []
  );

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      const nextWidth = Math.round(element.clientWidth);
      const nextHeight = Math.round(element.clientHeight);

      setViewportSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!flowInstance) {
      return;
    }

    if (
      viewportSize.width === 0 ||
      viewportSize.height === 0 ||
      matchNodes.length === 0
    ) {
      return;
    }

    if (fitSignatureRef.current === fitSignature) {
      return;
    }

    fitSignatureRef.current = fitSignature;

    const timeoutId = window.setTimeout(() => {
      setInitialViewportReady(false);
      void runFitView(flowInstance, true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    flowInstance,
    fitSignature,
    matchNodes.length,
    viewportSize.height,
    viewportSize.width,
    runFitView,
  ]);

  return (
    <div className="mx-auto w-full max-w-360 space-y-6 px-5 pb-6 pt-3 md:px-8 md:pt-4 xl:px-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-foreground">
          Mata-mata
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {mode === "player"
            ? "Monte sua chave completa até o início do mata-mata. Em placares empatados, marque na própria partida quem avança."
            : "Lance os resultados oficiais da chave. Em empates no tempo normal, marque na própria partida quem avançou."}
        </p>
      </div>

      <div className="knockout-flow rounded-md border border-border bg-card">
        <div ref={viewportRef} className="h-192 overflow-hidden rounded-md">
          {viewportSize.width > 0 && viewportSize.height > 0 ? (
            <ReactFlow
              className={initialViewportReady ? "opacity-100" : "opacity-0"}
              nodes={matchNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              width={viewportSize.width}
              height={viewportSize.height}
              onInit={setFlowInstance}
              minZoom={KNOCKOUT_MIN_ZOOM}
              maxZoom={KNOCKOUT_MAX_ZOOM}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              zoomOnDoubleClick={false}
              zoomOnScroll
              panOnDrag
              panOnScroll={false}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{
                type: "smoothstep",
                style: {
                  strokeWidth: 1.5,
                },
              }}
            >
              <Background gap={16} size={1} color="var(--border)" />
              <Controls showInteractive={false} showFitView={false}>
                <ControlButton
                  onClick={() => {
                    void runFitView(reactFlow);
                  }}
                  title="Ajustar visualização"
                  aria-label="Ajustar visualização"
                >
                  <ScanSearch className="size-4" />
                </ControlButton>
              </Controls>
              <ViewportPortal>
                {labelNodes.map((node) => {
                  if (!("label" in node.data)) {
                    return null;
                  }

                  return (
                    <div
                      key={node.id}
                      className="pointer-events-auto absolute w-56"
                      style={{ left: node.position.x, top: node.position.y }}
                    >
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Fase
                      </p>
                      <h2 className="mt-1 text-center text-lg font-semibold tracking-[-0.02em] text-foreground">
                        {node.data.label}
                      </h2>
                    </div>
                  );
                })}

                {matchNodes.map((node) => {
                  if (!("match" in node.data)) {
                    return null;
                  }

                  const cardKey = [
                    node.id,
                    node.data.match.homeParticipant.teamId ?? "home-null",
                    node.data.match.awayParticipant.teamId ?? "away-null",
                    node.data.match.prediction?.homeScore ?? "ph-null",
                    node.data.match.prediction?.awayScore ?? "pa-null",
                    node.data.match.prediction?.predictedAdvancingTeamId ??
                      "padv-null",
                    node.data.match.officialResult?.homeScore ?? "oh-null",
                    node.data.match.officialResult?.awayScore ?? "oa-null",
                    node.data.match.officialResult?.advancingTeamId ??
                      "oadv-null",
                  ].join(":");

                  return (
                    <div
                      key={cardKey}
                      className="pointer-events-auto absolute w-56"
                      style={{ left: node.position.x, top: node.position.y }}
                    >
                      <KnockoutMatchCard
                        match={node.data.match}
                        mode={node.data.mode}
                        isLocked={node.data.isLocked}
                      />
                    </div>
                  );
                })}
              </ViewportPortal>
            </ReactFlow>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function KnockoutShell({ view, mode }: KnockoutShellProps) {
  return (
    <ReactFlowProvider>
      <KnockoutShellCanvas view={view} mode={mode} />
    </ReactFlowProvider>
  );
}
