// In-memory game state. Pure data + helpers, no Socket.io references here so the
// game logic stays testable in isolation. All state lives only for the running
// session — no database (per project brief).

const { computeOdds } = require('./odds');
const { scoreBets } = require('./scoring');
const { computeSpin, SLOT_SECONDS, MAX_SPINS } = require('./slots');
const { getPoolQuestion } = require('./questionPool');

const STARTING_POINTS = 1000;
const MAX_QUESTIONS = 20;

/** @type {Map<string, Room>} keyed by uppercase room code */
const rooms = new Map();

// Unambiguous alphabet (no 0/O, 1/I) so codes are easy to read aloud and type.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

function generateCode() {
  let code;
  do {
    code = Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  } while (rooms.has(code));
  return code;
}

function getRoom(code) {
  return rooms.get(String(code).toUpperCase());
}

function createRoom(hostId, hostName) {
  const code = generateCode();
  const room = {
    code,
    hostId,
    // 'lobby' -> 'build' -> 'betting' -> 'reveal' -> ('slots' -> 'betting' ... | 'ended')
    status: 'lobby',
    questions: [], // authored up-front (Kahoot-style): { text, answers[], correctAnswer }
    questionIndex: -1, // index into questions of the active round
    round: 0,
    currentQuestion: null, // mirrors questions[questionIndex] while a round is live
    bets: [], // { playerId, answerId, amount, oddsAtBet } — one per player per question
    lastResults: null, // scored outcome of the most recent reveal
    slotSpins: new Map(), // playerId -> spins used this slot break
    slotDeadline: null, // ms timestamp the slot break ends
    players: new Map(),
  };
  room.players.set(hostId, { id: hostId, name: hostName, points: STARTING_POINTS });
  rooms.set(code, room);
  return room;
}

// Idempotent: if this socket is already a member (e.g. the host returning after
// navigation), just return the room. Otherwise add them, guarding duplicate names.
function joinRoom(code, playerId, name) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.players.has(playerId)) return { room };

  const trimmed = String(name || '').trim();
  if (!trimmed) return { error: 'Name is required' };

  const nameTaken = [...room.players.values()].some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (nameTaken) return { error: 'Name already taken in this room' };

  room.players.set(playerId, { id: playerId, name: trimmed, points: STARTING_POINTS });
  return { room };
}

// Remove a player; close the room if empty, reassign host if the host left.
function removePlayer(code, playerId) {
  const room = getRoom(code);
  if (!room) return { closed: true };

  room.players.delete(playerId);

  if (room.players.size === 0) {
    rooms.delete(code);
    return { closed: true };
  }
  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value; // promote earliest remaining player
  }
  return { room };
}

// --- Game flow -------------------------------------------------------------
// Each transition mutates the room and returns { room } or { error }. Host-only
// enforcement lives in the socket layer; these helpers just validate state.

// Host opens the quiz builder (Kahoot-style: author every question before play).
function openBuilder(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.status = 'build';
  return { room };
}

// Validate a question payload into a clean { text, answers, correctAnswer }.
function cleanQuestion({ text, answers, correctAnswer } = {}) {
  const cleanText = String(text || '').trim();
  const list = Array.isArray(answers) ? answers.map((a) => String(a || '').trim()) : [];
  const idx = Number(correctAnswer);
  if (!cleanText) return { error: 'Question text is required' };
  if (list.length < 2 || list.length > 6) return { error: 'Provide between 2 and 6 answers' };
  if (list.some((a) => !a)) return { error: 'Answers cannot be empty' };
  if (!Number.isInteger(idx) || idx < 0 || idx >= list.length)
    return { error: 'Mark the correct answer' };
  return { question: { text: cleanText, answers: list, correctAnswer: idx } };
}

// Host adds a custom question to the quiz being built.
function addQuestion(code, payload) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'build') return { error: 'Open the builder first' };
  if (room.questions.length >= MAX_QUESTIONS) return { error: `Quiz is full (max ${MAX_QUESTIONS})` };
  const { question, error } = cleanQuestion(payload);
  if (error) return { error };
  room.questions.push(question);
  return { room };
}

// Host adds a question picked from the curated pool.
function addPoolQuestion(code, poolId) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'build') return { error: 'Open the builder first' };
  if (room.questions.length >= MAX_QUESTIONS) return { error: `Quiz is full (max ${MAX_QUESTIONS})` };
  const q = getPoolQuestion(poolId);
  if (!q) return { error: 'Unknown question' };
  room.questions.push({ text: q.text, answers: q.answers.slice(), correctAnswer: q.correctAnswer });
  return { room };
}

// Host removes a question from the quiz being built.
function removeQuestion(code, index) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'build') return { error: 'Open the builder first' };
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= room.questions.length) return { error: 'Bad index' };
  room.questions.splice(i, 1);
  return { room };
}

// Load the question at room.questionIndex into the live round and open betting.
function openBetting(room) {
  room.currentQuestion = room.questions[room.questionIndex];
  room.round = room.questionIndex + 1;
  room.bets = [];
  room.lastResults = null;
  room.slotDeadline = null;
  room.status = 'betting';
}

// Host kicks off the game: reset scores and open betting on the first question.
function startGame(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.questions.length === 0) return { error: 'Add at least one question first' };
  for (const p of room.players.values()) p.points = STARTING_POINTS;
  room.questionIndex = 0;
  room.slotSpins = new Map();
  openBetting(room);
  return { room };
}

// A player places (or changes) their bet while betting is open. The odds are
// locked from the pool *as it stands before this stake moves it* — so betting
// early against the crowd captures the high odds.
function placeBet(code, playerId, answerId, amount) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'betting' || !room.currentQuestion) return { error: 'Betting is not open' };
  if (playerId === room.hostId) return { error: 'The host moderates and cannot bet' };

  const player = room.players.get(playerId);
  if (!player) return { error: 'You are not in this room' };

  const aId = Number(answerId);
  const amt = Number(amount);
  const answerCount = room.currentQuestion.answers.length;
  if (!Number.isInteger(aId) || aId < 0 || aId >= answerCount) return { error: 'Pick a valid answer' };
  if (!Number.isFinite(amt) || amt <= 0) return { error: 'Choose a stake' };
  if (amt > player.points) return { error: 'Not enough points for that stake' };

  // Drop any previous bet so a player can change their mind while betting is open.
  room.bets = room.bets.filter((b) => b.playerId !== playerId);
  const oddsBefore = computeOdds(answerCount, room.bets);
  const oddsAtBet = oddsBefore[aId];
  room.bets.push({ playerId, answerId: aId, amount: amt, oddsAtBet });

  return { room, oddsAtBet };
}

// Host reveals the correct answer -> score every bet and apply the point deltas.
function revealAnswer(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (!room.currentQuestion) return { error: 'No active question' };

  const results = scoreBets(room.bets, room.currentQuestion.correctAnswer);
  for (const r of results) {
    const p = room.players.get(r.playerId);
    if (p) p.points += r.delta;
  }
  room.lastResults = results;
  room.status = 'reveal';
  return { room };
}

// After a reveal the host advances. If more questions remain we open a slot
// break (20s); otherwise the game ends. Returns { room, phase } so the socket
// layer knows whether to start the slot timer.
function nextRound(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'reveal') return { error: 'Not ready to advance' };

  const isLast = room.questionIndex >= room.questions.length - 1;
  if (isLast) {
    room.currentQuestion = null;
    room.status = 'ended';
    return { room, phase: 'ended' };
  }

  // Slot break between questions.
  room.currentQuestion = null;
  room.bets = [];
  room.lastResults = null;
  room.slotSpins = new Map();
  room.slotDeadline = Date.now() + SLOT_SECONDS * 1000;
  room.status = 'slots';
  return { room, phase: 'slots' };
}

// Move from the slot break to the next question's betting (called by the slot
// timer firing or the host skipping).
function advanceToNextQuestion(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.questionIndex >= room.questions.length - 1) {
    room.currentQuestion = null;
    room.status = 'ended';
    return { room };
  }
  room.questionIndex += 1;
  openBetting(room);
  return { room };
}

// A player spins the slot machine during the break. Authoritative outcome.
function spinSlot(code, playerId, wager) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'slots') return { error: 'The slot machine is closed' };
  if (playerId === room.hostId) return { error: 'The host just watches the slots' };

  const player = room.players.get(playerId);
  if (!player) return { error: 'You are not in this room' };

  const used = room.slotSpins.get(playerId) || 0;
  if (used >= MAX_SPINS) return { error: 'No spins left' };

  const amt = Math.floor(Number(wager));
  if (!Number.isFinite(amt) || amt <= 0) return { error: 'Choose a wager' };
  if (amt > player.points) return { error: 'Not enough points for that wager' };

  const outcome = computeSpin(amt);
  player.points += outcome.delta;
  room.slotSpins.set(playerId, used + 1);
  return { room, outcome, spinsLeft: MAX_SPINS - (used + 1), points: player.points };
}

// Host ends the game early -> final standings.
function endGame(code) {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  room.currentQuestion = null;
  room.status = 'ended';
  return { room };
}

// Plain, JSON-safe view for sending to clients (Map -> array). This single
// payload is the one source of truth the client renders from.
// Security: the correct answer (and the scored results) are only ever included
// once the question is revealed; individual bets are never broadcast — players
// only ever see the aggregate odds.
function serializeRoom(room) {
  const q = room.currentQuestion;
  const revealed = room.status === 'reveal';
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    round: room.round,
    questionCount: room.questions.length,
    questionIndex: room.questionIndex,
    players: [...room.players.values()],
    question: q ? { text: q.text, answers: q.answers } : null,
    odds: q ? computeOdds(q.answers.length, room.bets) : null,
    betCount: room.bets.length,
    correctAnswer: revealed && q ? q.correctAnswer : null,
    results: revealed ? room.lastResults : null,
    slotDeadline: room.status === 'slots' ? room.slotDeadline : null,
  };
}

// Host-only view of the quiz being built — includes the correct answers, so this
// is sent ONLY to the host socket (never broadcast to players).
function serializeQuiz(room) {
  return room.questions.map((q, index) => ({
    index,
    text: q.text,
    answers: q.answers,
    correctAnswer: q.correctAnswer,
  }));
}

module.exports = {
  STARTING_POINTS,
  MAX_QUESTIONS,
  rooms,
  getRoom,
  createRoom,
  joinRoom,
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
};
