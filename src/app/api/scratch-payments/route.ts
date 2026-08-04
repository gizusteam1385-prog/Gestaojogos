import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scratchPayments, people, scratchMonths } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const monthId = req.nextUrl.searchParams.get("monthId");

  if (!monthId) {
    return NextResponse.json({ error: "monthId é obrigatório" }, { status: 400 });
  }

  const payments = await db
    .select({
      id: scratchPayments.id,
      personId: scratchPayments.personId,
      monthId: scratchPayments.monthId,
      paid: scratchPayments.paid,
      paidAt: scratchPayments.paidAt,
      personName: people.name,
      personActive: people.active,
    })
    .from(scratchPayments)
    .innerJoin(people, eq(scratchPayments.personId, people.id))
    .where(eq(scratchPayments.monthId, parseInt(monthId)))
    .orderBy(people.name);

  return NextResponse.json(payments);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, paid } = body;

  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }

  const [updated] = await db
    .update(scratchPayments)
    .set({
      paid,
      paidAt: paid ? new Date() : null,
    })
    .where(eq(scratchPayments.id, id))
    .returning();

  return NextResponse.json(updated);
}

// Add a person to a month
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { personId, monthId } = body;

  if (!personId || !monthId) {
    return NextResponse.json({ error: "personId e monthId são obrigatórios" }, { status: 400 });
  }

  // Check if already exists
  const existing = await db
    .select()
    .from(scratchPayments)
    .where(and(eq(scratchPayments.personId, personId), eq(scratchPayments.monthId, monthId)));

  if (existing.length > 0) {
    return NextResponse.json({ error: "Esta pessoa já está neste mês" }, { status: 400 });
  }

  const [payment] = await db
    .insert(scratchPayments)
    .values({ personId, monthId, paid: false })
    .returning();

  return NextResponse.json(payment, { status: 201 });
}
