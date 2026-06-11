'use client';
import Confetti from './Confetti';

const MEDALS = ['🥇', '🥈', '🥉'];

// Final payout board when the game ends, sorted by points. The host moderates and
// isn't ranked among the competing players.
export default function Standings({ room, isHost, onPlayAgain }) {
  const ranked = room.players
    .filter((p) => p.id !== room.hostId)
    .sort((a, b) => b.points - a.points);

  const winner = ranked[0];

  return (
    <div className="fade-in relative w-full max-w-md space-y-6 text-center">
      <Confetti count={60} />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Final payout</p>
        <h1 className="mt-1 text-4xl font-black">
          <span className="wordmark">🏆 House closed</span>
        </h1>
        {winner && (
          <p className="mt-2 text-zinc-300">
            <span className="font-bold text-gold">{winner.name}</span> walks away with{' '}
            <span className="font-mono font-bold text-gold">{winner.points}</span> 🪙
          </p>
        )}
      </div>

      <ol className="space-y-2 text-left">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className={`pop-in flex items-center gap-3 rounded-xl border px-4 py-3 ${
              i === 0
                ? 'border-gold/40 bg-gold/10 shadow-[0_0_30px_rgba(245,197,66,0.25)]'
                : 'border-white/8 bg-black/30'
            }`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="w-7 text-center text-xl">{MEDALS[i] ?? <span className="font-mono text-sm text-zinc-500">{i + 1}</span>}</span>
            <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
            <span className="flex-1 truncate text-zinc-100">{p.name}</span>
            <span className={`font-mono font-bold ${i === 0 ? 'text-gold' : 'text-emerald-400'}`}>
              {p.points} 🪙
            </span>
          </li>
        ))}
      </ol>

      {isHost ? (
        <button onClick={onPlayAgain} className="btn-gold w-full px-4 py-3.5 text-base">
          🔄 Run it back
        </button>
      ) : (
        <p className="text-sm text-zinc-500">Waiting for the host to start a new game…</p>
      )}
    </div>
  );
}
