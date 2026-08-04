"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Transaction {
  id: number;
  description: string;
  type: string;
  amount: string;
  createdAt: string;
}

interface EuroWeek {
  id: number;
  weekNumber: number;
  year: number;
  ticketCost: string;
  prize: string;
  notes: string | null;
  createdAt: string;
}

const WEEK_COST = 25;
const AUTO_REFRESH_MS = 10000;

function getNextFriday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 7 - day + 5;
  d.setDate(d.getDate() + diff);
  return d;
}

function getFridaysUntilNow(startFriday: Date): Date[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const fridays: Date[] = [];
  const d = new Date(startFriday);
  while (d <= now) {
    fridays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return fridays;
}

function formatFriday(date: Date): string {
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

function formatFridayFull(date: Date): string {
  return date.toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export default function EuromilhoesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [weeks, setWeeks] = useState<EuroWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [editingWeekId, setEditingWeekId] = useState<number | null>(null);
  const [editPrizeValue, setEditPrizeValue] = useState("");
  const syncing = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [fundRes, weeksRes] = await Promise.all([
        fetch(`/api/euro-fund?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/euro-weeks?t=${Date.now()}`, { cache: "no-store" }),
      ]);
      const fundData = await fundRes.json();
      const weeksData = await weeksRes.json();
      setTransactions((fundData.transactions || []).filter((t: Transaction) => t.type === "deposit"));
      setTotalDeposits(fundData.summary?.totalDeposits ?? 0);
      setWeeks(weeksData.weeks || []);
    } catch (error) { console.error("Erro:", error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, AUTO_REFRESH_MS);

    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    if (loading || syncing.current) return;
    async function syncWeeks() {
      syncing.current = true;
      try {
        const totalPrize = weeks.reduce((s, w) => s + parseFloat(w.prize), 0);
        const maxAffordable = Math.floor((totalDeposits + totalPrize) / WEEK_COST);

        if (transactions.length === 0 || totalDeposits <= 0) {
          if (weeks.length > 0) {
            for (const w of weeks) {
              await fetch("/api/euro-weeks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: w.id }) });
            }
            await loadData();
          }
          return;
        }

        const earliest = transactions.reduce((min, tx) => { const d = new Date(tx.createdAt); return d < min ? d : min; }, new Date(transactions[0].createdAt));
        const startFriday = getNextFriday(earliest);
        const pastFridays = getFridaysUntilNow(startFriday);
        const shouldExist = Math.min(pastFridays.length, maxAffordable);
        const sortedExisting = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
        let changed = false;

        if (sortedExisting.length > shouldExist) {
          for (const w of sortedExisting.slice(shouldExist)) {
            await fetch("/api/euro-weeks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: w.id }) });
          }
          changed = true;
        }

        const existingNumbers = new Set(sortedExisting.map((w) => w.weekNumber));
        for (let i = 0; i < shouldExist; i++) {
          const weekNum = i + 1;
          if (!existingNumbers.has(weekNum)) {
            const friday = pastFridays[i];
            await fetch("/api/euro-weeks", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ weekNumber: weekNum, year: friday.getFullYear(), ticketCost: WEEK_COST.toFixed(2), prize: "0.00", notes: formatFridayFull(friday) }) });
            changed = true;
          }
        }
        if (changed) await loadData();
      } finally { syncing.current = false; }
    }
    syncWeeks();
  }, [loading, transactions, totalDeposits, weeks, loadData]);

  async function addMoney() {
    if (!amount || parseFloat(amount) <= 0) return;
    try {
      const today = new Date().toLocaleDateString("pt-PT");
      const res = await fetch("/api/euro-fund", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: `Saldo adicionado - ${today}`, type: "deposit", amount }) });
      if (res.ok) { setAmount(""); await loadData(); }
    } catch (error) { console.error("Erro:", error); }
  }

  async function deleteTransaction(id: number) {
    if (!confirm("Eliminar este registo? As semanas serão recalculadas.")) return;
    try {
      await fetch("/api/euro-fund", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      await loadData();
    } catch (error) { console.error("Erro:", error); }
  }

  async function savePrize(id: number) {
    try {
      await fetch("/api/euro-weeks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, prize: editPrizeValue }) });
      setEditingWeekId(null); setEditPrizeValue(""); await loadData();
    } catch (error) { console.error("Erro:", error); }
  }

  if (loading) {
    return (<div className="flex h-full items-center justify-center"><div className="text-center"><div className="mb-4 text-4xl animate-spin">⭐</div><p className="text-gray-500">A carregar...</p></div></div>);
  }

  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const totalSpent = sortedWeeks.reduce((s, w) => s + parseFloat(w.ticketCost), 0);
  const totalPrize = sortedWeeks.reduce((s, w) => s + parseFloat(w.prize), 0);
  const caixa = totalDeposits + totalPrize - totalSpent;
  const weeksRemaining = Math.floor(Math.max(0, caixa) / WEEK_COST);

  const earliestDeposit = transactions.length > 0
    ? transactions.reduce((min, tx) => { const d = new Date(tx.createdAt); return d < min ? d : min; }, new Date(transactions[0].createdAt))
    : null;
  const startFriday = earliestDeposit ? getNextFriday(earliestDeposit) : null;
  const weekFridayMap = new Map<number, Date>();
  if (startFriday) {
    const d = new Date(startFriday);
    for (let i = 1; i <= sortedWeeks.length + 20; i++) { weekFridayMap.set(i, new Date(d)); d.setDate(d.getDate() + 7); }
  }
  const now = new Date(); now.setHours(23, 59, 59, 999);
  const maxAffordable = Math.floor((totalDeposits + totalPrize) / WEEK_COST);
  const futureWeeks: { weekNumber: number; friday: Date }[] = [];
  if (startFriday) {
    for (let i = sortedWeeks.length + 1; i <= maxAffordable; i++) {
      const friday = weekFridayMap.get(i);
      if (friday && friday > now) futureWeeks.push({ weekNumber: i, friday });
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 sm:gap-3 animate-fade-in">
      {/* Adicionar saldo */}
      <div className="w-full shrink-0 rounded-xl border border-amber-200 bg-white p-2.5 sm:p-3">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <p className="whitespace-nowrap text-center text-sm font-semibold text-gray-700 sm:text-left">💵 Adicionar saldo</p>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMoney()}
            placeholder="Valor €" className="w-full rounded-lg border border-amber-300 px-3 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-amber-400 sm:flex-1 sm:py-1.5" />
          <button onClick={addMoney} className="w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-500 sm:w-auto sm:py-1.5">Adicionar</button>
        </div>
        {transactions.length > 0 && (
          <div className="mt-2 max-h-16 sm:max-h-20 space-y-1 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded bg-amber-50 px-2 py-1 text-xs">
                <span>
                  <span className="font-bold text-emerald-600">+{parseFloat(tx.amount).toFixed(2)}€</span>
                  <span className="ml-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString("pt-PT")}</span>
                </span>
                <button onClick={() => deleteTransaction(tx.id)} className="text-gray-400 hover:text-red-500 pl-2">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caixa */}
      <div className="w-full shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4 text-center">
        <p className="text-xs font-medium text-emerald-600">💰 Dinheiro em Caixa</p>
        <p className={`mt-1 text-2xl sm:text-3xl font-bold ${caixa >= 0 ? "text-emerald-700" : "text-red-500"}`}>{caixa.toFixed(2)}€</p>
        <p className="mt-1 text-[10px] sm:text-[11px] text-gray-500">{weeksRemaining} semana{weeksRemaining !== 1 ? "s" : ""} restante{weeksRemaining !== 1 ? "s" : ""} · desconta 25€ a cada sexta-feira</p>
      </div>

      {/* Semanas */}
      <div className="flex w-full flex-1 flex-col rounded-xl border border-amber-200 bg-white p-2.5 sm:p-3 min-h-0">
        <div className="mb-1.5 sm:mb-2 shrink-0 text-center">
          <p className="text-sm font-semibold text-gray-800">🗓️ Calendário de Semanas</p>
        </div>

        {sortedWeeks.length === 0 && futureWeeks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center text-center text-xs text-gray-400">Adicione saldo para ver as semanas.</p>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-amber-200">
                  <th className="w-[14%] px-1 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold uppercase text-gray-500">Sem.</th>
                  <th className="w-[22%] px-1 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold uppercase text-gray-500">Sexta</th>
                  <th className="w-[16%] px-1 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold uppercase text-gray-500">Custo</th>
                  <th className="w-[24%] px-1 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold uppercase text-gray-500">Lucro</th>
                  <th className="w-[24%] px-1 py-1.5 text-center text-[10px] sm:text-[11px] font-semibold uppercase text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedWeeks.map((week) => {
                  const friday = weekFridayMap.get(week.weekNumber);
                  const isPast = friday ? friday <= now : true;
                  const prize = parseFloat(week.prize);
                  const cost = parseFloat(week.ticketCost);
                  return (
                    <tr key={week.id} className={`text-center transition-colors ${isPast ? "bg-emerald-50/60 hover:bg-emerald-50" : "hover:bg-amber-50"}`}>
                      <td className="px-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-gray-800">{week.weekNumber}</td>
                      <td className="px-1 py-1.5 sm:py-2 text-[11px] sm:text-xs text-gray-500">{friday ? formatFriday(friday) : "-"}</td>
                      <td className="px-1 py-1.5 sm:py-2 text-xs sm:text-sm text-red-500">-{cost.toFixed(0)}€</td>
                      <td className="px-1 py-1.5 sm:py-2">
                        {editingWeekId === week.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" step="0.01" value={editPrizeValue} onChange={(e) => setEditPrizeValue(e.target.value)}
                              className="w-14 sm:w-16 rounded border border-emerald-300 px-1 py-0.5 sm:py-1 text-center text-xs sm:text-sm outline-none focus:ring-1 focus:ring-emerald-400" autoFocus
                              onKeyDown={(e) => { if (e.key === "Enter") savePrize(week.id); if (e.key === "Escape") { setEditingWeekId(null); setEditPrizeValue(""); } }} />
                            <button onClick={() => savePrize(week.id)} className="text-xs text-emerald-600 hover:text-emerald-700">✓</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingWeekId(week.id); setEditPrizeValue(prize.toString()); }} className="text-xs sm:text-sm font-medium text-emerald-600 hover:underline">
                            {prize > 0 ? `+${prize.toFixed(2)}€` : "0.00€"}
                          </button>
                        )}
                      </td>
                      <td className="px-1 py-1.5 sm:py-2">
                        {isPast
                          ? <span className="inline-block rounded-full bg-emerald-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700">✅ Paga</span>
                          : <span className="inline-block rounded-full bg-amber-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-amber-700">⏳ Agendada</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {futureWeeks.map((fw) => (
                  <tr key={`future-${fw.weekNumber}`} className="text-center text-gray-400 hover:bg-gray-50">
                    <td className="px-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold">{fw.weekNumber}</td>
                    <td className="px-1 py-1.5 sm:py-2 text-[11px] sm:text-xs">{formatFriday(fw.friday)}</td>
                    <td className="px-1 py-1.5 sm:py-2 text-xs sm:text-sm">-25€</td>
                    <td className="px-1 py-1.5 sm:py-2 text-xs sm:text-sm">-</td>
                    <td className="px-1 py-1.5 sm:py-2"><span className="inline-block rounded-full bg-gray-100 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-500">🔜 Futura</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
