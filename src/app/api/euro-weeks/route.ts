import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { euroWeeks } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const weeks = await db.select().from(euroWeeks).orderBy(desc(euroWeeks.year), desc(euroWeeks.weekNumber));

  // Calculate totals
  const totalsResult = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(ticket_cost), 0)`,
      totalPrize: sql<string>`COALESCE(SUM(prize), 0)`,
    })
    .from(euroWeeks);

  const totalCost = parseFloat(totalsResult[0]?.totalCost || "0");
  const totalPrize = parseFloat(totalsResult[0]?.totalPrize || "0");

  return NextResponse.json({
    weeks,
    summary: {
      totalCost,
      totalPrize,
      netResult: totalPrize - totalCost,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { weekNumber, year, ticketCost, prize, notes } = body;

  if (!weekNumber || !year) {
    return NextResponse.json({ error: "Número da semana e ano são obrigatórios" }, { status: 400 });
  }

  const [week] = await db
    .insert(euroWeeks)
    .values({
      weekNumber,
      year,
      ticketCost: ticketCost || "2.50",
      prize: prize || "0.00",
      notes: notes || null,
    })
    .returning();

  return NextResponse.json(week, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, prize, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (prize !== undefined) updateData.prize = parseFloat(prize).toFixed(2);
  if (notes !== undefined) updateData.notes = notes;

  const [updated] = await db.update(euroWeeks).set(updateData).where(eq(euroWeeks.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }
  await db.delete(euroWeeks).where(eq(euroWeeks.id, id));
  return NextResponse.json({ success: true });
}
