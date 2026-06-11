'use client';
import { useMemo, useState } from 'react';
import pool from '@/data/questionPool.json';
import QuestionForm from './QuestionForm';

// Host-only build phase (Kahoot-style): assemble the whole quiz before kickoff.
// Pick ready-made questions from the pool, write your own, then start the game.
const CATEGORIES = ['All', ...Array.from(new Set(pool.map((q) => q.category)))];

export default function QuizBuilder({ questions, onAddPool, onAddCustom, onRemove, onStart }) {
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');

  const filtered = useMemo(
    () => (category === 'All' ? pool : pool.filter((q) => q.category === category)),
    [category],
  );

  const ack = (res) => res?.error && setError(res.error);

  return (
    <div className="fade-in w-full max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black">
          <span className="wordmark">Build your quiz</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Add questions from the pool or write your own, then deal them in.
        </p>
      </div>

      {/* Authored quiz + start */}
      <div className="panel p-5">
        <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <span>🃏 Your quiz</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-emerald-300">{questions.length}</span>
        </h2>
        {questions.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No questions yet — add some below. 👇
          </p>
        ) : (
          <ol className="space-y-2">
            {questions.map((q) => (
              <li
                key={q.index}
                className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2"
              >
                <span className="w-5 text-center font-mono text-sm text-zinc-500">{q.index + 1}</span>
                <span className="flex-1 truncate text-sm text-zinc-100">{q.text}</span>
                <span className="font-mono text-xs text-emerald-400/70">✓ {q.answers[q.correctAnswer]}</span>
                <button
                  onClick={() => onRemove(q.index, ack)}
                  aria-label="Remove"
                  className="px-1 text-zinc-500 transition hover:text-rose-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
        <button
          onClick={onStart}
          disabled={questions.length === 0}
          className="btn-bet mt-4 w-full px-4 py-3.5 text-base"
        >
          {questions.length === 0
            ? 'Add a question to start'
            : `🎲 Start game · ${questions.length} question${questions.length === 1 ? '' : 's'}`}
        </button>
        {error && <p className="mt-2 text-center text-sm text-rose-400">{error}</p>}
      </div>

      {/* Pool picker */}
      <div className="panel p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          📚 Pick from the pool
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                category === c
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {filtered.map((q) => (
            <li
              key={q.id}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-100">{q.text}</p>
                <p className="text-xs text-zinc-500">{q.category}</p>
              </div>
              <button
                onClick={() => onAddPool(q.id, ack)}
                className="btn-ghost shrink-0 px-3 py-1.5 text-sm"
              >
                + Add
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Custom question */}
      <QuestionForm
        title="✍️ Write your own"
        submitLabel="+ Add to quiz"
        resetOnSuccess
        onSubmit={onAddCustom}
      />
    </div>
  );
}
