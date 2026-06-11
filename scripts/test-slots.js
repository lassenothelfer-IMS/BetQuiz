// Pure unit tests for the slot machine — runs without the server.
const { computeSpin, evaluate, TRIPLE, PAIR_MULT } = require('../server/slots');

let failed = 0;
const check = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

// Deterministic evaluate() checks
check(evaluate(['7️⃣', '7️⃣', '7️⃣'], 100).delta === 100 * TRIPLE['7️⃣'] - 100, 'triple 7s pays 20× net (+1900 on 100)');
check(evaluate(['🍒', '🍒', '🍒'], 100).delta === 100 * 3 - 100, 'triple cherries pays 3× (+200 on 100)');
check(evaluate(['🍒', '🍒', '🔔'], 100).delta === Math.round(100 * PAIR_MULT) - 100, 'pair pays 1.5× (+50 on 100)');
check(evaluate(['🍒', '🍋', '🔔'], 100).delta === -100, 'no match loses the wager (-100)');
check(evaluate(['🍒', '🍒', '🍒'], 100).jackpot === true, 'triple flagged as jackpot');
check(evaluate(['🍒', '🍒', '🔔'], 100).jackpot === false, 'pair not a jackpot');

// computeSpin returns 3 valid reels and a sane delta over many trials
let minDelta = Infinity;
let maxDelta = -Infinity;
for (let i = 0; i < 5000; i++) {
  const r = computeSpin(100);
  if (r.reels.length !== 3) { failed++; break; }
  minDelta = Math.min(minDelta, r.delta);
  maxDelta = Math.max(maxDelta, r.delta);
}
check(minDelta === -100, `worst case loses exactly the wager (got ${minDelta})`);
check(maxDelta === 1900, `best case is the 20× jackpot net (got ${maxDelta})`);

console.log(failed === 0 ? '\nPASS ✅ slot tests' : `\nFAIL ❌ ${failed} test(s)`);
process.exit(failed === 0 ? 0 : 1);
