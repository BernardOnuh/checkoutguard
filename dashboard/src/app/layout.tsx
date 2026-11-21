import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = { title: "CheckoutGuard", description: "Every checkout tested. Every fix verified." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen">
        <header className="border-b border-slate-800 bg-slate-950 text-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400"><ShieldCheck className="h-4.5 w-4.5" /></span>
              Checkout<span className="text-emerald-400">Guard</span>
            </Link>
            <p className="hidden text-sm text-slate-400 sm:block">Every checkout tested. Every fix verified.</p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
