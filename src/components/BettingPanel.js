'use client';
import { useEffect, useState } from 'react';
import OddsBoard from './OddsBoard';

// Player view during betting: pick an answer, set a stake, lock it in. Bets are
// FINAL once placed. Betting closes when everyone's locked in or the 20s timer
// runs out. Odds move live as others bet (before you lock yours).
const STAKES = [100, 200, 300];

const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export default function BettingPanel({ room, points, myBet, bailedOut, onPlaceBet }) {
  const { question, odds } = room;
  const [answer, setAnswer] = useState(null);
  const [stake, setStake] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(room.betDeadline));

  useEffect(() => {
    if (!room.betDeadline) return;
    const tick = () => setSecondsLeft(remaining(room.betDeadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [room.betDeadline]);

  const locked = !!myBet;

  function place() {
    if (answer === null) return setError('Pick an answer on the board.');
    if (!stake) return setError('Drop some chips to set your stake.');
    setError('');
    setBusy(true);
    onPlaceBet({ answerId: answer, amount: stake }, (res) => {
      setBusy(false);
      if (res?.error) setError(res.error);
    });
  }

  const liveOdds = answer !== null && odds ? odds[answer] : null;
  const payout = answer !== null && stake && odds ? Math.round(stake * odds[answer]) : null;

  return (
    <div className="fade-in w-full max-w-lg space-y-5">
      {bailedOut && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-200">
          💸 You were running low — here's <span className="font-bold">+50</span> to stay in the game!
        </div>
      )}

      <div className="panel p-6">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Question {room.round}
            {room.questionCount > 0 && <span className="text-zinc-600"> / {room.questionCount}</span>}
          </p>
          <span className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">🔒 {room.betCount}/{room.activeCount} in</span>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono font-bold ${
                secondsLeft <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-zinc-300'
              }`}
            >
              ⏱ {secondsLeft}s
            </span>
          </span>
        </div>
        <p className="text-xl font-semibold text-zinc-50">{question?.text}</p>
      </div>

      <OddsBoard
        answers={question.answers}
        odds={odds}
        selected={locked ? myBet.answerId : answer}
        onSelect={locked ? undefined : setAnswer}
      />

      {/* ---- Bet slip ---- */}
      <div className="slip p-5">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-white/10 pb-3">
          <span className="text-sm font-bold uppercase tracking-widest text-gold">🎟️ Bet slip</span>
          <span className="text-xs text-zinc-400">
            Balance <span className="font-mono font-bold text-emerald-400">{points}</span> 🪙
          </span>
        </div>

        {locked ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-zinc-300">
              ✓ Locked in: <span className="font-bold text-zinc-50">{myBet.amount}</span> on “
              {question.answers[myBet.answerId]}” @{' '}
              <span className="font-mono text-emerald-400">{myBet.oddsAtBet.toFixed(2)}×</span>
            </p>
            <p className="font-mono text-3xl font-black text-gold drop-shadow-[0_0_18px_rgba(245,197,66,0.35)]">
              +{Math.round(myBet.amount * myBet.oddsAtBet)}
            </p>
            <p className="text-xs text-zinc-500">
              Bets are final. Waiting for the others — {room.betCount}/{room.activeCount} locked in.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Your pick</span>
              {answer !== null ? (
                <span className="font-semibold text-zinc-50">
                  {question.answers[answer]}{' '}
                  <span className="font-mono text-emerald-400">@ {liveOdds?.toFixed(2)}×</span>
                </span>
              ) : (
                <span className="text-zinc-600">— pick an answer above —</span>
              )}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Stake</p>
            <div className="flex items-center gap-3">
              {STAKES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={s > points}
                  data-active={stake === s}
                  onClick={() => setStake(s)}
                  className="chip h-16 w-16 text-sm"
                >
                  {s}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={points}
                value={stake !== null && !STAKES.includes(stake) ? stake : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setStake(Number.isFinite(v) ? Math.min(v, points) : null);
                }}
                placeholder="Custom"
                className="field h-16 w-20 px-2 text-center font-mono font-bold"
              />
            </div>

            <div className="mt-5 flex items-end justify-between border-t border-dashed border-white/10 pt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Potential payout
              </span>
              <span className="font-mono text-3xl font-black text-gold drop-shadow-[0_0_18px_rgba(245,197,66,0.35)]">
                {payout !== null ? `+${payout}` : '—'}
              </span>
            </div>

            {error && <p className="mt-3 text-center text-sm font-medium text-rose-400">{error}</p>}

            <button onClick={place} disabled={busy} className="btn-bet mt-4 w-full px-4 py-3 text-base">
              🔒 Lock in bet
            </button>
            <p className="mt-2 text-center text-xs text-zinc-600">Careful — bets can't be changed.</p>
          </>
        )}
      </div>
    </div>
  );
}
