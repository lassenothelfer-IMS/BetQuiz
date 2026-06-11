// Custom server: hosts the Next.js app AND the Socket.io server in one process.
// All real-time game traffic flows through Socket.io; Next handles normal HTTP/SSR.
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const { registerSocketHandlers } = require('./server/socketHandlers');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer);
  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`> BetQuiz ready on http://${hostname}:${port} (${dev ? 'dev' : 'production'})`);
  });
});
