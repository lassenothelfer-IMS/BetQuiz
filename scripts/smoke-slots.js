// Slot-break smoke test: a 2-question quiz, then between questions a player spins
// the slots. Asserts the 3-spin cap, point changes, the pool-question flow, and
// the host skipping the break to advance to the next question.
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
const check = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

(async () => {
  const host = c();
  const p1 = c();

  const { code } = await ack(host, 'room:create', { name: 'Host' });
  await ack(p1, 'room:join', { code, name: 'Ann' });

  // Build a 2-question quiz: one from the pool, one custom.
  await ack(host, 'quiz:open');
  const pool = await ack(host, 'quiz:addPool', { id: 'sci-1' });
  check(pool.ok === true, 'added a pool question');
  await ack(host, 'quiz:add', { text: 'Pick A', answers: ['A', 'B'], correctAnswer: 0 });

  // Q1 betting -> reveal
  const betting1 = waitFor(p1, (r) => r.status === 'betting');
  await ack(host, 'game:start');
  await betting1;
  await ack(host, 'question:reveal');

  // reveal -> slot break
  const slots = waitFor(p1, (r) => r.status === 'slots');
  await ack(host, 'round:next');
  const sRoom = await slots;
  check(typeof sRoom.slotDeadline === 'number', 'slot break opens with a deadline');

  // spin three times, then the fourth is rejected
  let last;
  for (let i = 0; i < 3; i++) last = await ack(p1, 'slot:spin', { wager: 50 });
  check(last.ok === true && last.spinsLeft === 0, 'three spins allowed, spinsLeft hits 0');
  check(typeof last.points === 'number', `spin returns updated balance (${last.points})`);
  const fourth = await ack(p1, 'slot:spin', { wager: 50 });
  check(!!fourth.error, 'fourth spin rejected: ' + fourth.error);

  // host can't be charged for spins
  const hostSpin = await ack(host, 'slot:spin', { wager: 50 });
  check(!!hostSpin.error, 'host blocked from spinning: ' + hostSpin.error);

  // host skips the break -> Q2 betting
  const betting2 = waitFor(p1, (r) => r.status === 'betting' && r.questionIndex === 1);
  await ack(host, 'slots:skip');
  const b2 = await betting2;
  check(b2.questionIndex === 1, 'skip advances to question 2');
  check(b2.question.text === 'Pick A', 'second question is the custom one');

  console.log(failed === 0 ? '\nPASS ✅ slot break' : `\nFAIL ❌ ${failed} check(s)`);
  host.close();
  p1.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
