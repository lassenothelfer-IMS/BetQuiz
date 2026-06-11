// Slot-machine logic for the between-rounds break — pure, no Socket.io, so the
// odds are server-authoritative (no client can fake a win) and unit-testable.
// Three reels, classic fruit-machine paytable. No real money: it's all quiz points.

const SLOT_SECONDS = 20; // length of the slot break
const MAX_SPINS = 3; // spins each player gets per break

// Reel symbols with weights — rarer symbols pay more. Total weight 27.
const SYMBOLS = [
  { s: '🍒', w: 6 },
  { s: '🍋', w: 6 },
  { s: '🍉', w: 5 },
  { s: '🔔', w: 4 },
  { s: '⭐', w: 3 },
  { s: '💎', w: 2 },
  { s: '7️⃣', w: 1 },
];
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, x) => sum + x.w, 0);

// Multiplier (total returned on the wager) for three-of-a-kind, by symbol.
const TRIPLE = { '7️⃣': 20, '💎': 12, '⭐': 8, '🔔': 5, '🍉': 4, '🍒': 3, '🍋': 3 };
const PAIR_MULT = 1.5; // any two matching reels

const SYMBOL_LIST = SYMBOLS.map((x) => x.s);

function spinReel(rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const sym of SYMBOLS) {
    r -= sym.w;
    if (r < 0) return sym.s;
  }
  return SYMBOLS[SYMBOLS.length - 1].s;
}

// Evaluate three reels against a wager. `payout` is the total returned (0 on a
// loss); `delta` is the net change to the player's points.
function evaluate(reels, wager) {
  const [a, b, c] = reels;
  let mult = 0;
  let jackpot = false;
  if (a === b && b === c) {
    mult = TRIPLE[a] ?? 3;
    jackpot = true;
  } else if (a === b || b === c || a === c) {
    mult = PAIR_MULT;
  }
  const payout = Math.round(wager * mult);
  return { mult, payout, delta: payout - wager, jackpot };
}

function computeSpin(wager, rng = Math.random) {
  const reels = [spinReel(rng), spinReel(rng), spinReel(rng)];
  return { reels, ...evaluate(reels, wager) };
}

module.exports = {
  SLOT_SECONDS,
  MAX_SPINS,
  SYMBOL_LIST,
  TRIPLE,
  PAIR_MULT,
  computeSpin,
  evaluate,
};
