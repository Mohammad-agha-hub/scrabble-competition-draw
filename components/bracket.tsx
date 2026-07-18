"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Crown, GitFork } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  podium,
  FINAL_PICKS,
  type Group,
  type GroupBatch,
} from "@/lib/types";

const ORDINAL = ["1st", "2nd", "3rd"];
// Medal styling per podium rank: gold, silver, bronze.
const RANK_BADGE = [
  "bg-gold text-gold-foreground",
  "bg-slate-300 text-slate-800",
  "bg-amber-600 text-white",
];

function roundTitle(groups: number, index: number, total: number) {
  if (index === total - 1 && groups === 1) return "Final";
  if (index === total - 1 && groups === 2) return "Semifinals";
  return `Round ${index + 1}`;
}

// Esports-style elbow connector: out of the source row, across to the middle
// of the column gap, down/up, then into the target row. Rounded corners.
function elbowPath(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2;
  const dy = y2 - y1;
  if (Math.abs(dy) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const s = dy > 0 ? 1 : -1;
  const r = Math.min(8, Math.abs(dy) / 2, Math.max(2, (x2 - x1) / 4));
  return [
    `M ${x1} ${y1}`,
    `H ${midX - r}`,
    `Q ${midX} ${y1} ${midX} ${y1 + s * r}`,
    `V ${y2 - s * r}`,
    `Q ${midX} ${y2} ${midX + r} ${y2}`,
    `H ${x2}`,
  ].join(" ");
}

export function Bracket({ batch }: { batch: GroupBatch | null }) {
  const contentRef = useRef<HTMLDivElement>(null);
  // `g:${round}-${group}` -> card element, `r:${round}-${group}-${memberId}` -> row element
  const nodes = useRef(new Map<string, HTMLElement>());
  const [paths, setPaths] = useState<string[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const setNode = useCallback((key: string, el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  }, []);

  const recompute = useCallback(() => {
    const content = contentRef.current;
    if (!content || !batch) return;
    // Everything is measured against the content box, so positioned ancestors
    // and horizontal scrolling can't skew the line endpoints.
    const cRect = content.getBoundingClientRect();
    const next: string[] = [];

    for (let ri = 0; ri < batch.rounds.length - 1; ri++) {
      const round = batch.rounds[ri];
      const nextRound = batch.rounds[ri + 1];
      round.groups.forEach((g, gi) => {
        const srcCard = nodes.current.get(`g:${ri}-${gi}`);
        if (!srcCard) return;
        const srcCardRect = srcCard.getBoundingClientRect();

        // Each advancing player gets a line from their row in this group to
        // their row in whichever next-round group they landed in.
        (g.winnerIds ?? []).forEach((winnerId) => {
          const tIdx = nextRound.groups.findIndex((tg) =>
            tg.members.some((m) => m._id === winnerId),
          );
          if (tIdx < 0) return;
          const dstCard = nodes.current.get(`g:${ri + 1}-${tIdx}`);
          if (!dstCard) return;
          const dstCardRect = dstCard.getBoundingClientRect();

          const srcRow = nodes.current.get(`r:${ri}-${gi}-${winnerId}`);
          const dstRow = nodes.current.get(`r:${ri + 1}-${tIdx}-${winnerId}`);
          const rowMidY = (el: HTMLElement | undefined, fallback: DOMRect) => {
            const rect = el?.getBoundingClientRect() ?? fallback;
            return rect.top + rect.height / 2 - cRect.top;
          };

          const x1 = srcCardRect.right - cRect.left;
          const y1 = rowMidY(srcRow, srcCardRect);
          const x2 = dstCardRect.left - cRect.left;
          const y2 = rowMidY(dstRow, dstCardRect);
          next.push(elbowPath(x1, y1, x2, y2));
        });
      });
    }

    setSize({ w: content.scrollWidth, h: content.scrollHeight });
    setPaths(next);
  }, [batch]);

  useLayoutEffect(() => {
    recompute();
    const raf = requestAnimationFrame(recompute);
    const content = contentRef.current;
    const ro = new ResizeObserver(recompute);
    if (content) ro.observe(content);
    window.addEventListener("resize", recompute);
    // Re-measure once fonts finish loading — row heights can shift slightly.
    document.fonts?.ready?.then(recompute);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  if (!batch) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <GitFork className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <CardTitle className="mb-1">No bracket yet</CardTitle>
          <p className="max-w-sm text-sm text-muted-foreground">
            Draw groups on the “The Draw” tab, pick winners, and advance rounds —
            the bracket builds itself here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const standings = podium(batch);
  const totalRounds = batch.rounds.length;

  return (
    <div className="space-y-5">
      {standings.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {standings.slice(0, FINAL_PICKS).map((w, i) => (
            <div
              key={w._id}
              className={cn(
                "flex items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-4",
                i === 0 && "border-gold",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                  RANK_BADGE[i],
                )}
              >
                {ORDINAL[i]}
              </span>
              <span className="text-sm font-semibold text-primary">
                {w.name}
                {w.className && w.section ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    ({w.className} · {w.section})
                  </span>
                ) : null}
              </span>
              {i === 0 ? <Crown className="h-4 w-4 text-gold" /> : null}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div
          ref={contentRef}
          className="relative mx-auto flex w-max items-stretch gap-10 px-3 py-2"
        >
          {/* connector layer sits under the cards */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={size.w}
            height={size.h}
          >
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                style={{ stroke: "hsl(var(--gold))" }}
                strokeWidth={2}
                strokeOpacity={0.65}
                strokeLinecap="round"
              />
            ))}
          </svg>

          {batch.rounds.map((round, ri) => {
            const isFinal = ri === totalRounds - 1 && round.groups.length === 1;
            return (
              <div key={ri} className="flex w-52 shrink-0 flex-col">
                <div className="mb-3 text-center">
                  <div className="font-display text-sm font-bold text-primary">
                    {roundTitle(round.groups.length, ri, totalRounds)}
                  </div>
                </div>
                {/* Groups cluster in the vertical middle of the column so
                    later (smaller) rounds line up with the bracket's center. */}
                <div className="flex flex-1 flex-col justify-center gap-4">
                  {round.groups.map((g, gi) => (
                    <BracketCard
                      key={gi}
                      group={g}
                      podium={isFinal}
                      cardRef={(el) => setNode(`g:${ri}-${gi}`, el)}
                      rowRef={(memberId, el) =>
                        setNode(`r:${ri}-${gi}-${memberId}`, el)
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BracketCard({
  group,
  podium: isPodium,
  cardRef,
  rowRef,
}: {
  group: Group;
  podium: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  rowRef: (memberId: string, el: HTMLDivElement | null) => void;
}) {
  const winnerIds = group.winnerIds ?? [];
  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-lg border border-primary/15 bg-card shadow-sm"
    >
      <div className="flex items-center justify-between bg-primary px-3 py-1.5">
        <span className="font-display text-xs font-bold text-primary-foreground">
          {group.name}
        </span>
        {winnerIds.length > 0 ? (
          <Crown className="h-3.5 w-3.5 text-gold" />
        ) : null}
      </div>
      <div className="divide-y divide-border">
        {group.members.map((m) => {
          const rank = winnerIds.indexOf(m._id);
          const isWinner = rank >= 0;
          const score = group.scores?.[m._id];
          return (
            <div
              key={m._id}
              ref={(el) => rowRef(m._id, el)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5",
                isWinner && "bg-gold/10",
              )}
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px]",
                  isWinner
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {m.name}
                {m.className && m.section ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground/80">
                    ({m.className} · {m.section})
                  </span>
                ) : null}
              </span>
              {typeof score === "number" ? (
                <span
                  className={cn(
                    "inline-flex min-w-6 items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                    isWinner
                      ? "bg-gold text-gold-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {score}
                </span>
              ) : null}
              {isWinner ? (
                isPodium ? (
                  <span
                    className={cn(
                      "inline-flex h-5 w-7 items-center justify-center rounded-full text-[9px] font-bold",
                      RANK_BADGE[rank] ?? RANK_BADGE[0],
                    )}
                  >
                    {ORDINAL[rank] ?? rank + 1}
                  </span>
                ) : (
                  <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}