'use client';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';

// The between-rounds slot break. Players get a few spins within a 20s window,
// wagering quiz points. Reels animate client-side but the outcome is whatever
// the (authoritative) server returned — no client can fake a win.
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '⭐', '💎', '7️⃣'];
const WAGER_CHIPS = [50, 100, 250];
const MAX_SPINS = 3;

const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export default function SlotMachine({ points, deadline, onSpin }) {
  const [wager, setWager] = useState(50);
  const [spinsLeft, setSpinsLeft] = useState(MAX_SPINS);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🔔', '⭐']);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(deadline));

  const intervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  // Countdown to the end of the slot break.
  useEffect(() => {
    const tick = () => setSecondsLeft(remaining(deadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [deadline]);

  // Clean up any in-flight reel animation on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  function runReelAnimation(res) {
    const finals = res.reels;
    const locked = [null, null, null];
    intervalRef.current = setInterval(() => {
      setReels((prev) =>
        prev.map((s, i) => (locked[i] != null ? locked[i] : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])),
      );
    }, 70);
    const stops = [600, 850, 1100];
    finals.forEach((sym, i) => {
      timeoutsRef.current.push(setTimeout(() => (locked[i] = sym), stops[i]));
    });
    timeoutsRef.current.push(
      setTimeout(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setReels(finals);
        setSpinning(false);
        setResult(res);
        setSpinsLeft(res.spinsLeft);
      }, stops[2] + 150),
    );
  }

  function doSpin() {
    if (spinning) return;
    if (spinsLeft <= 0) return setError('No spins left this break.');
    const w = Math.floor(Number(wager));
    if (!w || w <= 0) return setError('Pick a wager.');
    if (w > points) return setError('Not enough points for that wager.');
    setError('');
    setResult(null);
    setSpinning(true);
    onSpin(w, (res) => {
      if (res?.error) {
        setSpinning(false);
        return setError(res.error);
      }
      runReelAnimation(res);
    });
  }

  const outOfSpins = spinsLeft <= 0;
  const jackpot = result?.jackpot && !spinning;

  return (
    <div className="fade-in relative w-full max-w-md">
      {jackpot && <Confetti count={70} />}

      <div className="slot-cabinet p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-widest text-gold">🎰 Slot break</span>
          <span
            className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${
              secondsLeft <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-white/5 text-zinc-300'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>
        </div>

        {/* Reels */}
        <div className="flex justify-center gap-3">
          {reels.map((s, i) => (
            <div
              key={i}
              className={`reel-window ${spinning ? 'spinning' : ''} ${jackpot ? 'jackpot' : ''}`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Result */}
        <div className="mt-4 h-7 text-center">
          {result &&
            !spinning &&
            (result.delta > 0 ? (
              <p className="pop-in font-black text-gold">
                {result.jackpot ? '🎉 JACKPOT! ' : '✨ Winner! '}
                <span className="font-mono">+{result.delta}</span> · {result.mult}×
              </p>
            ) : (
              <p className="font-bold text-zinc-500">
                No match · <span className="font-mono text-rose-400">{result.delta}</span>
              </p>
            ))}
        </div>

        {/* Wager */}
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-zinc-400">Wager</span>
          <span className="text-zinc-500">
            Balance <span className="font-mono font-bold text-emerald-400">{points}</span> 🪙
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {WAGER_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={c > points || spinning}
              data-active={wager === c}
              onClick={() => setWager(c)}
              className="chip h-14 w-14 text-xs"
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            disabled={spinning || points <= 0}
            data-active={wager === points && points > 0}
            onClick={() => setWager(points)}
            className="chip h-14 w-14 text-xs"
          >
            MAX
          </button>
        </div>

        {error && <p className="mt-3 text-center text-sm text-rose-400">{error}</p>}

        {/* Spins + lever */}
        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
            Spins
            {Array.from({ length: MAX_SPINS }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < spinsLeft ? 'bg-emerald-400' : 'bg-white/15'
                }`}
              />
            ))}
          </span>
          <button
            onClick={doSpin}
            disabled={spinning || outOfSpins || secondsLeft <= 0}
            className="btn-gold px-7 py-3 text-base"
          >
            {spinning ? 'Spinning…' : outOfSpins ? 'Done!' : '🎰 SPIN'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-zinc-600">
        Next question starts when the timer runs out. Just for fun — no real money!
      </p>
    </div>
  );
}
