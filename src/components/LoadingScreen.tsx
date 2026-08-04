"use client";

import { useState, useEffect } from "react";

interface LoadingScreenProps {
  onFinished: () => void;
}

export default function LoadingScreen({ onFinished }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("A iniciar...");
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const steps = [
      { at: 10, text: "A ligar à base de dados..." },
      { at: 30, text: "A carregar pessoas..." },
      { at: 50, text: "A carregar raspadinhas..." },
      { at: 70, text: "A carregar Euromilhões..." },
      { at: 90, text: "Quase pronto..." },
      { at: 100, text: "Tudo pronto! 🎉" },
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current > 100) current = 100;
      setProgress(current);

      const step = [...steps].reverse().find((s) => current >= s.at);
      if (step) setStatus(step.text);

      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onFinished, 400);
        }, 400);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-400 to-cyan-400 transition-opacity ${
        fadeOut ? "animate-fade-out" : ""
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-6 w-full max-w-sm">
        <div className="animate-float">
          <div className="w-24 h-24 rounded-3xl bg-white/90 backdrop-blur flex items-center justify-center text-5xl shadow-xl shadow-blue-500/20">
            🎰
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white drop-shadow-md tracking-tight">Gestão de Jogos</h1>
          <p className="text-base text-white/80 mt-1 font-medium">Raspadinhas & Euromilhões</p>
        </div>

        <div className="w-full">
          <div className="w-full h-3 rounded-full bg-white/30 backdrop-blur overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-white transition-all duration-100 ease-out shadow-md"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-white/80 font-medium">{status}</p>
            <p className="text-sm text-white/80 font-bold">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
