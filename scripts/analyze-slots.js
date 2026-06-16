// Monte-Carlo analysis of the current slot paytable. Standalone (no server).
const { computeSpin } = require('../server/slots');

const N = Number(process.argv[2]) || 1_500_000;
const wager = 100;
let wins = 0;
let totalPayout = 0;
let jackpot = 0;
let scatter = 0;
let bigwin = 0;
let lineHits = 0;

for (let i = 0; i < N; i++) {
  const r = computeSpin(wager);
  if (r.payout > 0) wins++;
  totalPayout += r.payout;
  lineHits += r.lines.length;
  if (r.event === 'jackpot') jackpot++;
  else if (r.event === 'scatter') scatter++;
  else if (r.event === 'bigwin') bigwin++;
}

const pct = (x) => (x * 100).toFixed(2);
console.log(`Simulated ${N.toLocaleString()} spins at wager ${wager}\n`);
console.log(`P(win)  any payout > 0 .......... ${pct(wins / N)}%`);
console.log(`RTP     return to player ........ ${pct(totalPayout / (N * wager))}%`);
console.log(`        house edge .............. ${pct(1 - totalPayout / (N * wager))}%`);
console.log(`avg lines hit per spin .......... ${(lineHits / N).toFixed(3)}`);
console.log(`\nevent rates:`);
console.log(`  jackpot (777 line) ............ ${pct(jackpot / N)}%`);
console.log(`  scatter (💰 bonus) ............. ${pct(scatter / N)}%`);
console.log(`  big win (>=3x wager) .......... ${pct(bigwin / N)}%`);
