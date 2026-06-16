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

function registerSocketHandlers(io) {
  // One pending phase timer per room (betting auto-reveal OR slot auto-advance).
  const phaseTimers = new Map();

  // After the last spin, hold on the result long enough to see the reels settle
  // (~1.25s animation) and read the win before the round continues.
  const SLOT_END_DELAY = 3500;

  function broadcastRoom(code) {
    const room = getRoom(code);
    if (room) io.to(code).emit('room:update', serializeRoom(room));
  }

  function sendHostQuiz(room) {
    io.to(room.hostId).emit('quiz:questions', serializeQuiz(room));
  }

  function clearTimer(code) {
    const t = phaseTimers.get(code);
    if (t) {
      clearTimeout(t);
      phaseTimers.delete(code);
    }
  }

  // Arm the timer that matches the room's current phase: betting auto-reveals at
  // its deadline; a slot break auto-advances at its (fallback) deadline.
  function armTimer(code) {
    clearTimer(code);
    const room = getRoom(code);
    if (!room) return;
    if (room.status === 'betting' && room.betDeadline) {
      const ms = Math.max(0, room.betDeadline - Date.now());
      phaseTimers.set(code, setTimeout(() => revealNow(code), ms));
    } else if (room.status === 'slots' && room.slotDeadline) {
      const ms = Math.max(0, room.slotDeadline - Date.now());
      phaseTimers.set(code, setTimeout(() => advanceFromSlots(code), ms));
    }
  }

  // Close betting and reveal the answer (timer fired, everyone locked in, or host).
  function revealNow(code) {
    clearTimer(code);
    const res = revealAnswer(code);
    if (res?.room) broadcastRoom(code);
  }

  // Leave the slot break for the next question (timer fired, everyone done, or host).
  function advanceFromSlots(code) {
    clearTimer(code);
    const res = advanceToNextQuestion(code);
    if (res?.room) {
      broadcastRoom(code);
      armTimer(code); // the next betting round gets its own 20s timer
    }
  }

  // Everyone's done spinning — hold on the result, then continue.
  function scheduleSlotsEnd(code) {
    clearTimer(code);
    phaseTimers.set(code, setTimeout(() => advanceFromSlots(code), SLOT_END_DELAY));
  }

  io.on('connection', (socket) => {
    function asHost(ack) {
      const room = getRoom(socket.data.code);
      if (!room || room.hostId !== socket.id) {
        ack?.({ error: 'Only the host can do that' });
        return null;
      }
      return room;
    }

    socket.on('room:create', ({ name } = {}, ack) => {
      const trimmed = String(name || '').trim();
      if (!trimmed) return ack?.({ error: 'Name is required' });

      const room = createRoom(socket.id, trimmed);
      socket.data.code = room.code;
      socket.join(room.code);
      ack?.({ code: room.code, room: serializeRoom(room) });
    });

    socket.on('room:join', ({ code, name } = {}, ack) => {
      const result = joinRoom(code, socket.id, name);
      if (result.error) return ack?.({ error: result.error });

      socket.data.code = result.room.code;
      socket.join(result.room.code);
      ack?.({ room: serializeRoom(result.room) });
      broadcastRoom(result.room.code);
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
      broadcastRoom(room.code);
      sendHostQuiz(room);
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
      ack?.({ ok: true });
      broadcastRoom(room.code);
      armTimer(room.code); // betting timer
    });

    socket.on('question:reveal', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      if (room.status !== 'betting') return ack?.({ error: 'Not in betting' });
      ack?.({ ok: true });
      revealNow(room.code);
    });

    // Reveal -> next question, possibly via a slot break (every 3rd round), or end.
    socket.on('round:next', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      const res = nextRound(room.code);
      if (res.error) return ack?.({ error: res.error });
      ack?.({ ok: true });
      broadcastRoom(room.code);
      armTimer(room.code); // arms a betting or slot timer depending on the new phase
    });

    // Host skips the remaining slot time.
    socket.on('slots:skip', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      if (room.status !== 'slots') return ack?.({ error: 'Not in a slot break' });
      ack?.({ ok: true });
      advanceFromSlots(room.code);
    });

    socket.on('game:end', (_p, ack) => {
      const room = asHost(ack);
      if (!room) return;
      clearTimer(room.code);
      endGame(room.code);
      ack?.({ ok: true });
      broadcastRoom(room.code);
    });

    // A player locks in their bet. If that was the last player, reveal early.
    socket.on('bet:place', ({ answerId, amount } = {}, ack) => {
      const result = placeBet(socket.data.code, socket.id, answerId, amount);
      if (result.error) return ack?.({ error: result.error });
      ack?.({ ok: true, oddsAtBet: result.oddsAtBet });
      if (result.allBet) {
        revealNow(socket.data.code); // everyone locked in -> close betting now
      } else {
        broadcastRoom(socket.data.code);
      }
    });

    // A player spins the slots. If everyone is now done, advance early.
    socket.on('slot:spin', ({ wager } = {}, ack) => {
      const res = spinSlot(socket.data.code, socket.id, wager);
      if (res.error) return ack?.({ error: res.error });
      const o = res.outcome;
      ack?.({
        ok: true,
        grid: o.grid,
        lines: o.lines,
        scatterCount: o.scatterCount,
        scatterBonus: o.scatterBonus,
        payout: o.payout,
        delta: o.delta,
        event: o.event,
        win: o.win,
        spinsLeft: res.spinsLeft,
        points: res.points,
      });
      broadcastRoom(socket.data.code); // update the leaderboard with the winnings
      if (res.allDone) {
        // Don't yank the screen away — hold on the result, then continue.
        scheduleSlotsEnd(socket.data.code);
      }
    });

    socket.on('disconnect', () => {
      const code = socket.data.code;
      if (!code) return;
      const { closed } = removePlayer(code, socket.id);
      if (closed) {
        clearTimer(code);
        return;
      }
      broadcastRoom(code);
      // A player leaving might be the last one we were waiting on.
      const room = getRoom(code);
      if (room?.status === 'betting') {
        // re-check: if the remaining players have all bet, reveal
        const active = room.players.size - 1;
        if (active > 0 && room.bets.length >= active) revealNow(code);
      }
    });
  });
}

module.exports = { registerSocketHandlers };
