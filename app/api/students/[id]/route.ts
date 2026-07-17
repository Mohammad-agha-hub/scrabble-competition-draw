import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await getDb();
    let _id: ObjectId;
    try {
      _id = new ObjectId(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const className = String(body?.className || "").trim();
    const section = String(body?.section || "").trim();
    if (!name || !className || !section)
      return NextResponse.json(
        { error: "Name, class and section are all required." },
        { status: 400 },
      );

    const updated = await db
      .collection("students")
      .findOneAndUpdate(
        { _id },
        { $set: { name, className, section } },
        { returnDocument: "after" },
      );
    if (!updated)
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );

    const d = updated as any;
    return NextResponse.json({
      _id: d._id.toString(),
      name: d.name,
      className: d.className,
      section: d.section,
      createdAt: d.createdAt?.toISOString?.() ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const db = await getDb();
    let _id: ObjectId;
    try {
      _id = new ObjectId(params.id);
    } catch {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }
    const res = await db.collection("students").deleteOne({ _id });
    if (res.deletedCount === 0)
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 },
      );
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
