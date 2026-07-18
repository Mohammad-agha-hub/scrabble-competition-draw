"use client";

import { useState } from "react";
import { Crown, X, UserPlus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Group, Student } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Medal styling per podium rank: gold, silver, bronze.
const RANK_BADGE = [
  "bg-gold text-gold-foreground",
  "bg-slate-300 text-slate-800",
  "bg-amber-600 text-white",
];
const ORDINAL = ["1st", "2nd", "3rd"];

export function PodCard({
  group,
  index,
  editable = false,
  podium = false,
  onScore,
  onWinner,
  onRemoveMember,
  onAddMember,
  availableStudents,
  onDeleteGroup,
}: {
  group: Group;
  index: number;
  editable?: boolean;
  podium?: boolean; // final group: picks are ranked 1st/2nd/3rd
  onScore?: (memberId: string, score: number | null) => void;
  onWinner?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  onAddMember?: (studentId: string) => void;
  availableStudents?: Student[]; // roster students not currently in this round
  onDeleteGroup?: () => void; // delete this entire group from the round
}) {
  const [addValue, setAddValue] = useState("");

  function handleAdd() {
    if (!addValue) return;
    onAddMember?.(addValue);
    setAddValue("");
  }

  const slots = editable
    ? group.members.length
    : Math.max(group.size, group.members.length);
  const empty = slots - group.members.length;
  const winnerIds = group.winnerIds ?? [];
  const winners = winnerIds
    .map((id) => group.members.find((m) => m._id === id))
    .filter((m): m is (typeof group.members)[number] => Boolean(m));

  return (
    <Card
      className="animate-pod-in overflow-hidden border-primary/10"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-display text-xl font-bold text-primary-foreground">
            {group.name.replace("Group ", "")}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="font-display text-sm font-semibold">
              {group.name}
            </div>
            <div className="truncate text-[11px] text-primary-foreground/60">
              {winners.length ? (
                <span className="inline-flex items-center gap-1 text-gold">
                  <Crown className="h-3 w-3" />{" "}
                  {winners
                    .map((w, i) =>
                      podium ? `${ORDINAL[i] ?? i + 1} ${w.name}` : w.name,
                    )
                    .join(" · ")}
                </span>
              ) : (
                <>
                  {group.className}
                  {group.section !== "—" ? ` · Sec ${group.section}` : ""}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{group.members.length} players</Badge>
          {editable && onDeleteGroup ? (
            <button
              type="button"
              onClick={onDeleteGroup}
              aria-label={`Delete ${group.name}`}
              title="Delete this group"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <ol className="divide-y divide-border">
        {group.members.map((m, i) => {
          const rank = winnerIds.indexOf(m._id); // -1 if not advancing
          const isWinner = rank >= 0;
          const score = group.scores?.[m._id];
          return (
            <li
              key={m._id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                isWinner && "bg-gold/10",
              )}
            >
              <span className="w-5 text-right font-display text-xs font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  isWinner
                    ? podium
                      ? (RANK_BADGE[rank] ?? RANK_BADGE[0])
                      : "bg-gold text-gold-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {initials(m.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {m.name}
                {m.className && m.section ? (
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    ({m.className} · {m.section})
                  </span>
                ) : null}
              </span>

              {editable ? (
                <>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={score ?? ""}
                    placeholder="—"
                    aria-label={`Score for ${m.name}`}
                    onChange={(e) =>
                      onScore?.(
                        m._id,
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    className="h-8 w-16 rounded-md border border-input bg-white px-2 text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => onWinner?.(m._id)}
                    aria-label={podium ? `Rank ${m.name}` : `Advance ${m.name}`}
                    title={
                      isWinner
                        ? podium
                          ? `${ORDINAL[rank] ?? `#${rank + 1}`} place`
                          : `Advancing (#${rank + 1})`
                        : podium
                          ? "Pick podium place (in order)"
                          : "Advance to next round"
                    }
                    className={cn(
                      "relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                      isWinner
                        ? podium
                          ? cn(
                              "border-transparent",
                              RANK_BADGE[rank] ?? RANK_BADGE[0],
                            )
                          : "border-gold bg-gold text-gold-foreground"
                        : "border-input text-muted-foreground hover:border-gold hover:text-gold",
                    )}
                  >
                    <Crown className="h-4 w-4" />
                    {isWinner && (podium || winnerIds.length > 1) ? (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                        {rank + 1}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveMember?.(m._id)}
                    aria-label={`Remove ${m.name} from group`}
                    title="Remove from group"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex shrink-0 items-center gap-2">
                  {typeof score === "number" ? (
                    <Badge
                      variant={isWinner ? "gold" : "outline"}
                      className="tabular-nums"
                    >
                      {score}
                    </Badge>
                  ) : null}
                  {isWinner ? (
                    <span className="inline-flex items-center gap-0.5 text-gold">
                      <Crown className="h-4 w-4" />
                      {podium ? (
                        <span className="text-[10px] font-bold">
                          {ORDINAL[rank] ?? rank + 1}
                        </span>
                      ) : winnerIds.length > 1 ? (
                        <span className="text-[10px] font-bold">
                          {rank + 1}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
        {Array.from({ length: empty }).map((_, i) => (
          <li
            key={`empty-${i}`}
            className={cn("flex items-center gap-3 px-4 py-2.5")}
          >
            <span className="w-5 text-right font-display text-xs font-semibold text-muted-foreground/40">
              {group.members.length + i + 1}
            </span>
            <span className="pod-slot-empty inline-flex h-8 w-8 items-center justify-center rounded-full" />
            <span className="text-sm text-muted-foreground/50">open slot</span>
          </li>
        ))}
      </ol>

      {editable && availableStudents ? (
        <div className="flex items-center gap-2 border-t border-border bg-secondary/30 px-4 py-2.5">
          <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          {availableStudents.length > 0 ? (
            <>
              <Select value={addValue} onValueChange={setAddValue}>
                <SelectTrigger className="h-8 flex-1 text-xs">
                  <SelectValue placeholder="Add a student to this group…" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.className} · {s.section})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAdd}
                disabled={!addValue}
                className="h-8 shrink-0"
              >
                Add
              </Button>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Every student is already placed in this round.
            </span>
          )}
        </div>
      ) : null}
    </Card>
  );
}
