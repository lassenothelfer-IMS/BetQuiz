'use client';
import { useMemo } from 'react';

// A burst of paper chips when a bet hits. Pure CSS animation, no dependency.
const COLORS = ['#ffb000', '#2ee06a', '#ff3b3b', '#f1e9d2', '#ffc94d'];

export default function Confetti({ count = 44 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        dx: `${(Math.random() - 0.5) * 120}px`,
        delay: Math.random() * 0.3,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto h-0 max-w-lg overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animationDelay: `${p.delay}s`,
            '--dx': p.dx,
          }}
        />
      ))}
    </div>
  );
}
