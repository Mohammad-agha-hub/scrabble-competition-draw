import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { generateGroups, type Student, type GroupBatch } from "@/lib/types";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({
      ...doc,
      _id: doc._id.toString(),
      createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    });
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
    const createdAt = new Date();
    const batch = { createdAt: createdAt.toISOString(), groupSize, scope, groups };

    // Keep only the latest draw to avoid clutter.
    await db.collection("groupBatches").deleteMany({});
    const res = await db
      .collection("groupBatches")
      .insertOne({ createdAt, groupSize, scope, groups });

    return NextResponse.json({ ...batch, _id: res.insertedId.toString() });
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
