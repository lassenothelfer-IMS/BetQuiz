'use client';
import { useEffect, useRef, useState } from 'react';

// A sportsbook-style odds pill that briefly flashes and shows a ▲/▼ arrow when
// the multiplier moves, so players feel the pool shifting in real time.
function OddsBadge({ value, dim }) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null); // 'up' | 'down' | null

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (value > before) setDir('up');
    else if (value < before) setDir('down');
    else return;
    const t = setTimeout(() => setDir(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className="odds-pill" data-dir={dir ?? undefined} data-dim={dim || undefined}>
      {dir === 'up' && '▲'}
      {dir === 'down' && '▼'}
      {value.toFixed(2)}×
    </span>
  );
}

// The board of answers with their live odds. Reused by the player's betting panel
// (selectable) and the host/reveal views (read-only).
export default function OddsBoard({
  answers,
  odds,
  selected = null,
  onSelect,
  revealed = false,
  correctAnswer = null,
}) {
  return (
    <ul className="space-y-2.5">
      {answers.map((a, i) => {
        const isCorrect = revealed && i === correctAnswer;
        const isWrong = revealed && i !== correctAnswer;
        const isSelected = selected === i;

        let tone = 'border-white/8 bg-black/30 text-zinc-200';
        if (isCorrect) tone = 'border-emerald-400/70 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.35)]';
        else if (isWrong) tone = 'border-white/5 bg-black/20 text-zinc-500';
        else if (isSelected) tone = 'border-emerald-500 bg-emerald-500/10 text-zinc-50 shadow-[0_0_20px_rgba(16,185,129,0.3)]';

        const Tag = onSelect ? 'button' : 'div';
        return (
          <li key={i}>
            <Tag
              {...(onSelect ? { type: 'button', onClick: () => onSelect(i) } : {})}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition ${tone} ${
                onSelect ? 'hover:border-emerald-500/60 hover:bg-emerald-500/5' : ''
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-bold ${
                    isCorrect
                      ? 'border-emerald-400 bg-emerald-400 text-emerald-950'
                      : isSelected
                        ? 'border-emerald-500 text-emerald-300'
                        : 'border-white/15 text-zinc-500'
                  }`}
                >
                  {isCorrect ? '✓' : String.fromCharCode(65 + i)}
                </span>
                <span className="font-medium">{a}</span>
              </span>
              {odds && <OddsBadge value={odds[i]} dim={isWrong} />}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
