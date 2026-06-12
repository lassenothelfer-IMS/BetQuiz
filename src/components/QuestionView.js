'use client';
import { useEffect, useState } from 'react';
import OddsBoard from './OddsBoard';
import Confetti from './Confetti';

const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

// Shown to the HOST during betting (watch live odds + reveal control) and to
// EVERYONE at reveal (correct answer highlighted + per-player result banner).
export default function QuestionView({
  room,
  isHost,
  isLastQuestion,
  slotNext,
  myResult,
  onReveal,
  onNext,
  onEnd,
}) {
  const revealed = room.status === 'reveal';
  const { question, odds, correctAnswer, betCount, activeCount } = room;
  const won = revealed && myResult?.won;

  const [secondsLeft, setSecondsLeft] = useState(() => remaining(room.betDeadline));
  useEffect(() => {
    if (revealed || !room.betDeadline) return;
    const tick = () => setSecondsLeft(remaining(room.betDeadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [revealed, room.betDeadline]);

  return (
    <div className="relative w-full max-w-lg space-y-5">
      {won && <Confetti />}

      <div className="panel p-6">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Question {room.round}
            {room.questionCount > 0 && <span className="text-zinc-600"> / {room.questionCount}</span>}
          </p>
          {isHost && !revealed && (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">🔒 {betCount}/{activeCount} in</span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-mono font-bold ${
                  secondsLeft <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-zinc-300'
                }`}
              >
                ⏱ {secondsLeft}s
              </span>
            </span>
          )}
        </div>
        <p className="text-xl font-semibold text-zinc-50">{question?.text}</p>
      </div>

      <OddsBoard
        answers={question?.answers ?? []}
        odds={odds}
        revealed={revealed}
        correctAnswer={correctAnswer}
      />

      {/* Per-player outcome at reveal */}
      {revealed && myResult && (
        <div
          className={`pop-in rounded-2xl border p-4 text-center ${
            myResult.won
              ? 'border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
              : 'border-rose-500/40 bg-rose-500/10'
          }`}
        >
          <p className={`text-lg font-black ${myResult.won ? 'text-emerald-300' : 'text-rose-300'}`}>
            {myResult.won ? '🎉 You cashed out!' : '💸 Tough luck'}
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            {myResult.won
              ? `${myResult.amount} @ ${myResult.oddsAtBet.toFixed(2)}× → `
              : `Lost your ${myResult.amount} stake → `}
            <span
              className={`font-mono font-bold ${myResult.won ? 'text-emerald-400' : 'text-rose-400'}`}
            >
              {myResult.delta > 0 ? `+${myResult.delta}` : myResult.delta} pts
            </span>
          </p>
        </div>
      )}
      {revealed && !myResult && !isHost && (
        <p className="text-center text-sm text-zinc-500">You sat this one out. 🍿</p>
      )}

      {/* Host gets live betting progress */}
      {isHost && !revealed && (
        <p className="text-center text-sm text-zinc-500">
          Auto-reveals when everyone's locked in or the timer ends — odds move live as players bet.
        </p>
      )}

      {isHost ? (
        <div className="flex gap-3">
          {!revealed ? (
            <button onClick={onReveal} className="btn-bet w-full px-4 py-3.5 text-base">
              🔔 Reveal now
            </button>
          ) : isLastQuestion ? (
            <button onClick={onEnd} className="btn-bet w-full px-4 py-3.5 text-base">
              🏁 Finish game
            </button>
          ) : (
            <>
              <button onClick={onNext} className="btn-bet flex-1 px-4 py-3.5">
                {slotNext ? '🎰 Slot break →' : 'Next question →'}
              </button>
              <button onClick={onEnd} className="btn-ghost flex-1 px-4 py-3.5">
                End early
              </button>
            </>
          )}
        </div>
      ) : (
        !revealed && (
          <p className="text-center text-sm text-zinc-500">Betting is open — odds are moving…</p>
        )
      )}
    </div>
  );
}
