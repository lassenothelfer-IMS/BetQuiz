// Scoring — pure, no Socket.io. Odds are locked at bet time (oddsAtBet), so the
// payout never depends on how the pool moved afterwards.
//
//   correct answer -> + round(amount * oddsAtBet)
//   wrong answer   -> - amount   (you lose your stake)
//
// (Per brief: "Punkte = Einsatz × Quote bei richtiger Antwort".)

/**
 * @param {Array<{playerId:string, answerId:number, amount:number, oddsAtBet:number}>} bets
 * @param {number} correctAnswer index of the correct answer
 * @returns {Array<{playerId, answerId, amount, oddsAtBet, won, delta}>} per-bet outcome
 */
function scoreBets(bets, correctAnswer) {
  return bets.map((b) => {
    const won = b.answerId === correctAnswer;
    const delta = won ? Math.round(b.amount * b.oddsAtBet) : -b.amount;
    return {
      playerId: b.playerId,
      answerId: b.answerId,
      amount: b.amount,
      oddsAtBet: b.oddsAtBet,
      won,
      delta,
    };
  });
}

module.exports = { scoreBets };
