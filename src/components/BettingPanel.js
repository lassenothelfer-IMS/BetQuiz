'use client';
import { useEffect, useState } from 'react';
import OddsBoard from './OddsBoard';

// Player betting view. Pick a runner on the tote board, size the bet on the
// control deck, lock it in — and it prints a paper stub. Bets are FINAL. Betting
// closes when everyone's locked in or the 20s clock hits zero.
const STAKES = [100, 200, 300];
const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

export default function BettingPanel({ room, points, myBet, bailedOut, onPlaceBet }) {
  const { question, odds } = room;
  const [answer, setAnswer] = useState(null);
  const [stake, setStake] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(room.betDeadline));

  useEffect(() => {
    if (!room.betDeadline) return;
    const tick = () => setSecondsLeft(remaining(room.betDeadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [room.betDeadline]);

  const locked = !!myBet;

  function place() {
    if (answer === null) return setError('Pick a runner on the board.');
    if (!stake) return setError('Size your stake.');
    setError('');
    setBusy(true);
    onPlaceBet({ answerId: answer, amount: stake }, (res) => {
      setBusy(false);
      if (res?.error) setError(res.error);
    });
  }

  const liveOdds = answer !== null && odds ? odds[answer] : null;
  const payout = answer !== null && stake && odds ? Math.round(stake * odds[answer]) : null;
  const clockHot = secondsLeft <= 5;

  return (
    <div className="fade-in w-full max-w-lg space-y-4">
      {bailedOut && (
        <div className="border-2 border-board/60 bg-board/10 px-4 py-2 text-center font-mono text-xs uppercase tracking-wide text-board">
          ⛑ Short stack — staked you <b>+50</b> to keep you in the game
        </div>
      )}

      {/* Question — lower third */}
      <div className="board">
        <div className="board-hd">
          <span>
            Question {room.round}
            {room.questionCount > 0 && <span className="text-ash"> / {room.questionCount}</span>}
          </span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-ash">Locked {room.betCount}/{room.activeCount}</span>
            <span className={`led text-sm ${clockHot ? 'down' : ''}`}>⏱ {secondsLeft}</span>
          </span>
        </div>
        <p className="headline p-4 text-2xl">{question?.text}</p>
      </div>

      {/* Tote board */}
      <OddsBoard
        answers={question.answers}
        odds={odds}
        selected={locked ? myBet.answerId : answer}
        onSelect={locked ? undefined : setAnswer}
      />

      {locked ? (
        /* Printed paper stub */
        <div className="stub p-5">
          <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.2em]">
            <span className="font-bold">● BetQuiz Tote</span>
            <span>Table #{room.code}</span>
          </div>
          <div className="stub-perf my-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Selection</span>
            <span className="font-bold uppercase">{question.answers[myBet.answerId]}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="opacity-70">Stake @ Odds</span>
            <span className="font-bold">{myBet.amount} @ {myBet.oddsAtBet.toFixed(2)}</span>
          </div>
          <div className="stub-perf my-3" />
          <div className="flex items-end justify-between">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] opacity-70">To return</span>
            <span className="font-mono text-4xl font-black">{Math.round(myBet.amount * myBet.oddsAtBet)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="stamp text-sm">Placed</span>
            <span className="text-right text-[0.65rem] uppercase tracking-wide opacity-70">
              Final bet<br />
              Awaiting {room.activeCount - room.betCount} more
            </span>
          </div>
        </div>
      ) : (
        /* Control deck */
        <div className="board">
          <div className="board-hd">
            <span>Bet Slip</span>
            <span className="font-mono text-ash">
              Bankroll <span className="led text-xs">{points}</span>
            </span>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash">Selection</span>
              {answer !== null ? (
                <span className="font-semibold uppercase text-chalk">
                  {question.answers[answer]}{' '}
                  <span className="led text-sm">@ {liveOdds?.toFixed(2)}</span>
                </span>
              ) : (
                <span className="font-mono text-xs text-ash">— pick above —</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {STAKES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={s > points}
                  data-active={stake === s}
                  onClick={() => setStake(s)}
                  className="stake h-12 flex-1 text-base"
                >
                  {s}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={points}
                value={stake !== null && !STAKES.includes(stake) ? stake : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setStake(Number.isFinite(v) ? Math.min(v, points) : null);
                }}
                placeholder="ANY"
                className="input-board h-12 w-20 px-2 text-center font-bold"
              />
            </div>

            <div className="mt-4 flex items-end justify-between border-t-2 border-dashed border-steel pt-3">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash">To return</span>
              <span className="led text-3xl">{payout !== null ? payout : '—'}</span>
            </div>

            {error && <p className="mt-3 text-center font-mono text-xs uppercase text-down">{error}</p>}

            <button onClick={place} disabled={busy} className="btn-slam mt-4 w-full px-4 py-3.5">
              ▸ Lock in bet
            </button>
            <p className="mt-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ash">
              Bets are final — no take-backs
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
