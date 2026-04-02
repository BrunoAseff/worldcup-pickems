"use client";

import { useMemo } from "react";
import { rankingConfettiColorClasses } from "@/lib/ranking/presentation";

export function RankingConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        delay: `${(index % 7) * 0.18}s`,
        duration: `${3.2 + (index % 5) * 0.35}s`,
        color: rankingConfettiColorClasses[index % rankingConfettiColorClasses.length],
      })),
    []
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`absolute top-0 h-3 w-2 rounded-xs opacity-85 animate-[ranking-confetti_var(--duration)_linear_infinite] ${piece.color}`}
          style={
            {
              left: piece.left,
              animationDelay: piece.delay,
              ["--duration" as string]: piece.duration,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
