// Smoke test: two headless clients exercise create + join + live room:update.
const { io } = require('socket.io-client');
const URL = 'http://localhost:3000';

function client() {
  return io(URL, { transports: ['websocket'] });
}

(async () => {
  const host = client();
  const guest = client();
  let updates = 0;

  const code = await new Promise((resolve, reject) => {
    host.on('connect_error', reject);
    host.emit('room:create', { name: 'Alex' }, (res) => {
      if (res.error) return reject(new Error(res.error));
      resolve(res.code);
    });
  });
  console.log('host created room:', code);

  const seenBoth = new Promise((resolve) => {
    host.on('room:update', (room) => {
      updates++;
      console.log('host sees players:', room.players.map((p) => p.name).join(', '));
      if (room.players.length === 2) resolve(room);
    });
  });

  guest.emit('room:join', { code, name: 'Sam' }, (res) => {
    if (res.error) console.error('guest join error:', res.error);
    else console.log('guest joined, sees:', res.room.players.map((p) => p.name).join(', '));
  });

  const finalRoom = await seenBoth;
  const ok = finalRoom.players.length === 2 && finalRoom.hostId === host.id;
  console.log(ok ? 'PASS ✅ both players live in room' : 'FAIL ❌');
  host.close();
  guest.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error('ERROR', e.message);
  process.exit(1);
});
