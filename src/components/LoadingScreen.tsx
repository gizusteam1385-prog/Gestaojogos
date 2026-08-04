"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  progress: number;
  status: string;
  finished: boolean;
  onFinished: () => void;
}

export default function LoadingScreen({
  progress,
  status,
  finished,
  onFinished,
}: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!finished) return;

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinished, 400);
    }, 300);

    return () => clearTimeout(fadeTimer);
  }, [finished, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-400 via-blue-400 to-cyan-400 transition-opacity ${
        fadeOut ? "animate-fade-out" : ""
      }`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6">
        <div className="animate-float">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/90 text-5xl shadow-xl shadow-blue-500/20 backdrop-blur">
            🎰
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
            Gestão de Jogos
          </h1>
          <p className="mt-1 text-base font-medium text-white/80">
            Raspadinhas & Euromilhões
          </p>
        </div>

        <div className="w-full">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/30 shadow-inner backdrop-blur">
            <div
              className="h-full rounded-full bg-white shadow-md transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <p className="text-sm font-medium text-white/80">{status}</p>
            <p className="text-sm font-bold text-white/80">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
