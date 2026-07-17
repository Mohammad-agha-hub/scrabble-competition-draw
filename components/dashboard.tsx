"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, School, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RosterPanel } from "@/components/roster-panel";
import { GroupsPanel } from "@/components/groups-panel";
import type { GroupBatch, Student } from "@/lib/types";

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </span>
      <div className="leading-tight">
        <div className="font-display text-xl font-bold text-primary">
          {value}
        </div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState<GroupBatch | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load roster.");
      setStudents(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, []);

  const loadBatch = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (res.ok) setBatch(data);
    } catch {
      /* ignore — no draw yet */
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadStudents(), loadBatch()]);
      setLoading(false);
    })();
  }, [loadStudents, loadBatch]);

  const stats = useMemo(() => {
    const classes = new Set(students.map((s) => s.className));
    const sections = new Set(
      students.map((s) => `${s.className}·${s.section}`),
    );
    return {
      students: students.length,
      classes: classes.size,
      sections: sections.size,
    };
  }, [students]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:hidden">
        <Stat
          icon={<Users className="h-4 w-4" />}
          label="Students"
          value={stats.students}
        />
        <Stat
          icon={<School className="h-4 w-4" />}
          label="Classes"
          value={stats.classes}
        />
        <Stat
          icon={<Layers className="h-4 w-4" />}
          label="Class-sections"
          value={stats.sections}
        />
      </div>

      <Tabs defaultValue="roster" className="print:hidden">
        <TabsList>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="draw">The Draw</TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading roster…
            </p>
          ) : (
            <RosterPanel students={students} onChanged={loadStudents} />
          )}
        </TabsContent>

        <TabsContent value="draw">
          <GroupsPanel students={students} batch={batch} onBatch={setBatch} />
        </TabsContent>
      </Tabs>

      {/* Printable draw (only visible when printing) */}
      {batch && (
        <div className="hidden print:block">
          <h2 className="mb-4 font-display text-2xl font-bold">
            Tournament Draw
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {batch.groups.map((g, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="mb-2 font-semibold">
                  {g.name} · {g.className}
                  {g.section !== "—" ? ` ${g.section}` : ""}
                </div>
                <ol className="list-decimal pl-5 text-sm">
                  {g.members.map((m) => (
                    <li key={m._id}>
                      {m.name}{" "}
                      <span className="text-muted-foreground">
                        ({m.className} · {m.section})
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
