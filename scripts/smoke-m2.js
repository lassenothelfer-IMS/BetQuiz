// Game-flow smoke test (build + question lifecycle). Asserts the state machine
// and the security rule (guest never sees correctAnswer until reveal).
const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';
const c = () => io(URL, { transports: ['websocket'] });
const ack = (s, e, p) => new Promise((res) => s.emit(e, p, res));
const waitFor = (s, pred) =>
  new Promise((res) => {
    const h = (room) => {
      if (pred(room)) {
        s.off('room:update', h);
        res(room);
      }
    };
    s.on('room:update', h);
  });

let failed = 0;
const assert = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

(async () => {
  const host = c();
  const guest = c();

  const { code } = await ack(host, 'room:create', { name: 'Host' });
  await ack(guest, 'room:join', { code, name: 'Guest' });

  // lobby -> build
  await ack(host, 'quiz:open');
  // author one custom question
  const added = await ack(host, 'quiz:add', {
    text: 'Capital of France?',
    answers: ['Paris', 'Berlin', 'Rome'],
    correctAnswer: 0,
  });
  assert(added.ok === true, 'quiz:add accepted a valid question');

  const bad = await ack(host, 'quiz:add', { text: '', answers: ['x'], correctAnswer: 0 });
  assert(!!bad.error, 'invalid question rejected: ' + bad.error);

  // start -> betting on Q1
  const betting = waitFor(guest, (r) => r.status === 'betting');
  await ack(host, 'game:start');
  const bRoom = await betting;
  assert(bRoom.question?.answers.length === 3, 'guest sees 3 answers');
  assert(bRoom.correctAnswer === null, 'correctAnswer hidden during betting (security)');
  assert(bRoom.questionCount === 1 && bRoom.questionIndex === 0, 'question index/count exposed');

  // non-host cannot reveal
  const denied = await ack(guest, 'question:reveal');
  assert(!!denied.error, 'non-host blocked from reveal: ' + denied.error);

  // reveal exposes the correct answer
  const reveal = waitFor(guest, (r) => r.status === 'reveal');
  await ack(host, 'question:reveal');
  const rRoom = await reveal;
  assert(rRoom.correctAnswer === 0, 'correctAnswer revealed = 0 (Paris)');

  // last (only) question -> finish ends the game
  const ended = waitFor(guest, (r) => r.status === 'ended');
  await ack(host, 'game:end');
  await ended;
  assert(true, 'game:end -> ended');

  console.log(failed === 0 ? '\nPASS ✅ game flow' : `\nFAIL ❌ ${failed}`);
  host.close();
  guest.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
