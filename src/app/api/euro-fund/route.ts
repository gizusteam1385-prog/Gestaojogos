import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { euroFund } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  const transactions = await db.select().from(euroFund).orderBy(desc(euroFund.createdAt));

  // Calculate balance
  const balanceResult = await db
    .select({
      totalDeposits: sql<string>`COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)`,
      totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)`,
    })
    .from(euroFund);

  const deposits = parseFloat(balanceResult[0]?.totalDeposits || "0");
  const expenses = parseFloat(balanceResult[0]?.totalExpenses || "0");
  const balance = deposits - expenses;

  return NextResponse.json({
    transactions,
    summary: {
      totalDeposits: deposits,
      totalExpenses: expenses,
      balance,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { description, type, amount } = body;

  if (!description || !type || !amount) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }

  if (type !== "deposit" && type !== "expense") {
    return NextResponse.json({ error: "Tipo deve ser 'deposit' ou 'expense'" }, { status: 400 });
  }

  const [transaction] = await db
    .insert(euroFund)
    .values({
      description,
      type,
      amount: parseFloat(amount).toFixed(2),
    })
    .returning();

  return NextResponse.json(transaction, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  if (!id) {
    return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
  }
  await db.delete(euroFund).where(eq(euroFund.id, id));
  return NextResponse.json({ success: true });
}
