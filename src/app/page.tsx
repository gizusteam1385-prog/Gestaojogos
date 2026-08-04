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

interface ScratchPayment {
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

interface EuroTransaction {
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

interface InitialData {
  people: Person[];
  scratchMonths: ScratchMonth[];
  scratchPayments: ScratchPayment[];
  scratchCaixa: {
    months: CaixaMonth[];
    initialBalance: number;
    totalCaixa: number;
  };
  euroFund: {
    transactions: EuroTransaction[];
    summary: {
      totalDeposits: number;
      totalExpenses: number;
      balance: number;
    };
  };
  euroWeeks: {
    weeks: EuroWeek[];
    summary: {
      totalCost: number;
      totalPrize: number;
      netResult: number;
    };
  };
}

const DEFAULT_INITIAL_DATA: InitialData = {
  people: [],
  scratchMonths: [],
  scratchPayments: [],
  scratchCaixa: {
    months: [],
    initialBalance: 0,
    totalCaixa: 0,
  },
  euroFund: {
    transactions: [],
    summary: {
      totalDeposits: 0,
      totalExpenses: 0,
      balance: 0,
    },
  },
  euroWeeks: {
    weeks: [],
    summary: {
      totalCost: 0,
      totalPrize: 0,
      netResult: 0,
    },
  },
};

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [preloadFinished, setPreloadFinished] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("A iniciar...");
  const [initialData, setInitialData] = useState<InitialData>(DEFAULT_INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<Tab>("raspadinhas");
  const [alert, setAlert] = useState<EuroAlert | null>(null);
  const [showAlert, setShowAlert] = useState(true);

  const preloadAllData = useCallback(async () => {
    try {
      setLoadingProgress(8);
      setLoadingStatus("A ligar à base de dados...");

      setLoadingProgress(20);
      setLoadingStatus("A carregar pessoas e meses...");
      const [peopleRes, scratchMonthsRes] = await Promise.all([
        fetch("/api/people?preload=1", { cache: "no-store" }),
        fetch("/api/scratch-months?preload=1", { cache: "no-store" }),
      ]);

      const people = await peopleRes.json();
      const scratchMonths = await scratchMonthsRes.json();

      setLoadingProgress(40);
      setLoadingStatus("A carregar caixa das raspadinhas...");
      const [scratchCaixaRes, euroFundRes, euroWeeksRes] = await Promise.all([
        fetch("/api/scratch-caixa?preload=1", { cache: "no-store" }),
        fetch("/api/euro-fund?preload=1", { cache: "no-store" }),
        fetch("/api/euro-weeks?preload=1", { cache: "no-store" }),
      ]);

      const scratchCaixa = await scratchCaixaRes.json();
      const euroFund = await euroFundRes.json();
      const euroWeeks = await euroWeeksRes.json();

      setLoadingProgress(65);
      setLoadingStatus("A carregar pagamentos das raspadinhas...");
      let scratchPayments: ScratchPayment[] = [];
      if (Array.isArray(scratchMonths) && scratchMonths.length > 0) {
        const paymentsRes = await fetch(
          `/api/scratch-payments?monthId=${scratchMonths[0].id}&preload=1`,
          { cache: "no-store" },
        );
        const paymentsData = await paymentsRes.json();
        scratchPayments = Array.isArray(paymentsData) ? paymentsData : [];
      }

      setLoadingProgress(85);
      setLoadingStatus("A preparar a aplicação...");
      setInitialData({
        people: Array.isArray(people) ? people : [],
        scratchMonths: Array.isArray(scratchMonths) ? scratchMonths : [],
        scratchPayments,
        scratchCaixa: {
          months: scratchCaixa?.months || [],
          initialBalance: scratchCaixa?.initialBalance || 0,
          totalCaixa: scratchCaixa?.totalCaixa || 0,
        },
        euroFund: {
          transactions: euroFund?.transactions || [],
          summary: euroFund?.summary || DEFAULT_INITIAL_DATA.euroFund.summary,
        },
        euroWeeks: {
          weeks: euroWeeks?.weeks || [],
          summary: euroWeeks?.summary || DEFAULT_INITIAL_DATA.euroWeeks.summary,
        },
      });

      setLoadingProgress(100);
      setLoadingStatus("Tudo pronto! 🎉");
      setPreloadFinished(true);
    } catch {
      setLoadingProgress(100);
      setLoadingStatus("Aplicação pronta.");
      setInitialData(DEFAULT_INITIAL_DATA);
      setPreloadFinished(true);
    }
  }, []);

  const checkEuroBalance = useCallback(async () => {
    try {
      const [fundRes, weeksRes] = await Promise.all([
        fetch("/api/euro-fund", { cache: "no-store" }),
        fetch("/api/euro-weeks", { cache: "no-store" }),
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
          setAlert({
            type: "warning",
            message: `Saldo insuficiente para a próxima semana (faltam ${(25 - caixa).toFixed(2)}€)`,
            caixa,
          });
        }
        setShowAlert(true);
      } else {
        setAlert(null);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    preloadAllData();
  }, [preloadAllData]);

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
    return (
      <LoadingScreen
        progress={loadingProgress}
        status={loadingStatus}
        finished={preloadFinished}
        onFinished={() => setLoaded(true)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 overflow-hidden animate-fade-in">
      {alert && showAlert && (
        <div
          className={`shrink-0 px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium ${
            alert.type === "danger" ? "bg-red-400 text-white" : "bg-amber-300 text-amber-900"
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

      <header className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-14 gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center text-lg shadow-md">
              🎰
            </div>
            <div className="text-center">
              <h1 className="text-base font-extrabold text-white leading-tight tracking-tight drop-shadow-sm">
                Gestão de Jogos
              </h1>
              <p className="text-[11px] text-white/80 leading-tight font-medium">
                Raspadinhas & Euromilhões
              </p>
            </div>
          </div>
        </div>
      </header>

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
                <span
                  className={`absolute top-2 right-2 sm:right-4 w-2.5 h-2.5 rounded-full animate-pulse ${
                    alert.type === "danger" ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 h-full">
          {activeTab === "raspadinhas" && (
            <RaspadinhasPage
              initialData={{
                people: initialData.people,
                months: initialData.scratchMonths,
                payments: initialData.scratchPayments,
                caixa: initialData.scratchCaixa,
              }}
            />
          )}
          {activeTab === "euromilhoes" && (
            <EuromilhoesPage
              initialData={{
                transactions: initialData.euroFund.transactions,
                totalDeposits: initialData.euroFund.summary.totalDeposits,
                weeks: initialData.euroWeeks.weeks,
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
