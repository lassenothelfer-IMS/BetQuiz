'use client';
import { useEffect, useMemo, useState } from 'react';
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
import Ticker from '@/components/Ticker';
import RollingNumber from '@/components/RollingNumber';

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

  // Live ticker crawl: leader, this round's swings, then the standings.
  const tickerItems = useMemo(() => {
    if (!room) return [];
    const items = [];
    const ranked = room.players
      .filter((p) => p.id !== room.hostId)
      .sort((a, b) => b.points - a.points);
    if (ranked[0]) items.push(`◆ Leader: ${ranked[0].name} ${ranked[0].points.toLocaleString()}`);
    if (room.results) {
      for (const r of room.results) {
        const pl = room.players.find((p) => p.id === r.playerId);
        if (pl && r.delta !== 0) items.push(`${pl.name} ${r.delta > 0 ? `▲ +${r.delta}` : `▼ ${r.delta}`}`);
      }
    }
    for (const p of ranked) items.push(`${p.name} · ${p.points.toLocaleString()}`);
    return items;
  }, [room]);

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
        <h1 className="headline text-center text-3xl">
          Sit in at table <span className="led text-4xl tracking-widest">{roomCode}</span>
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = nameInput.trim();
            if (!trimmed) return;
            rememberName(trimmed);
            setName(trimmed);
          }}
          className="board flex w-full max-w-sm gap-2 p-3"
        >
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="YOUR HANDLE"
            maxLength={20}
            className="input-board flex-1 px-3 py-2.5 uppercase tracking-wide"
          />
          <button className="btn-slam px-5 py-2.5">Sit</button>
        </form>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="headline text-5xl text-down">Off Air</p>
        <p className="font-mono text-sm uppercase tracking-wide text-down">{error}</p>
        <button onClick={() => router.push('/')} className="btn-slam ghost px-5 py-2.5">
          ◂ Back to lobby
        </button>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <span className="live-bug text-lg">
          <span className="dot" /> Tuning in…
        </span>
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
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center gap-6 p-5">
        {room.status !== 'lobby' && (
          /* Broadcast score bug */
          <div className="flex w-full max-w-lg items-stretch border-2 border-steel font-mono text-xs uppercase">
            <span className="live-bug flex items-center gap-1.5 bg-black px-3 py-2 text-[0.7rem]">
              <span className="dot" /> Live
            </span>
            <span className="flex flex-1 items-center justify-center gap-3 border-x-2 border-steel px-3 tracking-widest text-ash">
              <span>Table #{room.code}</span>
              {room.round > 0 && (
                <span className="text-chalk">
                  Q{room.round}/{room.questionCount}
                </span>
              )}
            </span>
            {me && (
              <span className="flex items-center gap-2 bg-black px-3 py-2">
                {isHost ? (
                  <span className="font-bold tracking-widest text-board">Host</span>
                ) : (
                  <>
                    <span className="text-[0.6rem] tracking-widest text-ash">Bank</span>
                    <RollingNumber value={me.points} className="led text-sm" />
                  </>
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
              <p className="live-bug justify-center text-base">
                <span className="dot" /> Standby
              </p>
              <p className="headline text-2xl">Building the card…</p>
              <p className="font-mono text-xs uppercase tracking-widest text-ash">
                {room.questionCount} question{room.questionCount === 1 ? '' : 's'} on the rundown
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
              <div className="board w-full max-w-md text-center">
                <div className="board-hd justify-center">🎰 Slot Break — On The Floor</div>
                <div className="space-y-4 p-6">
                  <p className="led text-6xl">{slotSeconds}</p>
                  <p className="font-mono text-xs uppercase tracking-widest text-ash">
                    Players are spinning the reels
                  </p>
                  <button onClick={() => socket.emit('slots:skip')} className="btn-slam ghost px-5 py-2.5">
                    ▸ Skip to next question
                  </button>
                </div>
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
      </div>

      {room.status !== 'lobby' && room.status !== 'build' && <Ticker items={tickerItems} />}
    </main>
  );
}
