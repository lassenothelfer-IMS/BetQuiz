'use client';
import { io } from 'socket.io-client';

// One Socket.io connection per browser tab, reused across client-side navigation.
let socket;

export function getSocket() {
  if (!socket) {
    // No URL => connect to the same origin that served the page (our custom server).
    socket = io({ autoConnect: true });

    // Surface connection problems in the console for easy diagnosis in production.
    socket.on('connect', () => console.info('[socket] connected', socket.id));
    socket.on('connect_error', (err) =>
      console.warn('[socket] connect_error:', err?.message || err),
    );
    socket.on('disconnect', (reason) => console.warn('[socket] disconnected:', reason));
  }
  return socket;
}
