import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scratchMonths, scratchPayments, scratchCaixaInitial } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getInitialBalance(): Promise<number> {
  const rows = await db.select().from(scratchCaixaInitial);
  if (rows.length === 0) return 0;
  return parseFloat(rows[0].amount);
}

function clampCurrency(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET() {
  const initialBalance = await getInitialBalance();

  const months = await db
    .select()
    .from(scratchMonths)
    .orderBy(asc(scratchMonths.year), asc(scratchMonths.month));

  const result = [];
  let runningTotal = initialBalance;

  for (const month of months) {
    const paidPeople = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(scratchPayments)
      .where(sql`${scratchPayments.monthId} = ${month.id} AND ${scratchPayments.paid} = true`);

    const totalPaid = paidPeople[0]?.count ?? 0;
    const amountPerPerson = parseFloat(month.amountPerPerson);
    const totalCollected = totalPaid * amountPerPerson;
    const savedAmount = totalCollected / 2;
    const defaultPlayed = 0;
    const rawPlayed = month.playedAmount === null ? defaultPlayed : parseFloat(month.playedAmount);
    const playedAmount = clampCurrency(rawPlayed, 0, totalCollected);

    if (playedAmount > 0) {
      runningTotal += savedAmount + playedAmount;
    }

    result.push({
      id: month.id,
      year: month.year,
      month: month.month,
      totalCollected,
      halfSaved: savedAmount,
      halfPlayed: playedAmount,
      runningTotal,
    });
  }

  return NextResponse.json({
    months: result,
    initialBalance,
    totalCaixa: runningTotal,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { initialBalance, id, playedAmount } = body;

  if (initialBalance !== undefined) {
    const parsedInitial = parseMoney(initialBalance);

    if (parsedInitial === null) {
      return NextResponse.json({ error: "Valor inicial inválido" }, { status: 400 });
    }

    const amount = parsedInitial.toFixed(2);
    await db.delete(scratchCaixaInitial);
    const [row] = await db.insert(scratchCaixaInitial).values({ amount }).returning();
    return NextResponse.json(row);
  }

  if (!id || playedAmount === undefined) {
    return NextResponse.json({ error: "ID e valor jogado são obrigatórios" }, { status: 400 });
  }

  const monthRows = await db.select().from(scratchMonths).where(eq(scratchMonths.id, id));
  const month = monthRows[0];

  if (!month) {
    return NextResponse.json({ error: "Mês não encontrado" }, { status: 404 });
  }

  const parsedPlayed = parseMoney(playedAmount);

  if (parsedPlayed === null) {
    return NextResponse.json({ error: "Valor jogado inválido" }, { status: 400 });
  }

  const paidPeople = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(scratchPayments)
    .where(sql`${scratchPayments.monthId} = ${id} AND ${scratchPayments.paid} = true`);

  const totalPaid = paidPeople[0]?.count ?? 0;
  const totalCollected = totalPaid * parseFloat(month.amountPerPerson);
  const sanitizedPlayed = clampCurrency(parsedPlayed, 0, totalCollected).toFixed(2);

  const [updated] = await db
    .update(scratchMonths)
    .set({ playedAmount: sanitizedPlayed })
    .where(eq(scratchMonths.id, id))
    .returning();

  return NextResponse.json(updated);
}
