"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Shuffle,
  Trophy,
  Layers,
  Trash2,
  Printer,
  Crown,
  ChevronRight,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PodCard } from "@/components/pod-card";
import { cn } from "@/lib/utils";
import {
  groupWinners,
  makeWinnerGroups,
  podium,
  roundComplete,
  roundWinners,
  FINAL_PICKS,
  MAX_ADVANCERS,
  type GroupBatch,
  type Round,
  type Student,
} from "@/lib/types";

const ORDINAL = ["1st", "2nd", "3rd"];
// Medal styling per podium rank: gold, silver, bronze.
const RANK_BADGE = [
  "bg-gold text-gold-foreground",
  "bg-slate-300 text-slate-800",
  "bg-amber-600 text-white",
];

const SCOPE_LABEL: Record<GroupBatch["scope"], string> = {
  "class-section": "Within each class + section",
  class: "Within each class",
  all: "Across everyone",
};

// Label a round: the last round of a finished-looking tree is the "Final".
function roundLabel(round: Round, index: number, total: number) {
  if (index === total - 1 && round.groups.length === 1) return "Final";
  if (index === total - 1 && round.groups.length === 2) return "Semifinals";
  return round.name;
}

export function GroupsPanel({
  students,
  batch,
  onBatch,
}: {
  students: Student[];
  batch: GroupBatch | null;
  onBatch: (b: GroupBatch | null) => void;
}) {
  const [groupSize, setGroupSize] = useState("4");
  const [scope, setScope] = useState<GroupBatch["scope"]>("class-section");
  const [drawing, setDrawing] = useState(false);
  const [nextSize, setNextSize] = useState("4");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function draw() {
    if (students.length === 0) {
      toast.error("Add students before drawing groups.");
      return;
    }
    setDrawing(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSize: Number(groupSize), scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draw failed.");
      onBatch(data);
      toast.success(`Drew ${data.rounds[0].groups.length} groups.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDrawing(false);
    }
  }

  async function clearDraw() {
    try {
      await fetch("/api/groups", { method: "DELETE" });
      onBatch(null);
      toast.success("Cleared the tournament.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  // Persist the batch. Score edits are debounced; structural changes save now.
  function persist(next: GroupBatch, immediate = false) {
    onBatch(next);
    const send = () =>
      fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: next._id, rounds: next.rounds }),
      }).catch(() => toast.error("Couldn't save — check your connection."));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) send();
    else saveTimer.current = setTimeout(send, 400);
  }

  // Apply a change to a single group in a given round, returning a new batch.
  function editGroup(
    roundIdx: number,
    groupIdx: number,
    fn: (g: GroupBatch["rounds"][number]["groups"][number]) => void,
    immediate = false,
  ) {
    if (!batch) return;
    const rounds = batch.rounds.map((r, ri) =>
      ri !== roundIdx
        ? r
        : {
            ...r,
            groups: r.groups.map((g, gi) => {
              if (gi !== groupIdx) return g;
              const copy = { ...g, scores: { ...(g.scores ?? {}) } };
              fn(copy);
              return copy;
            }),
          },
    );
    persist({ ...batch, rounds }, immediate);
  }

  function advance() {
    if (!batch) return;
    const last = batch.rounds[batch.rounds.length - 1];
    if (!roundComplete(last)) {
      toast.error("Pick a winner in every group first.");
      return;
    }
    const winners = roundWinners(last);
    const size = Math.min(winners.length, Math.max(2, Number(nextSize) || 4));
    const groups = makeWinnerGroups(winners, size);
    const round: Round = {
      name: `Round ${batch.rounds.length + 1}`,
      groupSize: size,
      groups,
    };
    persist({ ...batch, rounds: [...batch.rounds, round] }, true);
    toast.success(
      `Advanced ${winners.length} winners into ${groups.length} group${
        groups.length === 1 ? "" : "s"
      }.`,
    );
  }

  function undoLastRound() {
    if (!batch || batch.rounds.length <= 1) return;
    persist({ ...batch, rounds: batch.rounds.slice(0, -1) }, true);
    toast.success("Removed the last round.");
  }

  const totalPlayers = batch ? batch.rounds[0].groups.reduce((n, g) => n + g.members.length, 0) : 0;
  const lastIdx = batch ? batch.rounds.length - 1 : -1;
  const lastRound = batch ? batch.rounds[lastIdx] : null;
  const winnersReady = lastRound ? roundComplete(lastRound) : false;
  const pendingWinners = lastRound ? roundWinners(lastRound).length : 0;
  const canAdvance = !!lastRound && lastRound.groups.length > 1 && winnersReady;
  // The final: a last round with a single group. Its picks are the podium.
  const finalGroup =
    lastRound && lastRound.groups.length === 1 ? lastRound.groups[0] : null;
  const podiumWinners = batch ? podium(batch) : [];
  const podiumTarget = finalGroup
    ? Math.min(FINAL_PICKS, finalGroup.members.length)
    : 0;
  const podiumDone = !!finalGroup && podiumWinners.length >= podiumTarget;
  const advanceOptions = Array.from(
    { length: Math.max(1, Math.min(6, pendingWinners) - 1) },
    (_, i) => i + 2,
  );
  // Keep the picker showing a valid option even as the winner pool shrinks.
  const effectiveNextSize = advanceOptions.includes(Number(nextSize))
    ? nextSize
    : String(advanceOptions[advanceOptions.length - 1] ?? 2);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Group size</Label>
              <Select value={groupSize} onValueChange={setGroupSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} per group
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Draw scope</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as GroupBatch["scope"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class-section">
                    Within each class + section
                  </SelectItem>
                  <SelectItem value="class">Within each class</SelectItem>
                  <SelectItem value="all">Across everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="lg" onClick={draw} disabled={drawing}>
              <Shuffle className="h-4 w-4" />
              {batch ? "Re-draw (reset)" : "Draw groups"}
            </Button>
          </div>
        </div>
      </Card>

      {batch ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Layers className="h-4 w-4 text-gold" />
                {batch.rounds.length} round{batch.rounds.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                {totalPlayers} players
              </span>
              <span className="hidden sm:inline">{SCOPE_LABEL[batch.scope]}</span>
            </div>
            <div className="flex gap-2 print:hidden">
              {batch.rounds.length > 1 && (
                <Button variant="outline" size="sm" onClick={undoLastRound}>
                  <Undo2 className="h-4 w-4" /> Undo round
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={clearDraw}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          {podiumWinners.length > 0 && (
            <Card className="border-gold bg-gold/10">
              <CardContent className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-gold" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Final standings
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {Array.from({ length: podiumTarget }).map((_, i) => {
                    const w = podiumWinners[i];
                    const score = w ? finalGroup?.scores?.[w._id] : undefined;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border bg-white px-4 py-2.5",
                          i === 0 && "border-gold",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                            w
                              ? RANK_BADGE[i]
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {ORDINAL[i]}
                        </span>
                        <div className="leading-tight">
                          <div
                            className={cn(
                              "font-display font-bold text-primary",
                              i === 0 ? "text-lg" : "text-sm",
                            )}
                          >
                            {w ? w.name : "—"}
                          </div>
                          {typeof score === "number" ? (
                            <div className="text-[11px] tabular-nums text-muted-foreground">
                              {score} pts
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {batch.rounds.map((round, ri) => {
            const isLast = ri === lastIdx;
            const editable = isLast;
            const isFinal = isLast && round.groups.length === 1;
            return (
              <section key={ri} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-primary">
                    {roundLabel(round, ri, batch.rounds.length)}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {isFinal ? (
                      <>
                        podium · {roundWinners(round).length}/{podiumTarget}{" "}
                        placed
                      </>
                    ) : (
                      <>
                        {round.groups.length} group
                        {round.groups.length === 1 ? "" : "s"} ·{" "}
                        {
                          round.groups.filter((g) => groupWinners(g).length > 0)
                            .length
                        }
                        /{round.groups.length} decided ·{" "}
                        {roundWinners(round).length} advancing
                      </>
                    )}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {round.groups.map((g, gi) => (
                    <PodCard
                      key={`${ri}-${gi}-${g.name}`}
                      group={g}
                      index={gi}
                      editable={editable}
                      podium={isFinal}
                      onScore={(memberId, score) =>
                        editGroup(ri, gi, (grp) => {
                          if (score === null) delete grp.scores![memberId];
                          else grp.scores![memberId] = score;
                        })
                      }
                      onWinner={(memberId) => {
                        const ids = g.winnerIds ?? [];
                        const max = isFinal
                          ? Math.min(FINAL_PICKS, g.members.length)
                          : MAX_ADVANCERS;
                        if (!ids.includes(memberId) && ids.length >= max) {
                          toast.message(
                            isFinal
                              ? `The podium has ${max} places. Unpick one first.`
                              : `Up to ${max} players advance per group. Unpick one first.`,
                          );
                          return;
                        }
                        editGroup(
                          ri,
                          gi,
                          (grp) => {
                            const cur = grp.winnerIds ?? [];
                            grp.winnerIds = cur.includes(memberId)
                              ? cur.filter((x) => x !== memberId)
                              : [...cur, memberId];
                          },
                          true,
                        );
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {!podiumDone && lastRound && (
            <Card className="print:hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="text-sm">
                  {finalGroup ? (
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        The Final
                      </span>{" "}
                      — crown players in order to set{" "}
                      {ORDINAL.slice(0, podiumTarget).join(", ")} place ·{" "}
                      {podiumWinners.length}/{podiumTarget} picked
                    </span>
                  ) : winnersReady ? (
                    <span className="font-medium text-foreground">
                      {pendingWinners} player{pendingWinners === 1 ? "" : "s"}{" "}
                      advancing.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Crown 1 or 2 players in every group (and enter scores) to
                      continue.
                    </span>
                  )}
                </div>
                {canAdvance ? (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Next group size
                    </Label>
                    <Select value={effectiveNextSize} onValueChange={setNextSize}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {advanceOptions.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} per group
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={advance}>
                      Make next round <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CardTitle className="mb-1">No draw yet</CardTitle>
            <CardDescription className="max-w-sm">
              You have {students.length} student
              {students.length === 1 ? "" : "s"} on the roster. Pick a group size
              and hit draw to build round one.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
