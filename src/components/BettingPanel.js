'use client';
import { useState } from 'react';
import OddsBoard from './OddsBoard';

// Player view during the betting phase: pick an answer on the board, drop chips
// to set a stake, and the bet slip tallies your potential payout. Odds move live
// as others bet; re-betting is allowed until the host reveals.
const STAKES = [100, 200, 300];

export default function BettingPanel({ room, points, myBet, onPlaceBet }) {
  const { question, odds } = room;
  const [answer, setAnswer] = useState(myBet ? myBet.answerId : null);
  const [stake, setStake] = useState(myBet ? myBet.amount : null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      <div className="panel p-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Question {room.round}
        </p>
        <p className="text-xl font-semibold text-zinc-50">{question?.text}</p>
      </div>

      <OddsBoard answers={question.answers} odds={odds} selected={answer} onSelect={setAnswer} />

      {/* ---- Bet slip ---- */}
      <div className="slip p-5">
        <div className="mb-4 flex items-center justify-between border-b border-dashed border-white/10 pb-3">
          <span className="text-sm font-bold uppercase tracking-widest text-gold">🎟️ Bet slip</span>
          <span className="text-xs text-zinc-400">
            Balance <span className="font-mono font-bold text-emerald-400">{points}</span> 🪙
          </span>
        </div>

        {/* selection summary */}
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

        {/* chips */}
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

        {/* payout */}
        <div className="mt-5 flex items-end justify-between border-t border-dashed border-white/10 pt-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Potential payout
          </span>
          <span className="font-mono text-3xl font-black text-gold drop-shadow-[0_0_18px_rgba(245,197,66,0.35)]">
            {payout !== null ? `+${payout}` : '—'}
          </span>
        </div>

        {error && <p className="mt-3 text-center text-sm font-medium text-rose-400">{error}</p>}

        <button
          onClick={place}
          disabled={busy}
          className="btn-bet mt-4 w-full px-4 py-3 text-base"
        >
          {myBet ? 'Change bet' : 'Place bet'}
        </button>

        {myBet && (
          <p className="mt-3 text-center text-xs text-emerald-400">
            ✓ Locked in: <span className="font-bold">{myBet.amount}</span> on “
            {question.answers[myBet.answerId]}” @ {myBet.oddsAtBet.toFixed(2)}× → payout{' '}
            <span className="font-mono font-bold">{Math.round(myBet.amount * myBet.oddsAtBet)}</span>
            <br />
            <span className="text-zinc-500">Change it any time before the reveal.</span>
          </p>
        )}
      </div>
    </div>
  );
}
