import Link from "next/link";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const anton = Anton({ weight: "400", variable: "--font-anton", subsets: ["latin"] });

export const metadata = {
  title: "BetQuiz — The Trivia Betting Network",
  description: "Live trivia betting. Read the question, work the odds, bet your bankroll.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="masthead">
          <Link href="/" className="flex items-center gap-3">
            <span className="live-bug">
              <span className="dot" />
              Live
            </span>
            <span className="wordmark">
              Bet<b>Quiz</b>
            </span>
          </Link>
          <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.25em] text-ash sm:block">
            Trivia Betting Network
          </span>
        </header>
        {children}
      </body>
    </html>
  );
}
