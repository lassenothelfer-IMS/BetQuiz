'use client';
import { useState } from 'react';

// Host-only form for composing a question: the text, 2–6 answers, and which
// answer is correct. Calls onSubmit(payload, ack) where ack receives any
// server-side validation error.
const MAX_ANSWERS = 6;

export default function QuestionForm({
  title = '🎩 Set the question',
  submitLabel = 'Open the betting 🎲',
  resetOnSuccess = false,
  onSubmit,
}) {
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const [correct, setCorrect] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function reset() {
    setText('');
    setAnswers(['', '']);
    setCorrect(0);
  }

  const setAnswer = (i, v) => setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
  const addAnswer = () => setAnswers((a) => (a.length < MAX_ANSWERS ? [...a, ''] : a));
  const removeAnswer = (i) => {
    if (answers.length <= 2) return;
    setAnswers((a) => a.filter((_, j) => j !== i));
    setCorrect((c) => (c === i ? 0 : c > i ? c - 1 : c));
  };

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return setError('Enter a question.');
    if (answers.some((a) => !a.trim())) return setError('Fill in every answer.');
    setError('');
    setBusy(true);
    onSubmit({ text: text.trim(), answers: answers.map((a) => a.trim()), correctAnswer: correct }, (res) => {
      setBusy(false);
      if (res?.error) setError(res.error);
      else if (resetOnSuccess) reset();
    });
  }

  return (
    <form onSubmit={submit} className="panel w-full max-w-lg space-y-5 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your question…"
        rows={2}
        className="field w-full resize-none px-3 py-2.5"
      />

      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Tap the coin to mark the correct answer.</p>
        {answers.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrect(i)}
              aria-label="Mark correct"
              title="Mark correct"
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition ${
                correct === i
                  ? 'border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                  : 'border-white/20 text-zinc-600 hover:border-emerald-500/60'
              }`}
            >
              {correct === i ? '✓' : String.fromCharCode(65 + i)}
            </button>
            <input
              value={a}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder={`Answer ${i + 1}`}
              className="field flex-1 px-3 py-2.5"
            />
            {answers.length > 2 && (
              <button
                type="button"
                onClick={() => removeAnswer(i)}
                aria-label="Remove answer"
                className="px-2 text-zinc-500 transition hover:text-rose-400"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {answers.length < MAX_ANSWERS && (
          <button
            type="button"
            onClick={addAnswer}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
          >
            + Add answer
          </button>
        )}
      </div>

      {error && <p className="text-sm font-medium text-rose-400">{error}</p>}

      <button disabled={busy} className="btn-bet w-full px-4 py-3.5 text-base">
        {submitLabel}
      </button>
    </form>
  );
}
