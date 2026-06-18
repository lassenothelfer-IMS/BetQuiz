// Quick-build smoke test: host generates a random card by count + genre, and the
// host-only quiz list reflects it.
const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';
const c = () => io(URL, { transports: ['websocket'] });
const ack = (s, e, p) => new Promise((res) => s.emit(e, p, res));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failed = 0;
const check = (cond, msg) => {
  console.log((cond ? '  ok  - ' : '  FAIL- ') + msg);
  if (!cond) failed++;
};

(async () => {
  const host = c();
  const lists = [];
  host.on('quiz:questions', (l) => lists.push(l)); // host-only authored list
  const last = () => lists[lists.length - 1] || [];

  const { code } = await ack(host, 'room:create', { name: 'Host' });
  await ack(host, 'quiz:open');

  // 8 random from any genre
  const r1 = await ack(host, 'quiz:random', { count: 8, category: 'All' });
  await wait(150);
  check(r1.ok === true, 'quiz:random accepted');
  check(last().length === 8, `generated exactly 8 questions (got ${last().length})`);

  // 5 random from a specific genre -> replaces the card
  await ack(host, 'quiz:random', { count: 5, category: 'Science' });
  await wait(150);
  check(last().length === 5, `regenerating replaces the card (got ${last().length})`);
  const wellFormed = last().every(
    (q) => q.text && q.answers.length >= 2 && q.correctAnswer >= 0 && q.correctAnswer < q.answers.length,
  );
  check(wellFormed, 'all generated questions are well-formed');

  // asking for more than a small genre has just clamps to what's available
  await ack(host, 'quiz:random', { count: 20, category: 'Food & Drink' });
  await wait(150);
  check(last().length > 0 && last().length <= 6, `count clamps to genre size (got ${last().length})`);

  const start = await ack(host, 'game:start');
  check(start.ok === true, 'game starts from a quick-built card');

  console.log(failed === 0 ? '\nPASS ✅ quick build' : `\nFAIL ❌ ${failed}`);
  host.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error('\nERROR', e.message);
  process.exit(1);
});
