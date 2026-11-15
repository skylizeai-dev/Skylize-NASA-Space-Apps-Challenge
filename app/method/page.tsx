import Link from "next/link";

export default function MethodPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <Link href="/" className="w-fit text-sm font-medium text-orange-700 hover:underline dark:text-orange-400">
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        How ranking works, and its limits
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Ranking formula</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          For a selected atmosphere (oxygen %, pressure, airflow) and a finding
          with its own test conditions:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
{`closeness = 1 - mean(|O-o|/O_range, |P-p|/P_range, |F-f|/F_range)   // skip null terms
score     = closeness x (safety_relevance / 3) x completeness
completeness = (non-null condition fields) / 3`}
        </pre>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Findings are sorted by <code>score</code>, highest first. A finding
          missing a condition field is penalized through completeness, never
          through a guessed value.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Safety relevance</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Each finding is tagged 1–3 by a human reviewer: 3 = directly informs
          material flammability or extinguishment, 2 = informs detection or
          flame behavior, 1 = fundamental combustion science only.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Data gaps</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The oxygen x pressure plane is divided into a grid. A cell with zero
          verified findings is a gap; 1-2 findings is &quot;thin&quot;; 3+ is
          covered. A gap is not evidence of safety — it means NASA&apos;s
          public combustion archive has little or no data there yet.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">What this tool is not</h2>
        <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
          <li>Not a combustion simulator or predictive model.</li>
          <li>Not a certified safety tool or a source of design limits.</li>
          <li>Not a replacement for the PSI repository — a way into it.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Data integrity rules</h2>
        <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
          <li>A missing value is shown as &quot;not reported&quot;, never guessed.</li>
          <li>A finding ships only once a human has verified it against the NASA source.</li>
          <li>Every card links directly to its PSI record.</li>
        </ul>
      </section>
    </main>
  );
}
