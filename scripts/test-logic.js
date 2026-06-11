// Pure unit tests for odds + scoring — runs without the server.
const { computeOdds, MAX_ODDS, MIN_ODDS } = require('../server/odds');
const { scoreBets } = require('../server/scoring');

let failed = 0;
const check = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

// --- odds ---
const base = computeOdds(3, []);
check(base.every((o) => o === 3), `no bets -> baseline = answer count (got ${base})`);

const lopsided = computeOdds(2, [
  { answerId: 0, amount: 300 },
  { answerId: 0, amount: 300 },
]); // everyone on answer 0
check(lopsided[0] < lopsided[1], `crowd answer has lower odds (${lopsided})`);
check(lopsided[1] > base[0] - base[0], `contrarian answer rewarded (${lopsided[1]})`);

const extreme = computeOdds(2, Array.from({ length: 50 }, () => ({ answerId: 0, amount: 300 })));
check(extreme[1] <= MAX_ODDS && extreme[0] >= MIN_ODDS, `odds stay within [${MIN_ODDS}, ${MAX_ODDS}] (${extreme})`);

// --- scoring ---
const results = scoreBets(
  [
    { playerId: 'a', answerId: 0, amount: 200, oddsAtBet: 3.5 },
    { playerId: 'b', answerId: 1, amount: 100, oddsAtBet: 2.0 },
  ],
  0, // correct = 0
);
check(results[0].won && results[0].delta === 700, `winner gains amount*odds = 700 (got ${results[0].delta})`);
check(!results[1].won && results[1].delta === -100, `loser loses stake = -100 (got ${results[1].delta})`);

console.log(failed === 0 ? '\nPASS ✅ logic tests' : `\nFAIL ❌ ${failed} test(s)`);
process.exit(failed === 0 ? 0 : 1);
