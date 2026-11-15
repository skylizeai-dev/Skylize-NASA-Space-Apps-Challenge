"use client";

import { useState } from "react";

// Scoped Q&A. Rendered only when NEXT_PUBLIC_ASK_ENABLED=1, so the dashboard
// never shows a question box that cannot answer.
export default function AskBox() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? "No answer came back. The ranked evidence above is unaffected.");
    } catch {
      setAnswer("The assistant is unavailable. The ranked evidence above is unaffected.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Ask about these findings"
      className="flex flex-col gap-3 rounded-lg border border-l-2 border-line border-l-ai bg-surface p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Ask about these findings</h2>
        <p className="text-xs text-ai">AI-generated from NASA PSI records</p>
      </div>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          aria-label="Your question"
          placeholder="Ask about these findings…"
          className="flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="button"
          onClick={ask}
          disabled={loading}
          className="rounded-md border border-line bg-surface-2 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </div>
      {answer && <p className="text-sm text-ink-2">{answer}</p>}
    </section>
  );
}
