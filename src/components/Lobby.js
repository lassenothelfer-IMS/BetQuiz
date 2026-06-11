'use client';
import { useState } from 'react';

// The pre-game table: the join code on a glowing marquee, the players seated as
// coin avatars, and (for the host) the button to deal the first question.
export default function Lobby({ room, isHost, onStart }) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(room.code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <div className="fade-in w-full max-w-md space-y-6">
      <div className="panel p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Table code</p>
        <button
          onClick={copyCode}
          title="Click to copy"
          className="mt-2 font-mono text-6xl font-black tracking-[0.25em] text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.45)] transition hover:text-emerald-300"
        >
          {room.code}
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          {copied ? '✓ Copied to clipboard' : 'Tap the code to copy & share'}
        </p>
      </div>

      <div className="panel p-6">
        <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <span>At the table</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-emerald-300">
            {room.players.length}
          </span>
        </h2>
        <ul className="space-y-2">
          {room.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2"
            >
              <span className="avatar">{p.name.charAt(0).toUpperCase()}</span>
              <span className="flex-1 text-zinc-100">{p.name}</span>
              {p.id === room.hostId && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                  🎩 Host
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button onClick={onStart} className="btn-bet w-full px-4 py-3.5 text-base">
          🃏 Build the quiz →
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-500">Waiting for the host to deal…</p>
      )}
    </div>
  );
}
