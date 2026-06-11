// Wires Socket.io events to the in-memory game state. Each socket = one player,
// identified by socket.id. We stash the player's room code on socket.data so we
// can clean them up on disconnect.
const {
  createRoom,
  joinRoom,
  getRoom,
  removePlayer,
  openBuilder,
  addQuestion,
  addPoolQuestion,
  removeQuestion,
  startGame,
  placeBet,
  revealAnswer,
  nextRound,
  advanceToNextQuestion,
  spinSlot,
  endGame,
  serializeRoom,
  serializeQuiz,
} = require('./state');
const { SLOT_SECONDS } = require('./slots');

function registerSocketHandlers(io) {
  // Pending slot-break auto-advance timers, keyed by room code.
  const slotTimers = new Map();

  function broadcastRoom(code) {
    const room = getRoom(code);
    if (room) io.to(code).emit('room:update', serializeRoom(room));
  }

  // The authored quiz (with correct answers) goes only to the host socket.
  function sendHostQuiz(room) {
    io.to(room.hostId).emit('quiz:questions', serializeQuiz(room));
  }

  function clearSlotTimer(code) {
    const t = slotTimers.get(code);
    if (t) {
      clearTimeout(t);
      slotTimers.delete(code);
    }
  }

  function scheduleSlotEnd(code) {
    clearSlotTimer(code);
    const t = setTimeout(() => {
      slotTimers.delete(code);
      const res = advanceToNextQuestion(code);
      if (res?.room) broadcastRoom(code);
    }, SLOT_SECONDS * 1000);
    slotTimers.set(code, t);
  }

  io.on('connection', (socket) => {
    // Look up the caller's room only if they are its host.
    function asHost(ack) {
      const room = getRoom(socket.data.code);
      if (!room || room.hostId !== socket.id) {
        ack?.({ error: 'Only the host can do that' });
        return null;
      }
      return room;
    }

    // Host creates a room. Ack returns the generated code (or an error).
    socket.on('room:create', ({ name } = {}, ack) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) return ack?.({ error: 'Name is required' });

      const room = createRoom(socket.id, trimmed);
      socket.data.code = room.code;
      socket.join(room.code);
      ack?.({ code: room.code, room: serializeRoom(room) });
    });

    // Join an existing room (also used by the host re-entering — joinRoom is idempotent).
    socket.on('room:join', ({ code, name } = {}, ack) => {
      const result = joinRoom(code, socket.id, name);
      if (result.error) return ack?.({ error: result.error });

      socket.data.code = result.room.code;
      socket.join(result.room.code);
      ack?.({ room: serializeRoom(result.room) });
      broadcastRoom(result.room.code);
      // A host reconnecting mid-build needs their authored list back.
      if (result.room.status === 'build' && result.room.hostId === socket.id) {
        sendHostQuiz(result.room);
      }
    });

    // ---- Quiz building (host, before the game starts) ----
    socket.on('quiz:open', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      openBuilder(room.code);
      ack?.({ ok: true });
      broadcastRoom(room.code);
      sendHostQuiz(room);
    });

    function hostQuizMutation(fn, payload, ack) {
      const room = asHost(ack);
      if (!room) return;
      const res = fn(room.code, payload);
      if (res.error) return ack?.({ error: res.error });
      ack?.({ ok: true });
      broadcastRoom(room.code); // questionCount for the players' waiting screen
      sendHostQuiz(room); // full list for the host
    }
    socket.on('quiz:add', (payload, ack) => hostQuizMutation(addQuestion, payload, ack));
    socket.on('quiz:addPool', ({ id } = {}, ack) => hostQuizMutation(addPoolQuestion, id, ack));
    socket.on('quiz:remove', ({ index } = {}, ack) => hostQuizMutation(removeQuestion, index, ack));

    // ---- Running the game ----
    socket.on('game:start', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      const res = startGame(room.code);
      if (res.error) return ack?.({ error: res.error });
      clearSlotTimer(room.code);
      ack?.({ ok: true });
      broadcastRoom(room.code);
    });

    socket.on('question:reveal', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      const res = revealAnswer(room.code);
      if (res.error) return ack?.({ error: res.error });
      ack?.({ ok: true });
      broadcastRoom(room.code);
    });

    // Reveal -> slot break (or end). Starts the auto-advance timer when slots open.
    socket.on('round:next', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      const res = nextRound(room.code);
      if (res.error) return ack?.({ error: res.error });
      ack?.({ ok: true });
      broadcastRoom(room.code);
      if (res.phase === 'slots') scheduleSlotEnd(room.code);
    });

    // Host skips the remaining slot time.
    socket.on('slots:skip', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      if (room.status !== 'slots') return ack?.({ error: 'Not in a slot break' });
      clearSlotTimer(room.code);
      advanceToNextQuestion(room.code);
      ack?.({ ok: true });
      broadcastRoom(room.code);
    });

    socket.on('game:end', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      clearSlotTimer(room.code);
      endGame(room.code);
      ack?.({ ok: true });
      broadcastRoom(room.code);
    });

    // Any player places/updates a bet during the betting phase. Broadcasting the
    // room re-sends the freshly recomputed odds to everyone (live odds movement).
    socket.on('bet:place', ({ answerId, amount } = {}, ack) => {
      const result = placeBet(socket.data.code, socket.id, answerId, amount);
      if (result.error) return ack?.({ error: result.error });
      ack?.({ ok: true, oddsAtBet: result.oddsAtBet });
      broadcastRoom(socket.data.code);
    });

    // A player spins the slot machine during the break.
    socket.on('slot:spin', ({ wager } = {}, ack) => {
      const res = spinSlot(socket.data.code, socket.id, wager);
      if (res.error) return ack?.({ error: res.error });
      ack?.({
        ok: true,
        reels: res.outcome.reels,
        mult: res.outcome.mult,
        payout: res.outcome.payout,
        delta: res.outcome.delta,
        jackpot: res.outcome.jackpot,
        spinsLeft: res.spinsLeft,
        points: res.points,
      });
      broadcastRoom(socket.data.code); // live leaderboard as winnings land
    });

    socket.on('disconnect', () => {
      const code = socket.data.code;
      if (!code) return;
      const { closed } = removePlayer(code, socket.id);
      if (closed) clearSlotTimer(code);
      else broadcastRoom(code);
    });
  });
}

module.exports = { registerSocketHandlers };
