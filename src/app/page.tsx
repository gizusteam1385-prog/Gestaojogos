"use client";

import { useState, useEffect, useCallback } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import RaspadinhasPage from "@/components/RaspadinhasPage";
import EuromilhoesPage from "@/components/EuromilhoesPage";

type Tab = "raspadinhas" | "euromilhoes";

interface EuroAlert {
  type: "danger" | "warning";
  message: string;
  caixa: number;
}

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("raspadinhas");
  const [alert, setAlert] = useState<EuroAlert | null>(null);
  const [showAlert, setShowAlert] = useState(true);

  const checkEuroBalance = useCallback(async () => {
    try {
      const [fundRes, weeksRes] = await Promise.all([
        fetch("/api/euro-fund"),
        fetch("/api/euro-weeks"),
      ]);
      const fundData = await fundRes.json();
      const weeksData = await weeksRes.json();
      const totalDeposits = fundData.summary?.totalDeposits ?? 0;
      const weeks = weeksData.weeks || [];
      const totalSpent = weeks.reduce((s: number, w: { ticketCost: string }) => s + parseFloat(w.ticketCost), 0);
      const totalPrize = weeks.reduce((s: number, w: { prize: string }) => s + parseFloat(w.prize), 0);
      const caixa = totalDeposits + totalPrize - totalSpent;

      if (caixa < 25) {
        if (caixa <= 0) {
          setAlert({ type: "danger", message: "Sem dinheiro para jogar esta semana!", caixa });
        } else {
          setAlert({ type: "warning", message: `Saldo insuficiente para a próxima semana (faltam ${(25 - caixa).toFixed(2)}€)`, caixa });
        }
        setShowAlert(true);
      } else {
        setAlert(null);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (loaded) {
      checkEuroBalance();
      const interval = setInterval(checkEuroBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [loaded, checkEuroBalance]);

  useEffect(() => {
    if (loaded) checkEuroBalance();
  }, [activeTab, loaded, checkEuroBalance]);

  if (!loaded) {
    return <LoadingScreen onFinished={() => setLoaded(true)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 overflow-hidden animate-fade-in">
      {/* Alert */}
      {alert && showAlert && (
        <div
          className={`shrink-0 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium ${
            alert.type === "danger"
              ? "bg-red-400 text-white"
              : "bg-amber-300 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2 justify-center flex-1">
            <span className="text-base">{alert.type === "danger" ? "🚨" : "⚠️"}</span>
            <span className="text-xs sm:text-sm">{alert.message}</span>
            <span className="font-bold text-xs sm:text-sm ml-1">({alert.caixa.toFixed(2)}€)</span>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold bg-black/10 hover:bg-black/20 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-14 gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center text-lg shadow-md">
              🎰
            </div>
            <div className="text-center">
              <h1 className="text-base font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">Gestão de Jogos</h1>
              <p className="text-[11px] text-white/80 leading-tight font-medium">Raspadinhas & Euromilhões</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white/80 backdrop-blur border-b border-sky-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("raspadinhas")}
              className={`flex-1 px-6 py-3 text-sm font-bold border-b-3 transition-all ${
                activeTab === "raspadinhas"
                  ? "border-sky-500 text-sky-600 bg-sky-50/50"
                  : "border-transparent text-gray-400 hover:text-sky-500 hover:bg-sky-50/30"
              }`}
            >
              <span className="mr-2">🎫</span> Raspadinhas
            </button>
            <button
              onClick={() => setActiveTab("euromilhoes")}
              className={`flex-1 px-6 py-3 text-sm font-bold border-b-3 transition-all relative ${
                activeTab === "euromilhoes"
                  ? "border-amber-400 text-amber-600 bg-amber-50/50"
                  : "border-transparent text-gray-400 hover:text-amber-500 hover:bg-amber-50/30"
              }`}
            >
              <span className="mr-2">⭐</span> Euromilhões
              {alert && (
                <span className={`absolute top-2 right-2 sm:right-4 w-2.5 h-2.5 rounded-full animate-pulse ${
                  alert.type === "danger" ? "bg-red-400" : "bg-amber-400"
                }`} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 h-full">
          {activeTab === "raspadinhas" && <RaspadinhasPage />}
          {activeTab === "euromilhoes" && <EuromilhoesPage />}
        </div>
      </main>
    </div>
  );
}
