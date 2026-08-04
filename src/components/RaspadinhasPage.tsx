"use client";

import { useState, useEffect, useCallback } from "react";

interface Person {
  id: number;
  name: string;
  active: boolean;
}

interface ScratchMonth {
  id: number;
  year: number;
  month: number;
  amountPerPerson: string;
}

interface Payment {
  id: number;
  personId: number;
  monthId: number;
  paid: boolean;
  paidAt: string | null;
  personName: string;
  personActive: boolean;
}

interface CaixaMonth {
  id: number;
  year: number;
  month: number;
  totalCollected: number;
  halfSaved: number;
  halfPlayed: number;
  runningTotal: number;
}

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function RaspadinhasPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [months, setMonths] = useState<ScratchMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<ScratchMonth | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  const [newMonthMonth, setNewMonthMonth] = useState(new Date().getMonth() + 1);
  const [newMonthAmount, setNewMonthAmount] = useState("5.00");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"months" | "people" | "caixa">("months");

  const [caixaMonths, setCaixaMonths] = useState<CaixaMonth[]>([]);
  const [totalCaixa, setTotalCaixa] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);
  const [editingInitial, setEditingInitial] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState("");
  const [editingPlayedId, setEditingPlayedId] = useState<number | null>(null);
  const [editPlayedValue, setEditPlayedValue] = useState("");

  const loadPayments = useCallback(async (monthId: number) => {
    const res = await fetch(`/api/scratch-payments?monthId=${monthId}`);
    const data = await res.json();
    setPayments(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedMonth) loadPayments(selectedMonth.id); }, [selectedMonth, loadPayments]);
  useEffect(() => { if (tab === "caixa") loadCaixa(); }, [tab]);

  async function loadData() {
    try {
      const [peopleRes, monthsRes] = await Promise.all([fetch("/api/people"), fetch("/api/scratch-months")]);
      const peopleData = await peopleRes.json();
      const monthsData = await monthsRes.json();
      setPeople(Array.isArray(peopleData) ? peopleData : []);
      setMonths(Array.isArray(monthsData) ? monthsData : []);
      if (monthsData.length > 0 && !selectedMonth) setSelectedMonth(monthsData[0]);
    } catch (error) { console.error("Erro:", error); }
    finally { setLoading(false); }
  }

  async function loadCaixa() {
    try {
      const res = await fetch("/api/scratch-caixa");
      const data = await res.json();
      setCaixaMonths(data.months || []);
      setTotalCaixa(data.totalCaixa || 0);
      setInitialBalance(data.initialBalance || 0);
      setEditInitialValue((data.initialBalance || 0).toString());
    } catch (error) { console.error("Erro:", error); }
  }

  async function saveInitialBalance() {
    try {
      await fetch("/api/scratch-caixa", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialBalance: editInitialValue }) });
      setEditingInitial(false);
      loadCaixa();
    } catch (error) { console.error("Erro:", error); }
  }

  async function savePlayedAmount(id: number) {
    try {
      await fetch("/api/scratch-caixa", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, playedAmount: editPlayedValue }) });
      setEditingPlayedId(null);
      setEditPlayedValue("");
      loadCaixa();
    } catch (error) { console.error("Erro:", error); }
  }

  async function addPerson() {
    if (!newPersonName.trim()) return;
    try {
      const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPersonName.trim() }) });
      if (res.ok) { setNewPersonName(""); setShowAddPerson(false); loadData(); }
    } catch (error) { console.error("Erro:", error); }
  }

  async function togglePersonActive(person: Person) {
    try {
      await fetch("/api/people", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: person.id, active: !person.active }) });
      loadData();
    } catch (error) { console.error("Erro:", error); }
  }

  async function deletePerson(id: number) {
    if (!confirm("Tem a certeza que quer eliminar esta pessoa?")) return;
    try {
      await fetch("/api/people", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      loadData();
    } catch (error) { console.error("Erro:", error); }
  }

  async function addMonth() {
    try {
      const res = await fetch("/api/scratch-months", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: newMonthYear, month: newMonthMonth, amountPerPerson: newMonthAmount }) });
      if (res.ok) { const m = await res.json(); setShowAddMonth(false); await loadData(); setSelectedMonth(m); }
      else { const err = await res.json(); alert(err.error || "Erro ao criar mês"); }
    } catch (error) { console.error("Erro:", error); }
  }

  async function deleteMonth(id: number) {
    if (!confirm("Eliminar este mês e todos os pagamentos?")) return;
    try {
      await fetch("/api/scratch-months", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (selectedMonth?.id === id) { setSelectedMonth(null); setPayments([]); }
      loadData();
    } catch (error) { console.error("Erro:", error); }
  }

  async function togglePayment(payment: Payment) {
    try {
      await fetch("/api/scratch-payments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: payment.id, paid: !payment.paid }) });
      if (selectedMonth) loadPayments(selectedMonth.id);
    } catch (error) { console.error("Erro:", error); }
  }

  async function addPersonToMonth(personId: number) {
    if (!selectedMonth) return;
    try {
      const res = await fetch("/api/scratch-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personId, monthId: selectedMonth.id }) });
      if (res.ok) loadPayments(selectedMonth.id);
      else { const err = await res.json(); alert(err.error || "Erro"); }
    } catch (error) { console.error("Erro:", error); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎫</div>
          <p className="text-gray-500">A carregar...</p>
        </div>
      </div>
    );
  }

  const paidCount = payments.filter((p) => p.paid).length;
  const totalAmount = selectedMonth ? payments.length * parseFloat(selectedMonth.amountPerPerson) : 0;
  const paidAmount = selectedMonth ? paidCount * parseFloat(selectedMonth.amountPerPerson) : 0;
  const paymentPersonIds = payments.map((p) => p.personId);
  const availablePeople = people.filter((p) => p.active && !paymentPersonIds.includes(p.id));

  return (
    <div className="flex flex-col h-full animate-fade-in gap-3">
      {/* Sub-tabs */}
      <div className="flex gap-2 w-full shrink-0">
        {(["people", "months", "caixa"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-sky-500 text-white shadow-md"
                : "bg-white text-gray-600 border border-sky-200 hover:bg-sky-50"
            }`}
          >
            {t === "people" ? "👥 Pessoas" : t === "months" ? "📅 Meses" : "💰 Caixa"}
          </button>
        ))}
      </div>

      {/* CAIXA */}
      {tab === "caixa" && (
        <div className="flex-1 flex flex-col min-h-0 gap-3">
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <div className="bg-sky-50 rounded-xl p-3 border border-sky-200 text-center flex flex-col justify-center">
              <p className="text-xs font-medium text-sky-600">💵 Já existe em caixa</p>
              {editingInitial ? (
                <div className="flex items-center gap-2 mt-1 justify-center">
                  <input type="number" step="0.01" value={editInitialValue} onChange={(e) => setEditInitialValue(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg border border-sky-300 text-sm font-bold text-center focus:ring-2 focus:ring-sky-400 outline-none" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveInitialBalance(); if (e.key === "Escape") setEditingInitial(false); }} />
                  <button onClick={saveInitialBalance} className="bg-sky-500 hover:bg-sky-600 text-white px-2.5 py-1 rounded-lg text-xs font-medium">✓</button>
                  <button onClick={() => setEditingInitial(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-medium">✕</button>
                </div>
              ) : (
                <button onClick={() => { setEditingInitial(true); setEditInitialValue(initialBalance.toString()); }} className="text-xl font-bold text-sky-700 hover:underline mt-1">
                  {initialBalance.toFixed(2)}€
                </button>
              )}
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-center flex flex-col justify-center">
              <p className="text-xs font-medium text-emerald-600">💰 Total em Caixa</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{totalCaixa.toFixed(2)}€</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-sky-200 p-3">
            {caixaMonths.length === 0 ? (
              <p className="text-center text-gray-400 flex-1 flex items-center justify-center text-sm">Crie meses e registe pagamentos para ver a caixa.</p>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-sky-200">
                      <th className="w-[18%] text-center text-[11px] font-semibold text-gray-500 uppercase py-2 px-1">Mês</th>
                      <th className="w-[21%] text-center text-[11px] font-semibold text-gray-500 uppercase py-2 px-1">Cobrado</th>
                      <th className="w-[21%] text-center text-[11px] font-semibold text-gray-500 uppercase py-2 px-1">Guard.</th>
                      <th className="w-[21%] text-center text-[11px] font-semibold text-gray-500 uppercase py-2 px-1">Jogado</th>
                      <th className="w-[19%] text-center text-[11px] font-semibold text-gray-500 uppercase py-2 px-1">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {caixaMonths.map((m) => (
                      <tr key={m.id} className="hover:bg-sky-50 transition-colors text-center">
                        <td className="py-2 px-1 text-xs sm:text-sm font-medium text-gray-800">{MONTH_NAMES[m.month].slice(0, 3)} <span className="text-gray-400">{m.year}</span></td>
                        <td className="py-2 px-1 text-xs sm:text-sm text-gray-700">{m.totalCollected.toFixed(2)}€</td>
                        <td className="py-2 px-1 text-xs sm:text-sm text-sky-600 font-medium">{m.halfSaved.toFixed(2)}€</td>
                        <td className="py-2 px-1">
                          {editingPlayedId === m.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input type="number" step="0.01" value={editPlayedValue} onChange={(e) => setEditPlayedValue(e.target.value)}
                                className="w-16 sm:w-20 px-1.5 py-1 rounded border border-red-300 text-xs sm:text-sm text-center focus:ring-1 focus:ring-red-400 outline-none" autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") savePlayedAmount(m.id); if (e.key === "Escape") { setEditingPlayedId(null); setEditPlayedValue(""); } }} />
                              <button onClick={() => savePlayedAmount(m.id)} className="text-emerald-600 hover:text-emerald-700 text-xs">✓</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingPlayedId(m.id); setEditPlayedValue(m.halfPlayed.toFixed(2)); }} className="text-xs sm:text-sm text-red-500 hover:underline font-medium">
                              {m.halfPlayed.toFixed(2)}€
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-1">
                          <span className="text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{m.runningTotal.toFixed(2)}€</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PEOPLE */}
      {tab === "people" && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-sky-200 p-4">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-base font-semibold text-gray-800">Gerir Pessoas</h3>
            <button onClick={() => setShowAddPerson(!showAddPerson)} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Adicionar</button>
          </div>

          {showAddPerson && (
            <div className="mb-3 p-3 bg-sky-50 rounded-lg border border-sky-200 animate-fade-in shrink-0">
              <div className="flex gap-2">
                <input type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPerson()}
                  placeholder="Nome da pessoa" className="flex-1 px-3 py-1.5 rounded-lg border border-sky-300 focus:ring-2 focus:ring-sky-400 outline-none text-sm" autoFocus />
                <button onClick={addPerson} className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium">Guardar</button>
                <button onClick={() => { setShowAddPerson(false); setNewPersonName(""); }} className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium">✕</button>
              </div>
            </div>
          )}

          {people.length === 0 ? (
            <p className="text-center text-gray-400 py-8 flex-1 flex items-center justify-center">Ainda não existem pessoas.</p>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
              {people.map((person) => (
                <div key={person.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${person.active ? "bg-white border-gray-200 hover:border-sky-300" : "bg-gray-50 border-gray-200 opacity-60"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${person.active ? "bg-sky-500" : "bg-gray-400"}`}>
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{person.name}</p>
                      <p className={`text-xs ${person.active ? "text-emerald-600" : "text-gray-400"}`}>{person.active ? "Ativo" : "Inativo"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => togglePersonActive(person)} className={`px-2 py-1 rounded-lg text-xs font-medium ${person.active ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
                      {person.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => deletePerson(person.id)} className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MONTHS */}
      {tab === "months" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
          <div className="lg:w-1/3 flex flex-col bg-white rounded-xl border border-sky-200 p-4 min-h-0 shrink-0 lg:shrink lg:max-h-full max-h-[48%]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-base font-semibold text-gray-800">Meses</h3>
              <button onClick={() => setShowAddMonth(!showAddMonth)} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">+ Novo</button>
            </div>

            {showAddMonth && (
              <div className="mb-3 p-2.5 bg-sky-50 rounded-lg border border-sky-200 animate-fade-in shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Mês</label>
                    <select value={newMonthMonth} onChange={(e) => setNewMonthMonth(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-sky-300 text-sm focus:ring-2 focus:ring-sky-400 outline-none">
                      {MONTH_NAMES.slice(1).map((name, i) => (<option key={i + 1} value={i + 1}>{name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Ano</label>
                    <input type="number" value={newMonthYear} onChange={(e) => setNewMonthYear(parseInt(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg border border-sky-300 text-sm focus:ring-2 focus:ring-sky-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">€/pessoa</label>
                    <input type="number" step="0.50" value={newMonthAmount} onChange={(e) => setNewMonthAmount(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-sky-300 text-sm focus:ring-2 focus:ring-sky-400 outline-none" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex gap-2">
                    <button onClick={addMonth} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium">Criar</button>
                    <button onClick={() => setShowAddMonth(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium">✕</button>
                  </div>
                </div>
              </div>
            )}

            {months.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 flex-1 flex items-center justify-center">Nenhum mês criado</p>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
                {months.map((month) => (
                  <div key={month.id} className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${selectedMonth?.id === month.id ? "bg-sky-100 border-sky-300" : "bg-gray-50 border-transparent hover:bg-sky-50"}`}
                    onClick={() => setSelectedMonth(month)}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{MONTH_NAMES[month.month]} {month.year}</p>
                      <p className="text-xs text-gray-500">{month.amountPerPerson}€/pessoa</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteMonth(month.id); }} className="text-gray-400 hover:text-red-500 text-sm">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:flex-1 flex flex-col bg-white rounded-xl border border-sky-200 p-4 min-h-0 flex-1">
            {selectedMonth ? (
              <>
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">{MONTH_NAMES[selectedMonth.month]} {selectedMonth.year}</h3>
                    <p className="text-xs text-gray-500">{selectedMonth.amountPerPerson}€/pessoa</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total recebido</p>
                    <p className="text-lg font-bold text-emerald-600">{paidAmount.toFixed(2)}€ / {totalAmount.toFixed(2)}€</p>
                  </div>
                </div>

                <div className="mb-3 shrink-0">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-sky-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${payments.length > 0 ? (paidCount / payments.length) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 text-right">{paidCount} de {payments.length} pagaram</p>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
                  {payments.map((payment) => (
                    <div key={payment.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${payment.paid ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 hover:border-red-300"}`}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => togglePayment(payment)} className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${payment.paid ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400 hover:bg-red-200"}`}>
                          {payment.paid ? "✓" : ""}
                        </button>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{payment.personName}</p>
                          <p className="text-xs text-gray-400">{payment.paid ? `Pago${payment.paidAt ? ` em ${new Date(payment.paidAt).toLocaleDateString("pt-PT")}` : ""}` : "Pendente"}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${payment.paid ? "text-emerald-600" : "text-red-500"}`}>{selectedMonth.amountPerPerson}€</span>
                    </div>
                  ))}
                </div>

                {availablePeople.length > 0 && (
                  <div className="border-t border-gray-200 pt-2 mt-2 shrink-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">Adicionar pessoa:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availablePeople.map((person) => (
                        <button key={person.id} onClick={() => addPersonToMonth(person.id)} className="bg-sky-100 hover:bg-sky-200 text-sky-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                          + {person.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-gray-400 text-sm">Selecione um mês</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
