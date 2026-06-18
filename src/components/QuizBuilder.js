'use client';
import { useMemo, useState } from 'react';
import pool from '@/data/questionPool.json';
import QuestionForm from './QuestionForm';

// Host's pre-show RUNDOWN: assemble the whole card before going live. Pull from
// the pool, write your own, then call the show on.
const CATEGORIES = ['All', ...Array.from(new Set(pool.map((q) => q.category)))];

const QB_COUNTS = [5, 10, 15, 20];

export default function QuizBuilder({ questions, onAddPool, onAddCustom, onQuickBuild, onRemove, onStart }) {
  const [category, setCategory] = useState('All');
  const [qbCount, setQbCount] = useState(10);
  const [qbCat, setQbCat] = useState('All');
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => (category === 'All' ? pool : pool.filter((q) => q.category === category)),
    [category],
  );
  const ack = (res) => res?.error && setError(res.error);

  return (
    <div className="fade-in w-full max-w-2xl space-y-5">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-board">Build the card</p>
        <h1 className="headline mt-2 text-4xl">Tonight&apos;s Rundown</h1>
      </div>

      {/* Quick build — deal a random card */}
      <div className="board">
        <div className="board-hd">
          <span>⚡ Quick Build</span>
          <span className="font-mono text-ash">random card</span>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ash">How many</p>
            <div className="flex gap-2">
              {QB_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQbCount(n)}
                  className={`stake h-10 flex-1 text-sm`}
                  data-active={qbCount === n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ash">Genre</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setQbCat(c)}
                  className={`border-2 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-widest ${
                    qbCat === c ? 'border-board bg-board text-ink' : 'border-steel text-ash hover:border-board'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onQuickBuild(qbCount, qbCat, ack)}
            className="btn-slam w-full px-4 py-3"
          >
            ⚡ Deal {qbCount} {qbCat === 'All' ? 'random' : qbCat} ▸
          </button>
          <p className="text-center font-mono text-[0.58rem] uppercase tracking-[0.18em] text-ash">
            Replaces the card with a fresh random set
          </p>
        </div>
      </div>

      {/* The card + go-live */}
      <div className="board">
        <div className="board-hd">
          <span>The Card</span>
          <span className="led text-sm">{questions.length}</span>
        </div>
        {questions.length === 0 ? (
          <p className="p-6 text-center font-mono text-xs uppercase tracking-wide text-ash">
            Empty rundown — add questions below ▾
          </p>
        ) : (
          <div>
            {questions.map((q) => (
              <div key={q.index} className="rank-row">
                <span className="rank-num text-sm">{q.index + 1}</span>
                <span className="flex-1 truncate text-sm text-chalk">{q.text}</span>
                <span className="font-mono text-xs text-up">✓ {q.answers[q.correctAnswer]}</span>
                <button onClick={() => onRemove(q.index, ack)} className="px-1 text-ash hover:text-down">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t-2 border-steel p-3">
          <button onClick={onStart} disabled={questions.length === 0} className="btn-slam w-full px-4 py-3.5">
            {questions.length === 0
              ? 'Add a question to go live'
              : `● Go live · ${questions.length} Q${questions.length === 1 ? '' : 's'}`}
          </button>
          {error && <p className="mt-2 text-center font-mono text-xs uppercase text-down">{error}</p>}
        </div>
      </div>

      {/* Pool */}
      <div className="board">
        <div className="board-hd">
          <span>The Wire — Question Pool</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`border-2 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-widest ${
                  category === cat
                    ? 'border-board bg-board text-ink'
                    : 'border-steel text-ash hover:border-board'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filtered.map((q) => (
              <li key={q.id} className="flex items-center gap-3 border-2 border-steel bg-ink px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-chalk">{q.text}</p>
                  <p className="font-mono text-[0.6rem] uppercase tracking-widest text-ash">{q.category}</p>
                </div>
                <button onClick={() => onAddPool(q.id, ack)} className="btn-slam ghost shrink-0 px-3 py-1.5 text-sm">
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <QuestionForm title="Write Your Own" submitLabel="▸ Add to card" resetOnSuccess onSubmit={onAddCustom} />
    </div>
  );
}
