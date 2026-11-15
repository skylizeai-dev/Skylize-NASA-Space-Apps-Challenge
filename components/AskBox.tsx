"use client";

import { useState } from "react";

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
      setAnswer(data.answer ?? "Sorry, I couldn't get an answer just now.");
    } catch {
      setAnswer(
        "The live Q&A is unavailable right now. Try the ranked evidence cards above — every one links to its NASA PSI source."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Ask the data</h3>
      <p className="text-xs text-zinc-500">
        AI-generated from NASA PSI records. Answers only from the dataset shown above.
      </p>
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. Does PMMA ignite more easily at higher oxygen?"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={ask}
          disabled={loading}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </div>
      {answer && (
        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {answer}
        </p>
      )}
    </div>
  );
}
