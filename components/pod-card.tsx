"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Group } from "@/lib/types";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function PodCard({ group, index }: { group: Group; index: number }) {
  const slots = Math.max(group.size, group.members.length);
  const empty = slots - group.members.length;

  return (
    <Card
      className="animate-pod-in overflow-hidden border-primary/10"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-xl font-bold text-gold">
            {group.name.replace("Group ", "")}
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">
              {group.name}
            </div>
            <div className="text-[11px] text-primary-foreground/60">
              {group.className}
              {group.section !== "—" ? ` · Sec ${group.section}` : ""}
            </div>
          </div>
        </div>
        <Badge variant="gold">{group.members.length} players</Badge>
      </div>

      <ol className="divide-y divide-border">
        {group.members.map((m, i) => (
          <li key={m._id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-5 text-right font-display text-xs font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
              {initials(m.name)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {m.name}
            </span>
            {m.className && m.section ? (
              <Badge variant="outline" className="shrink-0 font-medium">
                {m.className} · {m.section}
              </Badge>
            ) : null}
          </li>
        ))}
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
    </Card>
  );
}
