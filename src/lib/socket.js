'use client';
import { io } from 'socket.io-client';

// One Socket.io connection per browser tab, reused across client-side navigation.
let socket;

export function getSocket() {
  if (!socket) {
    // No URL => connect to the same origin that served the page (our custom server).
    socket = io({ autoConnect: true });
  }
  return socket;
}
