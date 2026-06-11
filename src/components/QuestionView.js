'use client';
import OddsBoard from './OddsBoard';
import Confetti from './Confetti';

// Shown to the HOST during betting (watch live odds + reveal control) and to
// EVERYONE at reveal (correct answer highlighted + per-player result banner).
export default function QuestionView({ room, isHost, isLastQuestion, myResult, onReveal, onNext, onEnd }) {
  const revealed = room.status === 'reveal';
  const { question, odds, correctAnswer, betCount } = room;
  const won = revealed && myResult?.won;

  return (
    <div className="relative w-full max-w-lg space-y-5">
      {won && <Confetti />}

      <div className="panel p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Question {room.round}
        </p>
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

      {/* Host gets the live bet count during betting */}
      {isHost && !revealed && (
        <p className="text-center text-sm text-zinc-500">
          🪙 {betCount} bet{betCount === 1 ? '' : 's'} on the table — odds update live as players bet.
        </p>
      )}

      {isHost ? (
        <div className="flex gap-3">
          {!revealed ? (
            <button onClick={onReveal} className="btn-bet w-full px-4 py-3.5 text-base">
              🔔 Reveal answer
            </button>
          ) : isLastQuestion ? (
            <button onClick={onEnd} className="btn-bet w-full px-4 py-3.5 text-base">
              🏁 Finish game
            </button>
          ) : (
            <>
              <button onClick={onNext} className="btn-bet flex-1 px-4 py-3.5">
                🎰 Slot break →
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
