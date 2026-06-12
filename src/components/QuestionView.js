'use client';
import { useEffect, useState } from 'react';
import OddsBoard from './OddsBoard';
import Confetti from './Confetti';

const remaining = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

// Host's booth during betting (watch the board, call the reveal) and EVERYONE's
// reveal screen (the answer slams in, then your P&L).
export default function QuestionView({
  room,
  isHost,
  isLastQuestion,
  slotNext,
  myResult,
  onReveal,
  onNext,
  onEnd,
}) {
  const revealed = room.status === 'reveal';
  const { question, odds, correctAnswer, betCount, activeCount } = room;
  const won = revealed && myResult?.won;

  const [secondsLeft, setSecondsLeft] = useState(() => remaining(room.betDeadline));
  useEffect(() => {
    if (revealed || !room.betDeadline) return;
    const tick = () => setSecondsLeft(remaining(room.betDeadline));
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [revealed, room.betDeadline]);
  const clockHot = secondsLeft <= 5;

  return (
    <div className="relative w-full max-w-lg space-y-4">
      {won && <Confetti />}

      <div className="board">
        <div className="board-hd">
          <span>
            Question {room.round}
            {room.questionCount > 0 && <span className="text-ash"> / {room.questionCount}</span>}
          </span>
          {isHost && !revealed && (
            <span className="flex items-center gap-3">
              <span className="font-mono text-ash">Locked {betCount}/{activeCount}</span>
              <span className={`led text-sm ${clockHot ? 'down' : ''}`}>⏱ {secondsLeft}</span>
            </span>
          )}
          {revealed && <span className="font-mono text-up">Result</span>}
        </div>
        <p className="headline p-4 text-2xl">{question?.text}</p>
      </div>

      <OddsBoard
        answers={question?.answers ?? []}
        odds={odds}
        revealed={revealed}
        correctAnswer={correctAnswer}
      />

      {/* Reveal slam banner */}
      {revealed && (
        <div className="slam border-2 border-up bg-up/10 px-4 py-3 text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-up">Correct answer</p>
          <p className="headline text-3xl text-up">{question?.answers[correctAnswer]}</p>
        </div>
      )}

      {/* Per-player outcome */}
      {revealed && myResult && (
        <div
          className={`slam border-2 px-4 py-3 text-center ${
            myResult.won ? 'border-up bg-up/10' : 'border-down bg-down/10'
          }`}
        >
          <p className={`headline text-2xl ${myResult.won ? 'text-up' : 'text-down'}`}>
            {myResult.won ? 'You cashed!' : 'Busted bet'}
          </p>
          <p className="mt-1 font-mono text-sm text-chalk">
            {myResult.won
              ? `${myResult.amount} @ ${myResult.oddsAtBet.toFixed(2)} → `
              : `Lost ${myResult.amount} stake → `}
            <span className={`led ${myResult.won ? 'up' : 'down'}`}>
              {myResult.delta > 0 ? `+${myResult.delta}` : myResult.delta}
            </span>
          </p>
        </div>
      )}
      {revealed && !myResult && !isHost && (
        <p className="text-center font-mono text-xs uppercase tracking-wide text-ash">
          You sat this one out.
        </p>
      )}

      {isHost && !revealed && (
        <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash">
          Auto-reveals when all are in or the clock runs out
        </p>
      )}

      {isHost ? (
        <div className="flex gap-3">
          {!revealed ? (
            <button onClick={onReveal} className="btn-slam w-full px-4 py-3.5">
              ▸ Reveal now
            </button>
          ) : isLastQuestion ? (
            <button onClick={onEnd} className="btn-slam up w-full px-4 py-3.5">
              ⚑ Final standings
            </button>
          ) : (
            <>
              <button onClick={onNext} className="btn-slam flex-1 px-4 py-3.5">
                {slotNext ? '🎰 Slot break ▸' : 'Next question ▸'}
              </button>
              <button onClick={onEnd} className="btn-slam ghost flex-1 px-4 py-3.5">
                End early
              </button>
            </>
          )}
        </div>
      ) : (
        !revealed && (
          <p className="text-center font-mono text-xs uppercase tracking-wide text-ash">
            Board is live — odds are moving…
          </p>
        )
      )}
    </div>
  );
}
