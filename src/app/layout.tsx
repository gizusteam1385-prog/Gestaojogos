import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão Raspadinhas & Euromilhões",
  description: "Aplicação para gerir dinheiro de raspadinhas e Euromilhões",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-sky-50 text-gray-800 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
