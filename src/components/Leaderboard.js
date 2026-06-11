'use client';

// Running standings shown between rounds and at reveal (the brief's "live ranking
// visible after each question"). When `results` is provided, each player's point
// change from the round just scored is shown next to their total.
export default function Leaderboard({ players, hostId, results = null, title = 'The board' }) {
  const deltas = {};
  if (results) for (const r of results) deltas[r.playerId] = r.delta;

  const ranked = players
    .filter((p) => p.id !== hostId)
    .sort((a, b) => b.points - a.points);

  if (ranked.length === 0) return null;

  return (
    <div className="panel w-full max-w-lg p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>
      <ol className="space-y-1.5">
        {ranked.map((p, i) => {
          const delta = deltas[p.id];
          const isLeader = i === 0;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                isLeader
                  ? 'border border-gold/30 bg-gold/10'
                  : 'bg-black/30'
              }`}
            >
              <span
                className={`w-6 text-center font-mono text-sm font-bold ${
                  isLeader ? 'text-gold' : 'text-zinc-500'
                }`}
              >
                {isLeader ? '👑' : i + 1}
              </span>
              <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
              <span className="flex-1 truncate text-zinc-100">{p.name}</span>
              {delta != null && delta !== 0 && (
                <span
                  className={`font-mono text-xs font-semibold ${
                    delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
              <span
                className={`w-16 text-right font-mono font-bold ${
                  isLeader ? 'text-gold' : 'text-zinc-200'
                }`}
              >
                {p.points}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
