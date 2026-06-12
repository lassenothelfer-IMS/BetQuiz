'use client';
import { useEffect, useRef, useState } from 'react';

// Amber tote-board odds that tick and flash green/red when the pool moves.
function OddsLed({ value, dim }) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null);

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
    <span className="odds-led" data-dir={dir ?? undefined} data-dim={dim || undefined}>
      {dir === 'up' && '▲'}
      {dir === 'down' && '▼'}
      {value.toFixed(2)}
    </span>
  );
}

// The board of runners (answers) with live odds. Reused by the betting panel
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
    <div className="space-y-2">
      {answers.map((a, i) => {
        const isCorrect = revealed && i === correctAnswer;
        const isWrong = revealed && i !== correctAnswer;
        const isSelected = selected === i;

        const state = isCorrect
          ? 'correct'
          : isWrong
            ? 'wrong'
            : isSelected
              ? 'selected'
              : 'open';

        const Tag = onSelect ? 'button' : 'div';
        return (
          <Tag
            key={i}
            {...(onSelect ? { type: 'button', onClick: () => onSelect(i) } : {})}
            data-state={state}
            className={`pick-row w-full text-left ${onSelect ? 'selectable' : ''}`}
          >
            <span className="pick-key">{isCorrect ? '✓' : String.fromCharCode(65 + i)}</span>
            <span className="flex flex-1 items-center px-3 py-3 font-semibold uppercase tracking-wide">
              {a}
            </span>
            <span className="flex items-center pr-2">
              {odds && <OddsLed value={odds[i]} dim={isWrong} />}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}
