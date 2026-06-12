'use client';
import Confetti from './Confetti';

const PLACE = ['1ST', '2ND', '3RD'];

// The closing scoreboard. The winner is lit up; everyone else is ranked below.
export default function Standings({ room, isHost, onPlayAgain }) {
  const ranked = room.players
    .filter((p) => p.id !== room.hostId)
    .sort((a, b) => b.points - a.points);
  const winner = ranked[0];

  return (
    <div className="fade-in relative w-full max-w-md space-y-5 text-center">
      <Confetti count={70} />

      <div>
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-ash">That&apos;s the show</p>
        <h1 className="headline mt-2 text-5xl text-board">Final Standings</h1>
        {winner && (
          <p className="mt-2 font-mono text-sm uppercase tracking-wide text-chalk">
            <span className="text-board">{winner.name}</span> takes the table —{' '}
            <span className="led">{winner.points.toLocaleString()}</span>
          </p>
        )}
      </div>

      <div className="board">
        <div className="board-hd">
          <span>Payout Board</span>
          <span className="font-mono text-ash">Final</span>
        </div>
        <div>
          {ranked.map((p, i) => (
            <div key={p.id} className={`rank-row ${i === 0 ? 'lead' : ''}`}>
              <span className="rank-num text-base">{PLACE[i] ?? i + 1}</span>
              <span className="tile">{p.name.charAt(0).toUpperCase()}</span>
              <span className="flex-1 truncate text-left font-semibold uppercase tracking-wide text-chalk">
                {p.name}
              </span>
              <span className={`led ${i === 0 ? '' : ''}`}>{p.points.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onPlayAgain} className="btn-slam w-full px-4 py-4">
          ↻ Run it back
        </button>
      ) : (
        <p className="font-mono text-xs uppercase tracking-wide text-ash">
          Waiting for the host to deal a new game…
        </p>
      )}
    </div>
  );
}
