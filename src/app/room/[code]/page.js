'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { recallName, rememberName } from '@/lib/session';
import Lobby from '@/components/Lobby';
import QuizBuilder from '@/components/QuizBuilder';
import QuestionView from '@/components/QuestionView';
import BettingPanel from '@/components/BettingPanel';
import SlotMachine from '@/components/SlotMachine';
import Leaderboard from '@/components/Leaderboard';
import Standings from '@/components/Standings';

export default function RoomPage() {
  const router = useRouter();
  const { code } = useParams();
  const roomCode = String(code).toUpperCase();

  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState(null);
  const [myBet, setMyBet] = useState(null);
  const [quiz, setQuiz] = useState([]); // host-only: the authored question list
  const [now, setNow] = useState(Date.now()); // ticks during the slot break for the countdown

  // On mount, recover the name chosen on the home page (if any).
  useEffect(() => {
    setName(recallName());
  }, []);

  // Join the room once we have a name, and keep the player list in sync.
  useEffect(() => {
    if (!name) return;
    const socket = getSocket();

    const join = () => {
      setMyId(socket.id);
      socket.emit('room:join', { code: roomCode, name }, (res) => {
        if (res?.error) return setError(res.error);
        setError('');
        setRoom(res.room);
      });
    };

    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('room:update', setRoom);
    socket.on('quiz:questions', setQuiz); // host-only authored list

    return () => {
      socket.off('connect', join);
      socket.off('room:update', setRoom);
      socket.off('quiz:questions', setQuiz);
    };
  }, [name, roomCode]);

  // Forget my locally-tracked bet whenever a new question opens.
  useEffect(() => {
    setMyBet(null);
  }, [room?.round]);

  // Tick the clock during timed phases so the host's countdowns stay live.
  useEffect(() => {
    if (room?.status !== 'slots' && room?.status !== 'betting') return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [room?.status]);

  // Name gate: someone opened the room link directly without a name.
  if (!name) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-center text-2xl font-bold text-zinc-100">
          Buy in to table{' '}
          <span className="font-mono tracking-widest text-emerald-400">{roomCode}</span>
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = nameInput.trim();
            if (!trimmed) return;
            rememberName(trimmed);
            setName(trimmed);
          }}
          className="panel flex w-full max-w-sm gap-2 p-3"
        >
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            className="field flex-1 px-3 py-2.5"
          />
          <button className="btn-bet px-5 py-2.5">Join</button>
        </form>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-5xl">🚫</p>
        <p className="text-lg text-rose-400">{error}</p>
        <button onClick={() => router.push('/')} className="btn-ghost px-5 py-2.5">
          Back to home
        </button>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-zinc-400">
        <span className="text-3xl">🎲</span>
        <p>Taking a seat at the table…</p>
      </main>
    );
  }

  const socket = getSocket();
  const isHost = myId === room.hostId;
  const me = room.players.find((p) => p.id === myId);
  const myResult = room.results?.find((r) => r.playerId === myId) ?? null;
  const isLastQuestion = room.questionIndex === room.questionCount - 1;
  const slotNext = !isLastQuestion && room.round % 3 === 0;
  const bailedOut = room.bailouts?.includes(myId);
  const slotSeconds = room.slotDeadline ? Math.max(0, Math.ceil((room.slotDeadline - now) / 1000)) : 0;

  function placeBet(payload, ack) {
    socket.emit('bet:place', payload, (res) => {
      if (res?.ok) {
        setMyBet({ answerId: payload.answerId, amount: payload.amount, oddsAtBet: res.oddsAtBet });
      }
      ack?.(res);
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-6">
      {room.status !== 'lobby' && (
        <div className="flex w-full max-w-lg items-center justify-between gap-2 rounded-full border border-white/8 bg-black/30 px-4 py-2 text-sm">
          <span className="font-mono tracking-widest text-zinc-400">#{room.code}</span>
          {room.round > 0 && (
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Round {room.round}
            </span>
          )}
          {me && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-500">{me.name}</span>
              {isHost ? (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold">
                  🎩 Host
                </span>
              ) : (
                <span className="font-mono font-bold text-emerald-400">{me.points} 🪙</span>
              )}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center">
        {room.status === 'lobby' && (
          <Lobby room={room} isHost={isHost} onStart={() => socket.emit('quiz:open')} />
        )}

        {room.status === 'build' &&
          (isHost ? (
            <QuizBuilder
              questions={quiz}
              onAddPool={(id, ack) => socket.emit('quiz:addPool', { id }, ack)}
              onAddCustom={(payload, ack) => socket.emit('quiz:add', payload, ack)}
              onRemove={(index, ack) => socket.emit('quiz:remove', { index }, ack)}
              onStart={() => socket.emit('game:start')}
            />
          ) : (
            <div className="fade-in space-y-3 text-center">
              <p className="text-4xl">🃏</p>
              <p className="text-zinc-300">The host is building the quiz…</p>
              <p className="text-sm text-zinc-500">
                {room.questionCount} question{room.questionCount === 1 ? '' : 's'} ready so far.
              </p>
            </div>
          ))}

        {room.status === 'betting' &&
          (isHost ? (
            <QuestionView
              room={room}
              isHost
              isLastQuestion={isLastQuestion}
              onReveal={() => socket.emit('question:reveal')}
            />
          ) : (
            <BettingPanel
              room={room}
              points={me?.points ?? 0}
              myBet={myBet}
              bailedOut={bailedOut}
              onPlaceBet={placeBet}
            />
          ))}

        {room.status === 'reveal' && (
          <div key="reveal" className="fade-in flex w-full flex-col items-center gap-6">
            <QuestionView
              room={room}
              isHost={isHost}
              isLastQuestion={isLastQuestion}
              slotNext={slotNext}
              myResult={myResult}
              onNext={() => socket.emit('round:next')}
              onEnd={() => socket.emit('game:end')}
            />
            <Leaderboard
              players={room.players}
              hostId={room.hostId}
              results={room.results}
              title="Standings after this round"
            />
          </div>
        )}

        {room.status === 'slots' && (
          <div key={`slots-${room.questionIndex}`} className="fade-in flex w-full flex-col items-center gap-6">
            {isHost ? (
              <div className="space-y-4 text-center">
                <p className="text-5xl">🎰</p>
                <p className="text-lg text-zinc-200">Slot break — players are spinning!</p>
                <p className="font-mono text-3xl font-black text-gold">{slotSeconds}s</p>
                <button onClick={() => socket.emit('slots:skip')} className="btn-ghost px-5 py-2.5">
                  ⏭️ Skip to next question
                </button>
              </div>
            ) : (
              <SlotMachine
                points={me?.points ?? 0}
                deadline={room.slotDeadline}
                spinsDone={room.spinsDone}
                activeCount={room.activeCount}
                onSpin={(wager, ack) => socket.emit('slot:spin', { wager }, ack)}
              />
            )}
            <Leaderboard players={room.players} hostId={room.hostId} title="The board" />
          </div>
        )}

        {room.status === 'ended' && (
          <Standings room={room} isHost={isHost} onPlayAgain={() => socket.emit('game:start')} />
        )}
      </div>
    </main>
  );
}
