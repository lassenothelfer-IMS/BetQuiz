// Multi-line slot machine — pure, no Socket.io, server-authoritative & testable.
// A 3x3 grid (3 reels × 3 rows) with 5 paylines, WILD substitution, SCATTER
// bonus events, and per-line payouts. No real money: it's all quiz points.

const SLOT_SECONDS = 40; // fallback cap; the break really ends once everyone has spun
const MAX_SPINS = 3;
const MIN_WAGER = 50;
const COLS = 3;
const ROWS = 3;

const WILD = '🃏';
const SCATTER = '💰';

// Reel symbols with weights. WILD substitutes on lines; SCATTER pays by count.
const SYMBOLS = [
  { s: '🍒', w: 6 },
  { s: '🍋', w: 6 },
  { s: '🍉', w: 8 },
  { s: '🔔', w: 10 },
  { s: '⭐', w: 11 },
  { s: '💎', w: 23 },
  { s: '7️⃣', w: 13 },
  { s: WILD, w: 4 },
  { s: SCATTER, w: 14 },
];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, x) => sum + x.w, 0);
const SYMBOL_LIST = SYMBOLS.map((x) => x.s);

// Per-line payout = (wager / 5) × multiplier, so a single low line ≈ break-even
// on that line and big symbols / multiple lines pay out properly.
const LINE_PAY = { '7️⃣': 50, '💎': 25, '⭐': 14, '🔔': 9, '🍉': 6, '🍒': 4, '🍋': 4 };

// Scatter (💰) anywhere on the grid: 3+ triggers a bonus paid on the whole wager.
const SCATTER_PAY = { 3: 4, 4: 10, 5: 25, 6: 60 };

// Each payline is 3 cells given as [col, row]. 3 rows + 2 diagonals.
const LINES = [
  [[0, 0], [1, 0], [2, 0]],
  [[0, 1], [1, 1], [2, 1]],
  [[0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 1], [2, 2]],
  [[0, 2], [1, 1], [2, 0]],
];

function spinCell(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.w;
    if (r < 0) return sym.s;
  }
  return SYMBOLS[0].s;
}

// grid[col][row]
function spinGrid(rng) {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => spinCell(rng)));
}

// The winning symbol on a line, accounting for WILD substitution. SCATTER never
// forms a line. Returns the symbol string or null for no win.
function lineSymbol(cells) {
  if (cells.includes(SCATTER)) return null;
  const nonWild = cells.filter((s) => s !== WILD);
  if (nonWild.length === 0) return '7️⃣'; // all wilds = top jackpot line
  const first = nonWild[0];
  return nonWild.every((s) => s === first) ? first : null;
}

function evaluate(grid, wager) {
  const lineStake = wager / LINES.length;
  const lines = [];
  let payout = 0;
  let jackpot = false;

  LINES.forEach((cells, index) => {
    const symbols = cells.map(([c, r]) => grid[c][r]);
    const sym = lineSymbol(symbols);
    if (!sym) return;
    const amount = Math.round(lineStake * (LINE_PAY[sym] || 0));
    if (amount <= 0) return;
    if (sym === '7️⃣') jackpot = true;
    payout += amount;
    lines.push({ index, cells, symbol: sym, amount });
  });

  // Scatter bonus (count anywhere)
  let scatterCount = 0;
  for (const col of grid) for (const s of col) if (s === SCATTER) scatterCount += 1;
  const scatterMult = SCATTER_PAY[Math.min(scatterCount, 6)] || 0;
  const scatterBonus = scatterCount >= 3 ? Math.round(wager * scatterMult) : 0;
  payout += scatterBonus;

  let event = 'none';
  if (scatterBonus > 0) event = 'scatter';
  else if (jackpot) event = 'jackpot';
  else if (payout >= wager * 3) event = 'bigwin';

  return {
    grid,
    lines,
    scatterCount,
    scatterBonus,
    payout,
    delta: payout - wager,
    event,
    win: payout > 0,
  };
}

function computeSpin(wager, rng = Math.random) {
  return evaluate(spinGrid(rng), wager);
}

module.exports = {
  SLOT_SECONDS,
  MAX_SPINS,
  MIN_WAGER,
  COLS,
  ROWS,
  WILD,
  SCATTER,
  SYMBOL_LIST,
  LINES,
  LINE_PAY,
  computeSpin,
  evaluate,
};
