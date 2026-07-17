"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Users, Upload, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Student } from "@/lib/types";

export function RosterPanel({
  students,
  onChanged,
}: {
  students: Student[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [saving, setSaving] = useState(false);

  const [bulk, setBulk] = useState("");
  const [bulkClass, setBulkClass] = useState("");
  const [bulkSection, setBulkSection] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [filterClass, setFilterClass] = useState<string>("all");

  const [editing, setEditing] = useState<Student | null>(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.className))).sort(),
    [students],
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesClass = filterClass === "all" || s.className === filterClass;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.section.toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [students, filterClass, query]);

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !className.trim() || !section.trim()) {
      toast.error("Enter a name, class and section.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, className, section }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to add student.");
      toast.success(`Added ${name.trim()}.`);
      setName("");
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addBulk() {
    const lines = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error("Paste at least one name.");
      return;
    }
    if (!bulkClass.trim() || !bulkSection.trim()) {
      toast.error("Set the class and section for this batch.");
      return;
    }
    const rows = lines.map((n) => ({
      name: n,
      className: bulkClass.trim(),
      section: bulkSection.trim(),
    }));
    setBulkSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add students.");
      toast.success(
        `Added ${data.inserted} students to ${bulkClass} · ${bulkSection}.`,
      );
      setBulk("");
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBulkSaving(false);
    }
  }

  function openEdit(s: Student) {
    setEditing(s);
    setEditName(s.name);
    setEditClass(s.className);
    setEditSection(s.section);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim() || !editClass.trim() || !editSection.trim()) {
      toast.error("Enter a name, class and section.");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/students/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          className: editClass.trim(),
          section: editSection.trim(),
        }),
      });
      if (!res.ok)
        throw new Error((await res.json()).error || "Failed to save changes.");
      toast.success(`Updated ${editName.trim()}.`);
      onChanged();
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* LEFT: add forms */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-gold" /> Add a student
            </CardTitle>
            <CardDescription>One at a time.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addOne} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muhammad Zaki"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="class">Class</Label>
                  <Input
                    id="class"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. A"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Saving…" : "Add student"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-gold" /> Paste a whole class
            </CardTitle>
            <CardDescription>
              One name per line — fastest way to load a section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Input
                  value={bulkClass}
                  onChange={(e) => setBulkClass(e.target.value)}
                  placeholder="e.g. 7"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input
                  value={bulkSection}
                  onChange={(e) => setBulkSection(e.target.value)}
                  placeholder="e.g. B"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Names</Label>
              <Textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                rows={6}
                placeholder={"Ahmed Ali\nSara Khan\nBilal Hussain\n…"}
              />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={addBulk}
              disabled={bulkSaving}
            >
              {bulkSaving ? "Adding…" : "Add all names"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: roster list */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" /> Roster
            <Badge variant="secondary">{students.length}</Badge>
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full pl-8 sm:w-40"
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-9 w-full sm:w-32">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                {students.length === 0
                  ? "No students yet — add your first name to start the draw."
                  : "No students match this search."}
              </p>
            </div>
          ) : (
            <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((s) => (
                <div
                  key={s._id}
                  className="group flex items-center justify-between rounded-lg border bg-white px-3 py-2 transition-colors hover:border-primary/20"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="truncate text-sm font-medium">
                      {s.name}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {s.className} · {s.section}
                    </Badge>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 transition-opacity hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => openEdit(s)}
                    aria-label={`Edit ${s.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit student</DialogTitle>
            <DialogDescription>
              Update the name, class or section.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-class">Class</Label>
                <Input
                  id="edit-class"
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-section">Section</Label>
                <Input
                  id="edit-section"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
                disabled={editSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
