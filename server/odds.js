// Dynamic live odds — pure, no Socket.io, so it can be unit-tested in isolation
// (the brief flags "odds logic too complex/unfair" as a key risk).
//
// Parimutuel-style with Laplace smoothing:
//
//   odds_A = (totalStaked + N * k) / (stakedOn_A + k)
//
// Properties this gives us, all matching the brief ("bet against the crowd to win most"):
//   - No bets yet            -> every answer sits at the baseline N (the answer count),
//                               i.e. a fair "1-in-N" payout.
//   - Money piles onto an answer -> its odds fall toward MIN (low reward for following the crowd).
//   - An answer nobody backs -> its odds rise toward MAX (big reward for the contrarian).
//   - k smooths early bets so a single stake can't spike odds to extremes.

const SMOOTHING = 100; // k — on the order of one stake, so early bets nudge rather than swing odds
const MAX_ODDS = 10;
const MIN_ODDS = 1.1;

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {number} answerCount number of answer options (N)
 * @param {Array<{answerId:number, amount:number}>} bets all bets on the current question
 * @returns {number[]} odds per answer index, rounded to 2 decimals
 */
function computeOdds(answerCount, bets) {
  const staked = new Array(answerCount).fill(0);
  let total = 0;
  for (const b of bets) {
    if (b.answerId >= 0 && b.answerId < answerCount) {
      staked[b.answerId] += b.amount;
      total += b.amount;
    }
  }
  return staked.map((s) => {
    const raw = (total + answerCount * SMOOTHING) / (s + SMOOTHING);
    return round2(Math.min(MAX_ODDS, Math.max(MIN_ODDS, raw)));
  });
}

module.exports = { computeOdds, SMOOTHING, MAX_ODDS, MIN_ODDS };
