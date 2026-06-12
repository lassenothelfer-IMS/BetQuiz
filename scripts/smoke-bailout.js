// Bankruptcy bailout smoke test: a player who busts to 0 gets topped up +50
// before the next round so they can keep playing.
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

  await ack(host, 'quiz:open');
  await ack(host, 'quiz:add', { text: 'Q1', answers: ['A', 'B'], correctAnswer: 0 });
  await ack(host, 'quiz:add', { text: 'Q2', answers: ['A', 'B'], correctAnswer: 0 });

  const r1 = waitFor(p1, (r) => r.status === 'betting');
  await ack(host, 'game:start');
  await r1;

  // Ann goes all-in on the WRONG answer -> busts to 0.
  const reveal = waitFor(p1, (r) => r.status === 'reveal');
  await ack(p1, 'bet:place', { answerId: 1, amount: 1000 });
  const rr = await reveal;
  check(rr.players.find((p) => p.name === 'Ann').points === 0, 'Ann busts to 0 after a wrong all-in');

  // Next round opens with a +50 bail-out.
  const r2 = waitFor(p1, (r) => r.status === 'betting' && r.round === 2);
  await ack(host, 'round:next');
  const b = await r2;
  const ann = b.players.find((p) => p.name === 'Ann');
  check(ann.points === 50, `Ann topped up 0 -> ${ann.points} (+50 bailout)`);
  check(b.bailouts.includes(ann.id), 'bailout flagged for the player');

  console.log(failed === 0 ? '\nPASS ✅ bailout' : `\nFAIL ❌ ${failed} check(s)`);
  host.close();
  p1.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
