import { NextResponse } from "next/server";
import { supabaseRestGet } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

interface PersonRow {
  id: number;
  name: string;
  active: boolean;
  created_at: string;
}

interface ScratchMonthRow {
  id: number;
  year: number;
  month: number;
  amount_per_person: string;
  existing_funds: string;
  winnings: string;
  played_amount: string | null;
  created_at: string;
}

interface ScratchPaymentRow {
  id: number;
  person_id: number;
  month_id: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

interface ScratchCaixaInitialRow {
  id: number;
  amount: string;
}

interface EuroFundRow {
  id: number;
  description: string;
  type: string;
  amount: string;
  created_at: string;
}

interface EuroWeekRow {
  id: number;
  week_number: number;
  year: number;
  ticket_cost: string;
  prize: string;
  notes: string | null;
  created_at: string;
}

export async function GET() {
  try {
    const [peopleRows, scratchMonthRows, scratchPaymentRows, scratchCaixaRows, euroFundRows, euroWeekRows] =
      await Promise.all([
        supabaseRestGet<PersonRow[]>("people", "select=*&order=created_at.desc"),
        supabaseRestGet<ScratchMonthRow[]>("scratch_months", "select=*&order=year.desc,month.desc"),
        supabaseRestGet<ScratchPaymentRow[]>("scratch_payments", "select=*"),
        supabaseRestGet<ScratchCaixaInitialRow[]>("scratch_caixa_initial", "select=*&limit=1"),
        supabaseRestGet<EuroFundRow[]>("euro_fund", "select=*&order=created_at.desc"),
        supabaseRestGet<EuroWeekRow[]>("euro_weeks", "select=*&order=year.desc,week_number.desc"),
      ]);

    const people = peopleRows.map((person) => ({
      id: person.id,
      name: person.name,
      active: person.active,
      createdAt: person.created_at,
    }));

    const scratchMonths = scratchMonthRows.map((month) => ({
      id: month.id,
      year: month.year,
      month: month.month,
      amountPerPerson: month.amount_per_person,
      existingFunds: month.existing_funds,
      winnings: month.winnings,
      playedAmount: month.played_amount,
      createdAt: month.created_at,
    }));

    const latestMonth = scratchMonths[0] ?? null;
    const latestMonthPayments = latestMonth
      ? scratchPaymentRows
          .filter((payment) => payment.month_id === latestMonth.id)
          .map((payment) => {
            const person = peopleRows.find((item) => item.id === payment.person_id);
            return {
              id: payment.id,
              personId: payment.person_id,
              monthId: payment.month_id,
              paid: payment.paid,
              paidAt: payment.paid_at,
              personName: person?.name ?? "Pessoa",
              personActive: person?.active ?? true,
            };
          })
          .sort((a, b) => a.personName.localeCompare(b.personName, "pt"))
      : [];

    const initialBalance = scratchCaixaRows.length > 0 ? parseFloat(scratchCaixaRows[0].amount) : 0;

    const paidCountsByMonth = new Map<number, number>();
    for (const payment of scratchPaymentRows) {
      if (payment.paid) {
        paidCountsByMonth.set(payment.month_id, (paidCountsByMonth.get(payment.month_id) ?? 0) + 1);
      }
    }

    const caixaMonthsChronological = [...scratchMonths]
      .sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

    let runningTotal = initialBalance;
    const caixaMonths = caixaMonthsChronological.map((month) => {
      const totalPaid = paidCountsByMonth.get(month.id) ?? 0;
      const amountPerPerson = parseFloat(month.amountPerPerson);
      const totalCollected = totalPaid * amountPerPerson;
      const halfSaved = totalCollected / 2;
      const halfPlayed = month.playedAmount === null ? 0 : Math.min(Math.max(parseFloat(month.playedAmount), 0), totalCollected);

      if (halfPlayed > 0) {
        runningTotal += halfSaved + halfPlayed;
      }

      return {
        id: month.id,
        year: month.year,
        month: month.month,
        totalCollected,
        halfSaved,
        halfPlayed,
        runningTotal,
      };
    });

    const euroTransactions = euroFundRows.map((row) => ({
      id: row.id,
      description: row.description,
      type: row.type,
      amount: row.amount,
      createdAt: row.created_at,
    }));

    const totalDeposits = euroFundRows
      .filter((row) => row.type === "deposit")
      .reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalExpenses = euroFundRows
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + parseFloat(row.amount), 0);

    const euroWeeks = euroWeekRows.map((row) => ({
      id: row.id,
      weekNumber: row.week_number,
      year: row.year,
      ticketCost: row.ticket_cost,
      prize: row.prize,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    const totalCost = euroWeekRows.reduce((sum, row) => sum + parseFloat(row.ticket_cost), 0);
    const totalPrize = euroWeekRows.reduce((sum, row) => sum + parseFloat(row.prize), 0);

    return NextResponse.json({
      people,
      scratchMonths,
      scratchPayments: latestMonthPayments,
      scratchCaixa: {
        months: caixaMonths,
        initialBalance,
        totalCaixa: runningTotal,
      },
      euroFund: {
        transactions: euroTransactions,
        summary: {
          totalDeposits,
          totalExpenses,
          balance: totalDeposits - totalExpenses,
        },
      },
      euroWeeks: {
        weeks: euroWeeks,
        summary: {
          totalCost,
          totalPrize,
          netResult: totalPrize - totalCost,
        },
      },
    });
  } catch (error) {
    console.error("Bootstrap REST error:", error);
    return NextResponse.json({ error: "Falha ao carregar dados iniciais" }, { status: 500 });
  }
}
