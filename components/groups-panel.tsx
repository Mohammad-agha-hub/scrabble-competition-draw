"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shuffle, Trophy, Layers, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import type { GroupBatch, Student } from "@/lib/types";

const SCOPE_LABEL: Record<GroupBatch["scope"], string> = {
  "class-section": "Within each class + section",
  class: "Within each class",
  all: "Across everyone",
};

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
      toast.success(`Drew ${data.groups.length} groups.`);
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
      toast.success("Cleared the current draw.");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const totalPlayers = batch
    ? batch.groups.reduce((n, g) => n + g.members.length, 0)
    : 0;

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
              <Select value={scope} onValueChange={(v) => setScope(v as GroupBatch["scope"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="class-section">Within each class + section</SelectItem>
                  <SelectItem value="class">Within each class</SelectItem>
                  <SelectItem value="all">Across everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="gold" size="lg" onClick={draw} disabled={drawing}>
              <Shuffle className="h-4 w-4" />
              {batch ? "Re-draw groups" : "Draw groups"}
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
                {batch.groups.length} groups
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                {totalPlayers} players · {batch.groupSize} per group
              </span>
              <span className="hidden sm:inline">{SCOPE_LABEL[batch.scope]}</span>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={clearDraw}>
                <Trash2 className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {batch.groups.map((g, i) => (
              <PodCard key={`${g.className}-${g.section}-${g.name}-${i}`} group={g} index={i} />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-gold">
              <Trophy className="h-7 w-7" />
            </span>
            <CardTitle className="mb-1">No draw yet</CardTitle>
            <CardDescription className="max-w-sm">
              You have {students.length} student{students.length === 1 ? "" : "s"} on the roster.
              Pick a group size and hit draw to build the tournament pods.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
