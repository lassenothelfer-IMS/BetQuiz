'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { rememberName } from '@/lib/session';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function createRoom() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter your name to take a seat.');
    setError('');
    setBusy(true);
    getSocket().emit('room:create', { name: trimmed }, (res) => {
      setBusy(false);
      if (res?.error) return setError(res.error);
      rememberName(trimmed);
      router.push(`/room/${res.code}`);
    });
  }

  function joinRoom() {
    const trimmed = name.trim();
    const roomCode = code.trim().toUpperCase();
    if (!trimmed) return setError('Enter your name to take a seat.');
    if (!roomCode) return setError('Enter a table code to join.');
    setError('');
    rememberName(trimmed);
    router.push(`/room/${roomCode}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-6">
      <header className="fade-in text-center">
        <h1 className="text-6xl font-black tracking-tighter sm:text-7xl">
          <span className="wordmark">BetQuiz</span>
        </h1>
        <p className="mt-3 text-lg text-zinc-300">
          Know the answer. <span className="text-emerald-400">Beat the odds.</span> Own the board.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          The quiz where the smart money bets against the crowd.
        </p>
      </header>

      <div className="fade-in panel w-full max-w-sm space-y-5 p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Player name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={20}
            className="field w-full px-3 py-2.5"
          />
        </label>

        <button
          onClick={createRoom}
          disabled={busy}
          className="btn-bet w-full px-4 py-3 text-base"
        >
          🎲 Create a table
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-600">
          <span className="h-px flex-1 bg-white/10" /> or buy in <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={4}
            className="field w-28 px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em]"
          />
          <button onClick={joinRoom} className="btn-ghost flex-1 px-4 py-2.5">
            Join table
          </button>
        </div>

        {error && <p className="text-sm font-medium text-rose-400">{error}</p>}
      </div>

      <p className="fade-in flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-600">
        <span>🪙 No real money</span>
        <span>⚡ No sign-up</span>
        <span>👥 Play with friends</span>
      </p>
    </main>
  );
}
