'use client';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';

// Between-rounds slot break: a 3x3 grid with 5 paylines, WILD + SCATTER, and
// bonus events. Reels animate client-side but the outcome is whatever the
// (authoritative) server returned — no client can fake a win. The break ends
// once everyone has used their 3 spins (the timer is just a fallback).
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '⭐', '💎', '7️⃣', '🃏', '💰'];
const WAGER_CHIPS = [50, 100, 250];
const MAX_SPINS = 3;

const randSym = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const randCol = () => [randSym(), randSym(), randSym()];
const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

const EVENT_LABEL = {
  scatter: '💰 BONUS ROUND!',
  jackpot: '🎰 JACKPOT — 777!',
  bigwin: '🔥 BIG WIN!',
};

export default function SlotMachine({ points, deadline, spinsDone, activeCount, onSpin }) {
  const [wager, setWager] = useState(50);
  const [spinsLeft, setSpinsLeft] = useState(MAX_SPINS);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState(() => [randCol(), randCol(), randCol()]); // [col][row]
  const [winCells, setWinCells] = useState(new Set());
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(deadline));

  const intervalRef = useRef(null);
  const timeoutsRef = useRef([]);

  useEffect(() => {
    const tick = () => setSecondsLeft(remaining(deadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [deadline]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  function runReelAnimation(res) {
    const finalGrid = res.grid;
    const locked = [false, false, false];
    intervalRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col, c) => (locked[c] ? finalGrid[c] : randCol())));
    }, 80);
    [600, 850, 1100].forEach((t, c) => {
      timeoutsRef.current.push(setTimeout(() => (locked[c] = true), t));
    });
    timeoutsRef.current.push(
      setTimeout(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGrid(finalGrid.map((col) => col.slice()));
        const cells = new Set();
        for (const line of res.lines) for (const [c, r] of line.cells) cells.add(`${c}-${r}`);
        setWinCells(cells);
        setSpinning(false);
        setResult(res);
        setSpinsLeft(res.spinsLeft);
      }, 1250),
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
    setWinCells(new Set());
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
  const celebrate = result && !spinning && result.event !== 'none';

  return (
    <div className="fade-in relative w-full max-w-md">
      {celebrate && <Confetti count={80} />}

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

        {/* 3x3 grid */}
        <div className="slot-grid">
          {grid.map((col, c) => (
            <div key={c} className={`slot-col ${spinning ? 'spinning' : ''}`}>
              {col.map((s, r) => (
                <div key={r} className={`slot-cell ${winCells.has(`${c}-${r}`) ? 'win' : ''}`}>
                  {s}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Result */}
        <div className="mt-3 min-h-[2.75rem] text-center">
          {result && !spinning ? (
            result.delta > 0 ? (
              <div className="pop-in">
                <p className="font-black text-gold">
                  {EVENT_LABEL[result.event] || '✨ Winner!'}{' '}
                  <span className="font-mono">+{result.delta}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  {result.lines.length > 0 &&
                    `${result.lines.length} line${result.lines.length === 1 ? '' : 's'}`}
                  {result.scatterBonus > 0 && ` · 💰 scatter +${result.scatterBonus}`}
                </p>
              </div>
            ) : (
              <p className="pt-2 font-bold text-zinc-500">
                No win · <span className="font-mono text-rose-400">{result.delta}</span>
              </p>
            )
          ) : (
            <p className="pt-2 text-xs text-zinc-600">5 paylines · 🃏 wild · 💰 scatter pays</p>
          )}
        </div>

        {/* Wager */}
        <div className="mt-1 flex items-center justify-between text-sm">
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

        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
            Spins
            {Array.from({ length: MAX_SPINS }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i < spinsLeft ? 'bg-emerald-400' : 'bg-white/15'}`}
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
        {outOfSpins
          ? `Waiting for the others… (${spinsDone}/${activeCount} done)`
          : 'Continues once everyone has spun. Just for fun — no real money!'}
      </p>
    </div>
  );
}
