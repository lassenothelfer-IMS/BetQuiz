'use client';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';

// The between-rounds SLOT BREAK: a 3x3 grid with 5 paylines, WILD + SCATTER and
// bonus events. Reels animate client-side; the outcome is server-authoritative.
// The break ends once everyone's used their 3 spins (timer is a fallback).
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '⭐', '💎', '7️⃣', '🃏', '💰'];
const WAGER_CHIPS = [50, 100, 250];
const MAX_SPINS = 3;
const randCol = () => Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

const EVENT_LABEL = { scatter: '💰 BONUS', jackpot: '🎰 JACKPOT 777', bigwin: '🔥 BIG WIN' };

export default function SlotMachine({ points, deadline, spinsDone, activeCount, onSpin }) {
  const [wager, setWager] = useState(50);
  const [spinsLeft, setSpinsLeft] = useState(MAX_SPINS);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState(() => [randCol(), randCol(), randCol()]);
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

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  function runReelAnimation(res) {
    const finalGrid = res.grid;
    const locked = [false, false, false];
    intervalRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col, c) => (locked[c] ? finalGrid[c] : randCol())));
    }, 80);
    [600, 850, 1100].forEach((t, c) => timeoutsRef.current.push(setTimeout(() => (locked[c] = true), t)));
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
    if (spinsLeft <= 0) return setError('No spins left.');
    const w = Math.floor(Number(wager));
    if (!w || w <= 0) return setError('Pick a wager.');
    if (w > points) return setError('Not enough for that wager.');
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

      <div className="board">
        <div className="board-hd">
          <span>🎰 Slot Break</span>
          <span className={`led text-sm ${secondsLeft <= 5 ? 'down' : ''}`}>⏱ {secondsLeft}</span>
        </div>

        <div className="p-4">
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

          {/* Win readout */}
          <div className="mt-3 flex min-h-[2.5rem] items-center justify-center text-center">
            {result && !spinning ? (
              result.delta > 0 ? (
                <p className="slam font-mono text-sm uppercase tracking-wide">
                  <span className="led">{EVENT_LABEL[result.event] || 'WIN'} </span>
                  <span className="led up">+{result.delta}</span>
                  {result.scatterBonus > 0 && <span className="text-ash"> · 💰 {result.scatterBonus}</span>}
                </p>
              ) : (
                <p className="font-mono text-sm uppercase text-ash">
                  No line · <span className="led down">{result.delta}</span>
                </p>
              )
            ) : (
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ash">
                5 lines · 🃏 wild · 💰 scatter
              </p>
            )}
          </div>

          {/* Wager */}
          <div className="mb-2 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash">
            <span>Wager</span>
            <span>Bankroll <span className="led">{points}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {WAGER_CHIPS.map((cAmt) => (
              <button
                key={cAmt}
                type="button"
                disabled={cAmt > points || spinning}
                data-active={wager === cAmt}
                onClick={() => setWager(cAmt)}
                className="stake h-11 flex-1 text-sm"
              >
                {cAmt}
              </button>
            ))}
            <button
              type="button"
              disabled={spinning || points <= 0}
              data-active={wager === points && points > 0}
              onClick={() => setWager(points)}
              className="stake h-11 flex-1 text-sm"
            >
              MAX
            </button>
          </div>

          {error && <p className="mt-3 text-center font-mono text-xs uppercase text-down">{error}</p>}

          <div className="mt-4 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest text-ash">
              Spins
              {Array.from({ length: MAX_SPINS }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 ${i < spinsLeft ? 'bg-up' : 'bg-steel'}`} />
              ))}
            </span>
            <button onClick={doSpin} disabled={spinning || outOfSpins || secondsLeft <= 0} className="btn-slam px-7 py-3">
              {spinning ? 'Spinning…' : outOfSpins ? 'Done' : '▸ Spin'}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ash">
        {outOfSpins ? `Holding for the table — ${spinsDone}/${activeCount} done` : 'Continues once everyone has spun'}
      </p>
    </div>
  );
}
