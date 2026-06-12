'use client';
import { useState } from 'react';

// Host-only question editor: the prompt, 2–6 answers, and which is correct.
// Calls onSubmit(payload, ack); ack carries any server-side validation error.
const MAX_ANSWERS = 6;

export default function QuestionForm({
  title = 'Write a Question',
  submitLabel = '▸ Add',
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
    <form onSubmit={submit} className="board w-full">
      <div className="board-hd">
        <span>{title}</span>
        <span className="font-mono text-ash">Mark the correct one</span>
      </div>
      <div className="space-y-4 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question…"
          rows={2}
          className="input-board w-full resize-none px-3 py-2.5 font-sans"
        />

        <div className="space-y-2">
          {answers.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(i)}
                aria-label="Mark correct"
                className={`grid h-9 w-9 shrink-0 place-items-center border-2 font-display text-sm ${
                  correct === i
                    ? 'border-up bg-up text-ink'
                    : 'border-steel text-ash hover:border-board'
                }`}
              >
                {correct === i ? '✓' : String.fromCharCode(65 + i)}
              </button>
              <input
                value={a}
                onChange={(e) => setAnswer(i, e.target.value)}
                placeholder={`Answer ${i + 1}`}
                className="input-board h-9 flex-1 px-3 font-sans"
              />
              {answers.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeAnswer(i)}
                  aria-label="Remove"
                  className="px-2 text-ash hover:text-down"
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
              className="font-mono text-xs uppercase tracking-widest text-board hover:text-board-bright"
            >
              + Add answer
            </button>
          )}
        </div>

        {error && <p className="font-mono text-xs uppercase text-down">{error}</p>}

        <button disabled={busy} className="btn-slam w-full px-4 py-3">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
