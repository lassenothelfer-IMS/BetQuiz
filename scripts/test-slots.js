// Pure unit tests for the multi-line slot machine — runs without the server.
const { evaluate, computeSpin } = require('../server/slots');

let failed = 0;
const check = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

// grid is [col][row]. Top row = row index 0 across the three columns.

// Three 7s on the top row -> jackpot line. lineStake = 100/5 = 20, 50× = 1000.
const jackpot = evaluate(
  [
    ['7️⃣', '🍒', '🍋'],
    ['7️⃣', '🍉', '🔔'],
    ['7️⃣', '⭐', '💎'],
  ],
  100,
);
check(jackpot.lines.length === 1 && jackpot.lines[0].symbol === '7️⃣', 'top row of 7s = one winning line');
check(jackpot.payout === 1000 && jackpot.delta === 900, `7s line pays 1000 (delta +900), got ${jackpot.delta}`);
check(jackpot.event === 'jackpot', 'event flagged as jackpot');

// WILD substitutes to complete a cherry line on the top row.
const wild = evaluate(
  [
    ['🍒', '🍉', '🍋'],
    ['🃏', '⭐', '🔔'],
    ['🍒', '💎', '🍉'],
  ],
  100,
);
check(wild.lines.some((l) => l.symbol === '🍒'), 'WILD completes a cherry line');

// Three scatters anywhere -> bonus event (scatter doesn't need to be on a line).
const scatter = evaluate(
  [
    ['💰', '💰', '💰'],
    ['🍉', '⭐', '🔔'],
    ['🍋', '💎', '🍒'],
  ],
  100,
);
check(scatter.scatterCount === 3 && scatter.scatterBonus === 400, `3 scatters pay 4× = 400, got ${scatter.scatterBonus}`);
check(scatter.event === 'scatter', 'event flagged as scatter');

// A grid with no line and <3 scatters loses the wager.
const lose = evaluate(
  [
    ['🍒', '🔔', '7️⃣'],
    ['🍋', '⭐', '🍒'],
    ['🍉', '💎', '🍋'],
  ],
  100,
);
check(lose.payout === 0 && lose.delta === -100, `no win loses the wager (-100), got ${lose.delta}`);

// computeSpin returns a valid 3x3 grid.
const spin = computeSpin(100);
check(
  spin.grid.length === 3 && spin.grid.every((c) => c.length === 3),
  'computeSpin returns a 3x3 grid',
);

console.log(failed === 0 ? '\nPASS ✅ slot tests' : `\nFAIL ❌ ${failed} test(s)`);
process.exit(failed === 0 ? 0 : 1);
