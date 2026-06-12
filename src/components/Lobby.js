'use client';
import { useState } from 'react';

// Pre-show holding screen: the table number up in lights, the players checked in,
// and the host's call to build the card.
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
    <div className="fade-in w-full max-w-md space-y-5">
      {/* Table number */}
      <div className="board">
        <div className="board-hd">
          <span>Table No.</span>
          <span className="font-mono text-ash">{copied ? 'Copied ✓' : 'Tap to copy'}</span>
        </div>
        <button onClick={copyCode} className="block w-full px-6 py-7 text-center">
          <span className="led text-7xl tracking-[0.2em]">{room.code}</span>
        </button>
      </div>

      {/* Roster */}
      <div className="board">
        <div className="board-hd">
          <span>Checked In</span>
          <span className="led text-sm">{room.players.length}</span>
        </div>
        <div>
          {room.players.map((p, i) => (
            <div key={p.id} className="rank-row">
              <span className="rank-num">{i + 1}</span>
              <span className="tile">{p.name.charAt(0).toUpperCase()}</span>
              <span className="flex-1 truncate font-semibold uppercase tracking-wide text-chalk">
                {p.name}
              </span>
              {p.id === room.hostId && (
                <span className="border border-board px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest text-board">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button onClick={onStart} className="btn-slam w-full px-4 py-4">
          Build the card ▸
        </button>
      ) : (
        <p className="text-center font-mono text-xs uppercase tracking-[0.2em] text-ash">
          Standing by for the host…
        </p>
      )}
    </div>
  );
}
