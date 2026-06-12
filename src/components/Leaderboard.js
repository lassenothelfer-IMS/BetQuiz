'use client';
import RollingNumber from './RollingNumber';

// Live STANDINGS — a league table that shifts after every round. When `results`
// is supplied, each player's swing from the round just scored is shown.
export default function Leaderboard({ players, hostId, results = null, title = 'Standings' }) {
  const deltas = {};
  if (results) for (const r of results) deltas[r.playerId] = r.delta;

  const ranked = players.filter((p) => p.id !== hostId).sort((a, b) => b.points - a.points);
  if (ranked.length === 0) return null;

  return (
    <div className="board w-full max-w-lg">
      <div className="board-hd">
        <span>{title}</span>
        <span className="font-mono text-ash">Bankroll</span>
      </div>
      <div>
        {ranked.map((p, i) => {
          const delta = deltas[p.id];
          const lead = i === 0;
          return (
            <div key={p.id} className={`rank-row ${lead ? 'lead' : ''}`}>
              <span className="rank-num">{i + 1}</span>
              <span className="tile">{p.name.charAt(0).toUpperCase()}</span>
              <span className="flex-1 truncate font-semibold uppercase tracking-wide text-chalk">
                {p.name}
              </span>
              {delta != null && delta !== 0 && (
                <span className={`led text-xs ${delta > 0 ? 'up' : 'down'}`}>
                  {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                </span>
              )}
              <RollingNumber value={p.points} className={`led w-20 text-right ${lead ? '' : ''}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
