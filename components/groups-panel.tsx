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
  FolderPlus,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
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
  type Group,
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

// Ids of every student currently placed somewhere in this round.
function roundAssignedIds(round: Round): Set<string> {
  const ids = new Set<string>();
  round.groups.forEach((g) => g.members.forEach((m) => ids.add(m._id)));
  return ids;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToGroupIdx, setAddToGroupIdx] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Who is allowed into a round: the full roster for round one, then only
  // the winners of the previous round after that.
  function eligiblePool(roundIdx: number): Student[] {
    if (!batch || roundIdx === 0) return students;
    const prev = batch.rounds[roundIdx - 1];
    return prev ? roundWinners(prev) : students;
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function draw() {
    if (students.length === 0) {
      toast.error("Add students before drawing groups.");
      return;
    }
    const size = Number(groupSize);
    if (!Number.isInteger(size) || size < 2) {
      toast.error("Group size must be a whole number, 2 or more.");
      return;
    }
    setDrawing(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupSize: size, scope }),
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

  const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Add a fresh, empty group to a round so students can be placed into it manually.
  function addGroup(roundIdx: number) {
    if (!batch) return;
    const round = batch.rounds[roundIdx];
    if (!round) return;
    const letter =
      round.groups.length < GROUP_LETTERS.length
        ? GROUP_LETTERS[round.groups.length]
        : `${round.groups.length + 1}`;
    const newGroup: Group = {
      name: `Group ${letter}`,
      className: round.groups[0]?.className ?? "Manual",
      section: round.groups[0]?.section ?? "—",
      members: [],
      size: round.groupSize,
      winnerIds: [],
      scores: {},
    };
    const rounds = batch.rounds.map((r, ri) =>
      ri !== roundIdx ? r : { ...r, groups: [...r.groups, newGroup] },
    );
    persist({ ...batch, rounds }, true);
    toast.success(`Added ${newGroup.name}.`);
  }

  // Delete an entire group from a round. Its members simply become
  // "unassigned" again and can be re-added into any other group.
  function removeGroup(roundIdx: number, groupIdx: number) {
    if (!batch) return;
    const round = batch.rounds[roundIdx];
    const group = round?.groups[groupIdx];
    if (!round || !group) return;
    if (round.groups.length <= 1) {
      toast.error("A round needs at least one group.");
      return;
    }
    if (
      group.members.length > 0 &&
      !window.confirm(
        `Delete ${group.name}? Its ${group.members.length} student${
          group.members.length === 1 ? "" : "s"
        } will become unassigned — you can re-add them to another group.`,
      )
    ) {
      return;
    }
    const rounds = batch.rounds.map((r, ri) =>
      ri !== roundIdx
        ? r
        : { ...r, groups: r.groups.filter((_, gi) => gi !== groupIdx) },
    );
    persist({ ...batch, rounds }, true);
    toast.success(`Removed ${group.name}.`);
  }

  // Build a brand-new group directly out of the checked students.
  function createGroupFromSelection(roundIdx: number) {
    if (!batch || selectedIds.size === 0) return;
    const round = batch.rounds[roundIdx];
    if (!round) return;
    const chosen = eligiblePool(roundIdx).filter((s) => selectedIds.has(s._id));
    if (chosen.length === 0) return;
    const letter =
      round.groups.length < GROUP_LETTERS.length
        ? GROUP_LETTERS[round.groups.length]
        : `${round.groups.length + 1}`;
    const newGroup: Group = {
      name: `Group ${letter}`,
      className: round.groups[0]?.className ?? "Manual",
      section: round.groups[0]?.section ?? "—",
      members: chosen.map((s) => ({
        _id: s._id,
        name: s.name,
        className: s.className,
        section: s.section,
      })),
      size: round.groupSize,
      winnerIds: [],
      scores: {},
    };
    const rounds = batch.rounds.map((r, ri) =>
      ri !== roundIdx ? r : { ...r, groups: [...r.groups, newGroup] },
    );
    persist({ ...batch, rounds }, true);
    toast.success(
      `Created ${newGroup.name} with ${chosen.length} student${
        chosen.length === 1 ? "" : "s"
      }.`,
    );
    setSelectedIds(new Set());
  }

  // Drop the checked students into an existing group in this round.
  function addSelectionToGroup(roundIdx: number, groupIdx: number) {
    if (!batch || selectedIds.size === 0) return;
    const chosen = eligiblePool(roundIdx).filter((s) => selectedIds.has(s._id));
    if (chosen.length === 0) return;
    editGroup(
      roundIdx,
      groupIdx,
      (grp) => {
        grp.members = [
          ...grp.members,
          ...chosen.map((s) => ({
            _id: s._id,
            name: s.name,
            className: s.className,
            section: s.section,
          })),
        ];
      },
      true,
    );
    const groupName =
      batch.rounds[roundIdx]?.groups[groupIdx]?.name ?? "the group";
    toast.success(
      `Added ${chosen.length} student${chosen.length === 1 ? "" : "s"} to ${groupName}.`,
    );
    setSelectedIds(new Set());
    setAddToGroupIdx("");
  }

  function advance() {
    if (!batch) return;
    const last = batch.rounds[batch.rounds.length - 1];
    if (!roundComplete(last)) {
      toast.error("Pick a winner in every group first.");
      return;
    }
    const winners = roundWinners(last);
    const requested = Number(nextSize);
    if (!Number.isInteger(requested) || requested < 2) {
      toast.error("Next group size must be a whole number, 2 or more.");
      return;
    }
    const size = Math.min(winners.length, requested);
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

  const totalPlayers = batch
    ? batch.rounds[0].groups.reduce((n, g) => n + g.members.length, 0)
    : 0;
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

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Group size</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={2}
                max={Math.max(2, students.length)}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                placeholder="e.g. 4"
              />
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
            <Button
              variant="default"
              size="lg"
              onClick={draw}
              disabled={drawing}
            >
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
                {batch.rounds.length} round
                {batch.rounds.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                {totalPlayers} players
              </span>
              <span className="hidden sm:inline">
                {SCOPE_LABEL[batch.scope]}
              </span>
            </div>
            <div className="flex gap-2 print:hidden">
              {batch.rounds.length > 1 && (
                <Button variant="outline" size="sm" onClick={undoLastRound}>
                  <Undo2 className="h-4 w-4" /> Undo round
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
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
            const assignedIds = roundAssignedIds(round);
            const unassigned = editable
              ? eligiblePool(ri).filter((s) => !assignedIds.has(s._id))
              : undefined;
            return (
              <section key={ri} className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
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
                  {editable && !isFinal ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto print:hidden"
                      onClick={() => addGroup(ri)}
                    >
                      <FolderPlus className="h-4 w-4" /> Add group
                    </Button>
                  ) : null}
                </div>

                {editable && unassigned && unassigned.length > 0 ? (
                  <Card className="print:hidden">
                    <CardContent className="space-y-3 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Users className="h-4 w-4 text-gold" />
                        Unassigned students ({unassigned.length})
                        {selectedIds.size > 0 && (
                          <span className="text-xs font-normal text-muted-foreground">
                            · {selectedIds.size} selected
                          </span>
                        )}
                      </div>
                      <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto pr-1">
                        {unassigned.map((s) => {
                          const checked = selectedIds.has(s._id);
                          return (
                            <label
                              key={s._id}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                                checked
                                  ? "border-gold bg-gold/10 font-medium text-foreground"
                                  : "border-input text-muted-foreground hover:border-primary/30",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelected(s._id)}
                                className="h-3.5 w-3.5 accent-gold"
                              />
                              {s.name} ({s.className} · {s.section})
                            </label>
                          );
                        })}
                      </div>
                      {selectedIds.size > 0 ? (
                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => createGroupFromSelection(ri)}
                          >
                            <FolderPlus className="h-4 w-4" /> Create group from
                            selected
                          </Button>
                          {round.groups.length > 0 ? (
                            <>
                              <span className="text-xs text-muted-foreground">
                                or
                              </span>
                              <Select
                                value={addToGroupIdx}
                                onValueChange={setAddToGroupIdx}
                              >
                                <SelectTrigger className="h-9 w-[200px]">
                                  <SelectValue placeholder="Add to existing group…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {round.groups.map((g, gi) => (
                                    <SelectItem key={gi} value={String(gi)}>
                                      {g.name} ({g.members.length} players)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={!addToGroupIdx}
                                onClick={() =>
                                  addSelectionToGroup(ri, Number(addToGroupIdx))
                                }
                              >
                                <UserPlus className="h-4 w-4" /> Add selected
                              </Button>
                            </>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIds(new Set())}
                          >
                            Clear selection
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {round.groups.map((g, gi) => (
                    <PodCard
                      key={`${ri}-${gi}-${g.name}`}
                      group={g}
                      index={gi}
                      editable={editable}
                      podium={isFinal}
                      availableStudents={unassigned}
                      onDeleteGroup={
                        editable ? () => removeGroup(ri, gi) : undefined
                      }
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
                      onRemoveMember={(memberId) => {
                        const removed = g.members.find(
                          (m) => m._id === memberId,
                        );
                        editGroup(
                          ri,
                          gi,
                          (grp) => {
                            grp.members = grp.members.filter(
                              (m) => m._id !== memberId,
                            );
                            if (grp.winnerIds)
                              grp.winnerIds = grp.winnerIds.filter(
                                (id) => id !== memberId,
                              );
                            delete grp.scores![memberId];
                          },
                          true,
                        );
                        if (removed)
                          toast.success(
                            `Removed ${removed.name} from ${g.name}.`,
                          );
                      }}
                      onAddMember={(studentId) => {
                        const student = students.find(
                          (s) => s._id === studentId,
                        );
                        if (!student) return;
                        editGroup(
                          ri,
                          gi,
                          (grp) => {
                            grp.members = [
                              ...grp.members,
                              {
                                _id: student._id,
                                name: student.name,
                                className: student.className,
                                section: student.section,
                              },
                            ];
                          },
                          true,
                        );
                        toast.success(`Added ${student.name} to ${g.name}.`);
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
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={2}
                      max={Math.max(2, pendingWinners)}
                      value={nextSize}
                      onChange={(e) => setNextSize(e.target.value)}
                      placeholder="e.g. 4"
                      className="h-10 w-[100px]"
                    />
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
              {students.length === 1 ? "" : "s"} on the roster. Pick a group
              size and hit draw to build round one.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
