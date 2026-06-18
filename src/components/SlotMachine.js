'use client';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';
import RollingNumber from './RollingNumber';

// THE BANDIT — the between-rounds slot. A 3x3 / 5-line machine with WILDs and
// SCATTERs. Reels animate client-side but the outcome is server-authoritative
// (no client can fake a win). Same odds as before — this is a visual rebuild.
const SYMBOLS = ['🍒', '🍋', '🍉', '🔔', '⭐', '💎', '7️⃣', '🃏', '💰'];
const WAGER_CHIPS = [50, 100, 250];
const MAX_SPINS = 3;
// Display paytable (3-of-a-kind line multiplier). Mirrors server/slots.js LINE_PAY.
const PAYS = [['7️⃣', 50], ['💎', 25], ['⭐', 14], ['🔔', 9], ['🍉', 6], ['🍒', 4], ['🍋', 4]];

const randCol = () => Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

const EVENT_LABEL = { scatter: '💰 BONUS', jackpot: '🎰 JACKPOT', bigwin: '🔥 BIG WIN' };

function rarity(s) {
  if (s === '🃏') return 'r-wild';
  if (s === '💰') return 'r-scatter';
  if (s === '7️⃣') return 'r-seven';
  if (s === '💎' || s === '⭐') return 'r-high';
  return 'r-low';
}
function lineColor(s) {
  if (s === '7️⃣') return '#ff4d4d';
  if (s === '💎') return '#49d6ff';
  if (s === '⭐') return '#ffd24a';
  return '#ffb000';
}

// Big-win takeover config per event.
const EVENT_BIG = {
  jackpot: { title: 'Jackpot!', kicker: 'Lucky sevens', color: '#ff5050', ray: '#ff3b3b', dur: 3000 },
  scatter: { title: 'Bonus!', kicker: 'Scatter pays', color: '#c79bff', ray: '#b06bff', dur: 2400 },
  bigwin: { title: 'Big Win!', kicker: 'The lines stacked', color: '#ffc94d', ray: '#ffb000', dur: 2200 },
};

// Counts up from 0 to `to` on mount (for the big-win amount).
function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n.toLocaleString()}</>;
}

export default function SlotMachine({ points, deadline, spinsDone, activeCount, onSpin }) {
  const [wager, setWager] = useState(50);
  const [spinsLeft, setSpinsLeft] = useState(MAX_SPINS);
  const [spinning, setSpinning] = useState(false);
  const [grid, setGrid] = useState(() => [randCol(), randCol(), randCol()]);
  const [colCls, setColCls] = useState(['', '', '']);
  const [winCells, setWinCells] = useState(new Set());
  const [winLines, setWinLines] = useState([]);
  const [result, setResult] = useState(null);
  const [celebration, setCelebration] = useState(null); // big-win takeover
  const [error, setError] = useState('');
  const [showPays, setShowPays] = useState(false);
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
    setColCls(['spin', 'spin', 'spin']);
    intervalRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col, c) => (locked[c] ? finalGrid[c] : randCol())));
    }, 80);
    [620, 880, 1150].forEach((t, c) => {
      timeoutsRef.current.push(
        setTimeout(() => {
          locked[c] = true;
          setGrid((prev) => prev.map((col, cc) => (cc === c ? finalGrid[c] : col)));
          setColCls((prev) => prev.map((x, cc) => (cc === c ? 'land' : x)));
          timeoutsRef.current.push(
            setTimeout(() => setColCls((prev) => prev.map((x, cc) => (cc === c && x === 'land' ? '' : x))), 280),
          );
        }, t),
      );
    });
    timeoutsRef.current.push(
      setTimeout(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setGrid(finalGrid.map((col) => col.slice()));
        const cells = new Set();
        for (const l of res.lines) for (const [c, r] of l.cells) cells.add(`${c}-${r}`);
        setWinCells(cells);
        setWinLines(res.lines);
        setSpinning(false);
        setResult(res);
        setSpinsLeft(res.spinsLeft);
        if (res.event !== 'none' && res.delta > 0) {
          setCelebration(res);
          const dur = EVENT_BIG[res.event]?.dur ?? 2200;
          timeoutsRef.current.push(setTimeout(() => setCelebration(null), dur));
        }
      }, 1300),
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
    setCelebration(null);
    setWinCells(new Set());
    setWinLines([]);
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
      <div className="bandit" data-event={celebrate ? result.event : undefined}>
        {/* Marquee */}
        <div className="marquee">
          <div className="bulb-strip" />
          <h2 className="marquee-title">The Bandit</h2>
          <p className="marquee-sub">3×3 · 5 lines · wilds &amp; scatters</p>
          <div className="bulb-strip b" />
        </div>

        {/* Status strip */}
        <div className="bandit-status">
          <span className={secondsLeft <= 5 ? 'text-down' : ''}>⏱ {secondsLeft}s</span>
          <span className="flex items-center gap-1.5">
            Spins
            {Array.from({ length: MAX_SPINS }, (_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i < spinsLeft ? 'bg-board' : 'bg-steel'}`} />
            ))}
          </span>
        </div>

        {/* Reels */}
        <div className="bandit-reels">
          <div className="reels-row">
            {grid.map((col, c) => (
              <div key={c} className={`reel ${colCls[c] === 'spin' ? 'spin' : ''} ${colCls[c] === 'land' ? 'land' : ''}`}>
                {col.map((s, r) => (
                  <div key={r} className={`symtile ${rarity(s)} ${winCells.has(`${c}-${r}`) ? 'win' : ''}`}>
                    {s}
                  </div>
                ))}
              </div>
            ))}

            {/* drawn paylines */}
            {!spinning && winLines.length > 0 && (
              <svg className="payline-svg" viewBox="0 0 300 300" preserveAspectRatio="none">
                {winLines.map((line, i) => (
                  <polyline
                    key={i}
                    className="payline"
                    points={line.cells.map(([c, r]) => `${c * 100 + 50},${r * 100 + 50}`).join(' ')}
                    style={{ stroke: lineColor(line.symbol), animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </svg>
            )}
          </div>
          <div className="reel-glass" />
        </div>

        {/* Win readout */}
        <div className="px-3 pb-1 text-center">
          {result && !spinning ? (
            result.delta > 0 ? (
              <p className="slam font-mono text-sm uppercase tracking-wide">
                <span className="font-display" style={{ color: 'var(--color-board-bright)' }}>
                  {EVENT_LABEL[result.event] || 'WIN'}
                </span>{' '}
                <span className="led up text-lg">+{result.delta}</span>
                {result.scatterBonus > 0 && <span className="text-ash"> · 💰 {result.scatterBonus}</span>}
              </p>
            ) : (
              <p className="font-mono text-sm uppercase text-ash">
                No line · <span className="led down">{result.delta}</span>
              </p>
            )
          ) : (
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ash">
              Match 3 on a line · 🃏 wild pays · 3+ 💰 = bonus
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3 border-t-2 border-black bg-black/40 p-3">
          <div className="flex gap-2">
            <div className="meter">
              <p className="meter-label">Balance</p>
              <RollingNumber value={points} className="meter-val" />
            </div>
            <div className="meter">
              <p className="meter-label">Total bet</p>
              <p className="meter-val">{wager}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPays((v) => !v)}
              className="meter cursor-pointer hover:border-board"
            >
              <p className="meter-label">Pays</p>
              <p className="meter-val">{showPays ? '✕' : 'ⓘ'}</p>
            </button>
          </div>

          {showPays && (
            <div className="border-2 border-steel bg-ink p-2 font-mono text-[0.62rem] text-ash">
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {PAYS.map(([s, x]) => (
                  <div key={s} className="flex items-center justify-between">
                    <span>3× {s}</span>
                    <span className="text-board">{x}× / line</span>
                  </div>
                ))}
              </div>
              <p className="mt-1 border-t border-steel pt-1 text-[0.58rem]">
                🃏 wild completes any line · 💰 3+ anywhere = scatter bonus
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {WAGER_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={c > points || spinning}
                data-active={wager === c}
                onClick={() => setWager(c)}
                className="stake h-10 flex-1 text-sm"
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              disabled={spinning || points <= 0}
              data-active={wager === points && points > 0}
              onClick={() => setWager(points)}
              className="stake h-10 flex-1 text-sm"
            >
              MAX
            </button>
          </div>

          {error && <p className="text-center font-mono text-xs uppercase text-down">{error}</p>}

          <button
            onClick={doSpin}
            disabled={spinning || outOfSpins || secondsLeft <= 0}
            className="spin-btn w-full py-4 text-2xl"
          >
            {spinning ? '◠ Spinning ◡' : outOfSpins ? 'Out of spins' : '▼ Pull ▼'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ash">
        {outOfSpins ? `Holding for the table — ${spinsDone}/${activeCount} done` : 'Continues once everyone has spun'}
      </p>

      {/* Big-win full-screen takeover */}
      {celebration &&
        (() => {
          const cfg = EVENT_BIG[celebration.event] || EVENT_BIG.bigwin;
          return (
            <div className="bigwin-overlay" style={{ '--ray': cfg.ray }} onClick={() => setCelebration(null)}>
              <div className="bigwin-flash" />
              <div className="bigwin-rays" />
              <Confetti count={80} />
              <div className="relative z-10 px-6 text-center">
                <p className="bigwin-kicker">{cfg.kicker}</p>
                <h2 className="bigwin-title" style={{ color: cfg.color }}>
                  {cfg.title}
                </h2>
                <p className="bigwin-amount mt-1" style={{ color: cfg.color }}>
                  +<CountUp to={celebration.delta} />
                </p>
                <p className="bigwin-hint mt-5">▸ tap to continue</p>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
