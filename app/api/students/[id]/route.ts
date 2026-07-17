import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
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
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
