import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scratchMonths, scratchPayments, people } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET() {
  const months = await db.select().from(scratchMonths).orderBy(desc(scratchMonths.year), desc(scratchMonths.month));
  return NextResponse.json(months);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { year, month, amountPerPerson } = body;

  if (!year || !month) {
    return NextResponse.json({ error: "Ano e mês são obrigatórios" }, { status: 400 });
  }

  // Check if month already exists
  const existing = await db
    .select()
    .from(scratchMonths)
    .where(and(eq(scratchMonths.year, year), eq(scratchMonths.month, month)));

  if (existing.length > 0) {
    return NextResponse.json({ error: "Este mês já existe" }, { status: 400 });
  }

  const [newMonth] = await db
    .insert(scratchMonths)
    .values({
      year,
      month,
      amountPerPerson: amountPerPerson || "5.00",
    })
    .returning();

  // Create payment entries for all active people
  const activePeople = await db.select().from(people).where(eq(people.active, true));

  if (activePeople.length > 0) {
    await db.insert(scratchPayments).values(
      activePeople.map((person) => ({
        personId: person.id,
        monthId: newMonth.id,
        paid: false,
      }))
    );
  }

  return NextResponse.json(newMonth, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }
  await db.delete(scratchMonths).where(eq(scratchMonths.id, id));
  return NextResponse.json({ success: true });
}
