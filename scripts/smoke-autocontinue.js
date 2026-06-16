// Auto-continue smoke test: after a reveal, the game advances to the next round
// on its own (no host action), once the reveal countdown elapses.
const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';
const c = () => io(URL, { transports: ['websocket'] });
const ack = (s, e, p) => new Promise((res) => s.emit(e, p, res));
const waitFor = (s, pred, ms = 12000) =>
  new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout waiting for room state')), ms);
    const h = (room) => {
      if (pred(room)) {
        clearTimeout(to);
        s.off('room:update', h);
        resolve(room);
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

  await ack(host, 'quiz:open');
  await ack(host, 'quiz:add', { text: 'Q1', answers: ['A', 'B'], correctAnswer: 0 });
  await ack(host, 'quiz:add', { text: 'Q2', answers: ['A', 'B'], correctAnswer: 0 });

  const r1 = waitFor(p1, (r) => r.status === 'betting');
  await ack(host, 'game:start');
  await r1;

  // Ann (only player) locks in -> auto-reveal.
  const revealed = waitFor(p1, (r) => r.status === 'reveal');
  await ack(p1, 'bet:place', { answerId: 0, amount: 100 });
  const rr = await revealed;
  check(typeof rr.revealDeadline === 'number', 'reveal exposes an auto-advance deadline');

  // Without ANY host action, the game should move to round 2 on its own.
  const t0 = Date.now();
  const r2 = await waitFor(p1, (r) => r.status === 'betting' && r.round === 2);
  const waited = (Date.now() - t0) / 1000;
  check(r2.round === 2, `auto-advanced to round 2 with no host input (after ~${waited.toFixed(1)}s)`);

  console.log(failed === 0 ? '\nPASS ✅ auto-continue' : `\nFAIL ❌ ${failed}`);
  host.close();
  p1.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
