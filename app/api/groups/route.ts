import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  generateGroups,
  type Student,
  type GroupBatch,
  type Round,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Older draws were stored as a flat `groups` array (a single round). Wrap those
// into the new rounds[] shape so the app keeps working across the upgrade.
// Migrate a group from the old single-winner shape to winnerIds[].
function fixGroup(g: any) {
  if (Array.isArray(g?.winnerIds)) return g;
  const { winnerId, ...rest } = g ?? {};
  return { ...rest, winnerIds: winnerId ? [winnerId] : [] };
}

function normalize(doc: any): any {
  const base = {
    ...doc,
    _id: doc._id.toString(),
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
  };
  const rounds: Round[] = Array.isArray(doc.rounds)
    ? doc.rounds
    : [{ name: "Round 1", groupSize: doc.groupSize ?? 4, groups: doc.groups ?? [] }];
  const { groups, ...rest } = base;
  return {
    ...rest,
    rounds: rounds.map((r: any) => ({
      ...r,
      groups: (r.groups ?? []).map(fixGroup),
    })),
  };
}

// Return the most recently saved grouping (so it survives page reloads).
export async function GET() {
  try {
    const db = await getDb();
    const doc = await db
      .collection("groupBatches")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    if (!doc) return NextResponse.json(null);
    return NextResponse.json(normalize(doc));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Draw fresh groups from the current roster and persist them.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const groupSize = Math.max(2, Number(body?.groupSize) || 4);
    const scope: GroupBatch["scope"] =
      body?.scope === "class" || body?.scope === "all" ? body.scope : "class-section";

    const db = await getDb();
    const raw = (await db
      .collection("students")
      .find({})
      .toArray()) as any[];

    const students: Student[] = raw.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      className: d.className,
      section: d.section,
    }));

    if (students.length === 0)
      return NextResponse.json(
        { error: "Add some students before drawing groups." },
        { status: 400 }
      );

    const groups = generateGroups(students, groupSize, scope);
    const rounds: Round[] = [{ name: "Round 1", groupSize, groups }];
    const createdAt = new Date();
    const batch = { createdAt: createdAt.toISOString(), groupSize, scope, rounds };

    // Keep only the latest draw to avoid clutter.
    await db.collection("groupBatches").deleteMany({});
    const res = await db
      .collection("groupBatches")
      .insertOne({ createdAt, groupSize, scope, rounds });

    return NextResponse.json({ ...batch, _id: res.insertedId.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Persist results (winners/scores) and any newly-appended rounds. The client
// owns the tournament state and sends the full rounds[] to save.
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rounds = body?.rounds as GroupBatch["rounds"] | undefined;
    if (!Array.isArray(rounds))
      return NextResponse.json(
        { error: "Expected a rounds array to save." },
        { status: 400 },
      );

    const db = await getDb();
    const col = db.collection("groupBatches");
    const filter = body?._id ? { _id: new ObjectId(String(body._id)) } : {};
    const doc = body?._id
      ? await col.findOne(filter)
      : await col.find({}).sort({ createdAt: -1 }).limit(1).next();
    if (!doc)
      return NextResponse.json(
        { error: "No draw to update — draw groups first." },
        { status: 404 },
      );

    await col.updateOne({ _id: doc._id }, { $set: { rounds } });
    return NextResponse.json(normalize({ ...doc, rounds }));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const db = await getDb();
    await db.collection("groupBatches").deleteMany({});
    return NextResponse.json({ cleared: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
