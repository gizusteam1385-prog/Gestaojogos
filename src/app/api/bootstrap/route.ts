import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  people,
  scratchMonths,
  scratchPayments,
  scratchCaixaInitial,
  euroFund,
  euroWeeks,
} from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const allPeople = await db.select().from(people).orderBy(desc(people.createdAt));

  const allScratchMonths = await db
    .select()
    .from(scratchMonths)
    .orderBy(desc(scratchMonths.year), desc(scratchMonths.month));

  const latestMonth = allScratchMonths[0] ?? null;

  const latestMonthPayments = latestMonth
    ? await db
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
        .where(eq(scratchPayments.monthId, latestMonth.id))
        .orderBy(people.name)
    : [];

  const initialRows = await db.select().from(scratchCaixaInitial);
  const initialBalance = initialRows.length > 0 ? parseFloat(initialRows[0].amount) : 0;

  const caixaMonthsDb = await db
    .select()
    .from(scratchMonths)
    .orderBy(asc(scratchMonths.year), asc(scratchMonths.month));

  const caixaMonths = [] as Array<{
    id: number;
    year: number;
    month: number;
    totalCollected: number;
    halfSaved: number;
    halfPlayed: number;
    runningTotal: number;
  }>;

  let runningTotal = initialBalance;

  for (const month of caixaMonthsDb) {
    const paidPeople = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(scratchPayments)
      .where(sql`${scratchPayments.monthId} = ${month.id} AND ${scratchPayments.paid} = true`);

    const totalPaid = paidPeople[0]?.count ?? 0;
    const amountPerPerson = parseFloat(month.amountPerPerson);
    const totalCollected = totalPaid * amountPerPerson;
    const savedAmount = totalCollected / 2;
    const defaultPlayed = totalCollected / 2;
    const rawPlayed = month.playedAmount === null ? defaultPlayed : parseFloat(month.playedAmount);
    const playedAmount = Math.min(Math.max(rawPlayed, 0), totalCollected);

    runningTotal += savedAmount + playedAmount;

    caixaMonths.push({
      id: month.id,
      year: month.year,
      month: month.month,
      totalCollected,
      halfSaved: savedAmount,
      halfPlayed: playedAmount,
      runningTotal,
    });
  }

  const euroTransactions = await db.select().from(euroFund).orderBy(desc(euroFund.createdAt));
  const euroWeeksRows = await db.select().from(euroWeeks).orderBy(desc(euroWeeks.year), desc(euroWeeks.weekNumber));

  const euroBalanceResult = await db
    .select({
      totalDeposits: sql<string>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)`,
      totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
    })
    .from(euroFund);

  const deposits = parseFloat(euroBalanceResult[0]?.totalDeposits || "0");
  const expenses = parseFloat(euroBalanceResult[0]?.totalExpenses || "0");

  const euroWeeksTotals = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(ticket_cost), 0)`,
      totalPrize: sql<string>`COALESCE(SUM(prize), 0)`,
    })
    .from(euroWeeks);

  const totalCost = parseFloat(euroWeeksTotals[0]?.totalCost || "0");
  const totalPrize = parseFloat(euroWeeksTotals[0]?.totalPrize || "0");

  return NextResponse.json({
    people: allPeople,
    scratchMonths: allScratchMonths,
    scratchPayments: latestMonthPayments,
    scratchCaixa: {
      months: caixaMonths,
      initialBalance,
      totalCaixa: runningTotal,
    },
    euroFund: {
      transactions: euroTransactions,
      summary: {
        totalDeposits: deposits,
        totalExpenses: expenses,
        balance: deposits - expenses,
      },
    },
    euroWeeks: {
      weeks: euroWeeksRows,
      summary: {
        totalCost,
        totalPrize,
        netResult: totalPrize - totalCost,
      },
    },
  });
}
