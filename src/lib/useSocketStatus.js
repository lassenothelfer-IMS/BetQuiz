'use client';
import { useEffect, useState } from 'react';
import { getSocket } from './socket';

// Tracks the live connection state so the UI can tell the user when the game
// server is unreachable (instead of buttons silently doing nothing).
// Returns 'connecting' | 'online' | 'offline'.
export function useSocketStatus() {
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const s = getSocket();
    if (s.connected) setStatus('online');

    const onConnect = () => setStatus('online');
    const onDown = () => setStatus('offline');

    s.on('connect', onConnect);
    s.on('disconnect', onDown);
    s.on('connect_error', onDown);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDown);
      s.off('connect_error', onDown);
    };
  }, []);

  return status;
}
