import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "BetQuiz — The quiz with live betting odds",
  description: "Multiplayer quiz where you bet points on your answer against live odds.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-zinc-100">
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-3 backdrop-blur-sm">
          <Link href="/" className="group flex items-center gap-2 text-xl">
            <span className="transition-transform duration-300 group-hover:-rotate-12">🎲</span>
            <span className="wordmark">BetQuiz</span>
          </Link>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-widest text-emerald-300">
            <span className="live-dot" />
            Live odds
          </span>
        </header>
        {children}
      </body>
    </html>
  );
}
