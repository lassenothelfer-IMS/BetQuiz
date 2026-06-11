// Betting smoke test: host + two players run a betting round end to end. Asserts
// live odds movement, locked odds-at-bet, contrarian payout, scoring, re-betting.
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
  const p2 = c();

  const { code } = await ack(host, 'room:create', { name: 'Quizmaster' });
  await ack(p1, 'room:join', { code, name: 'Ann' });
  await ack(p2, 'room:join', { code, name: 'Bob' });

  await ack(host, 'quiz:open');
  await ack(host, 'quiz:add', { text: '2 + 2 = ?', answers: ['4', '5', '22'], correctAnswer: 0 });

  const opened = waitFor(p1, (r) => r.status === 'betting');
  await ack(host, 'game:start');
  const start = await opened;
  check(JSON.stringify(start.odds) === JSON.stringify([3, 3, 3]), `baseline odds = 3,3,3 (${start.odds})`);

  const annBet = await ack(p1, 'bet:place', { answerId: 0, amount: 100 });
  check(annBet.ok && annBet.oddsAtBet === 3, `Ann locks odds 3.00 betting first (${annBet.oddsAtBet})`);

  const afterBob = waitFor(host, (r) => r.betCount === 2);
  await ack(p2, 'bet:place', { answerId: 0, amount: 300 });
  const liveRoom = await afterBob;
  check(liveRoom.odds[0] < 3, `live odds on crowded answer dropped below 3 (${liveRoom.odds[0]})`);

  const rebet = await ack(p2, 'bet:place', { answerId: 1, amount: 200 });
  check(rebet.ok, 're-betting allowed while open');

  const revealed = waitFor(p1, (r) => r.status === 'reveal');
  await ack(host, 'question:reveal');
  const rr = await revealed;
  check(rr.correctAnswer === 0, 'correct answer revealed = 0');

  const ann = rr.players.find((p) => p.name === 'Ann');
  const bob = rr.players.find((p) => p.name === 'Bob');
  check(ann.points === 1000 + 300, `Ann 1000 -> ${ann.points} (won +300)`);
  check(bob.points === 1000 - 200, `Bob 1000 -> ${bob.points} (lost -200)`);

  const hostP = rr.players.find((p) => p.name === 'Quizmaster');
  check(hostP.points === 1000, 'host stays at 1000 (moderates, no bet)');

  console.log(failed === 0 ? '\nPASS ✅ betting round' : `\nFAIL ❌ ${failed} check(s)`);
  [host, p1, p2].forEach((s) => s.close());
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
