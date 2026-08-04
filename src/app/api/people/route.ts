import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { people } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const allPeople = await db.select().from(people).orderBy(desc(people.createdAt));
  return NextResponse.json(allPeople);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }
  const [person] = await db.insert(people).values({ name: name.trim() }).returning();
  return NextResponse.json(person, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, active } = body;
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }
  const [updated] = await db.update(people).set({ active }).where(eq(people.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }
  await db.delete(people).where(eq(people.id, id));
  return NextResponse.json({ success: true });
}
