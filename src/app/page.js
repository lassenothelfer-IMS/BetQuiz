'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useSocketStatus } from '@/lib/useSocketStatus';
import { rememberName } from '@/lib/session';
import Ticker from '@/components/Ticker';

export default function Home() {
  const router = useRouter();
  const status = useSocketStatus();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function createRoom() {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter your handle first.');
    setError('');
    setBusy(true);
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      setBusy(false);
      setError("Can't reach the network. If it's on a free host it may be waking up — wait ~30s and retry.");
    }, 10000);
    getSocket().emit('room:create', { name: trimmed }, (res) => {
      done = true;
      clearTimeout(timer);
      setBusy(false);
      if (res?.error) return setError(res.error);
      rememberName(trimmed);
      router.push(`/room/${res.code}`);
    });
  }

  function joinRoom() {
    const trimmed = name.trim();
    const roomCode = code.trim().toUpperCase();
    if (!trimmed) return setError('Enter your handle first.');
    if (!roomCode) return setError('Enter a table number.');
    setError('');
    rememberName(trimmed);
    router.push(`/room/${roomCode}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-5 py-10">
        {/* Title card */}
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-[0.45em] text-board">Now broadcasting</p>
          <h1 className="headline mt-3 text-7xl sm:text-8xl">
            Bet<span className="text-board">Quiz</span>
          </h1>
          <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ash">
            <span className="h-px flex-1 bg-steel" />
            Read it · price it · bet it
            <span className="h-px flex-1 bg-steel" />
          </div>
        </div>

        {status === 'offline' && (
          <div className="w-full max-w-md border-2 border-down/60 bg-down/10 px-4 py-3 text-center font-mono text-xs uppercase tracking-wide text-down">
            ⚠ Network unreachable — a free host may be waking up (~30–50s). It reconnects automatically.
          </div>
        )}

        {/* Control deck */}
        <div className="board w-full max-w-md">
          <div className="board-hd">
            <span>Player Check-in</span>
            <span className="font-mono text-ash">No account</span>
          </div>
          <div className="space-y-5 p-5">
            <label className="block">
              <span className="mb-1.5 block font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ash">
                Your handle
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ACE"
                maxLength={20}
                className="input-board w-full px-3 py-2.5 text-lg uppercase tracking-wide"
              />
            </label>

            <button onClick={createRoom} disabled={busy} className="btn-slam w-full px-4 py-3.5">
              ▸ Open a table
            </button>

            <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.25em] text-ash">
              <span className="h-px flex-1 bg-steel" /> or sit in <span className="h-px flex-1 bg-steel" />
            </div>

            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TABLE"
                maxLength={4}
                className="input-board w-32 px-3 py-2.5 text-center text-xl tracking-[0.3em]"
              />
              <button onClick={joinRoom} className="btn-slam ghost flex-1 px-4 py-2.5">
                Take a seat
              </button>
            </div>

            {error && <p className="font-mono text-xs uppercase text-down">{error}</p>}
          </div>
        </div>
      </div>

      <Ticker
        items={[
          'No real money — bragging rights only',
          'Bet against the crowd to win the most',
          'Climb the standings',
          'Slot break every 3rd round',
          'One good answer changes everything',
        ]}
      />
    </main>
  );
}
