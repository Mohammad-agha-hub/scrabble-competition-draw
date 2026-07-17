import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type Doc = {
  _id: any;
  name: string;
  className: string;
  section: string;
  createdAt: Date;
};

function serialize(d: Doc) {
  return {
    _id: d._id.toString(),
    name: d.name,
    className: d.className,
    section: d.section,
    createdAt: d.createdAt?.toISOString?.() ?? null,
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const docs = (await db
      .collection("students")
      .find({})
      .sort({ className: 1, section: 1, name: 1 })
      .toArray()) as unknown as Doc[];
    return NextResponse.json(docs.map(serialize));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();

    // Bulk: { students: [{name, className, section}, ...] }
    if (Array.isArray(body?.students)) {
      const rows = body.students
        .map((s: any) => ({
          name: String(s.name || "").trim(),
          className: String(s.className || "").trim(),
          section: String(s.section || "").trim(),
        }))
        .filter((s: any) => s.name && s.className && s.section)
        .map((s: any) => ({ ...s, createdAt: new Date() }));

      if (rows.length === 0)
        return NextResponse.json({ error: "No valid rows to add." }, { status: 400 });

      await db.collection("students").insertMany(rows);
      return NextResponse.json({ inserted: rows.length });
    }

    // Single
    const name = String(body?.name || "").trim();
    const className = String(body?.className || "").trim();
    const section = String(body?.section || "").trim();
    if (!name || !className || !section)
      return NextResponse.json(
        { error: "Name, class and section are all required." },
        { status: 400 }
      );

    const doc = { name, className, section, createdAt: new Date() };
    const res = await db.collection("students").insertOne(doc);
    return NextResponse.json({ _id: res.insertedId.toString(), ...doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
