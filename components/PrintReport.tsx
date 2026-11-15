import { NEAR, type Coverage } from "@/lib/coverage";
import { APP_NAME } from "@/lib/config";
import { FLOW_LABEL, OUTCOME_META, fmtNum, investigationLabel } from "@/lib/format";
import { CONDITION_RANGES } from "@/lib/rank";
import type { Atmosphere, Investigation, ScoredFinding } from "@/lib/schema";
import { STATUS_COPY, coverageHeadline, outcomeHeadline } from "./AnswerStrip";
import type { Implication } from "./Implications";

interface Props {
  atmosphere: Atmosphere;
  presetLabel: string;
  coverage: Coverage;
  top: ScoredFinding[];
  findings: ScoredFinding[];
  filterNote: string | null;
  implications: Implication[];
  citedCount: number;
  investigations: Map<string, Investigation>;
  printedAt: string;
  url: string;
}

// The PDF: one page-ready report of the evidence for the selected atmosphere.
// Only shown when printing, so it never affects the screen layout. Every
// finding carries its source URL in full, because a printed page has no links.
export default function PrintReport({
  atmosphere,
  presetLabel,
  coverage,
  top,
  findings,
  filterNote,
  implications,
  citedCount,
  investigations,
  printedAt,
  url,
}: Props) {
  const used = Array.from(new Set(findings.map((f) => f.investigation_id)));

  return (
    <article className="print-report hidden">
      <header>
        <h1>{APP_NAME}: microgravity fire evidence for one atmosphere</h1>
        <p className="meta">
          {presetLabel} · {fmtNum(atmosphere.oxygen_pct)} % O₂ ·{" "}
          {fmtNum(atmosphere.pressure_kpa)} kPa · {fmtNum(atmosphere.flow_cm_s)} cm/s airflow
        </p>
        <p className="meta">
          Generated {printedAt} · {url}
        </p>
      </header>

      <section>
        <h2>Coverage: {STATUS_COPY[coverage.status].label}</h2>
        <p>{coverageHeadline(coverage)}</p>
        <p>
          Close range is ±{NEAR.oxygen_pct} % O₂ and ±{NEAR.pressure_kpa} kPa. A gap is not
          evidence of safety: it means this dataset holds no source-checked finding there.
        </p>
        {top.length > 0 && <p>{outcomeHeadline(top)}</p>}
      </section>

      {implications.length > 0 && citedCount >= 3 && (
        <section>
          <h2>Safety implications</h2>
          <p className="meta">
            AI-generated from this dataset&apos;s NASA records, based on {citedCount} source-checked findings. The
            ranking, the coverage verdict and the map use no AI.
          </p>
          <ul>
            {implications.map((item) => (
              <li key={item.implication}>
                <strong>{item.implication}</strong> {item.evidence} [{item.ids.join(", ")}]
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Ranked evidence</h2>
        <p className="meta">
          {findings.length} source-checked findings, closest test conditions first.
          {filterNote ? ` Filtered: ${filterNote}.` : ""}
        </p>
        <table>
          <colgroup>
            <col className="c-rank" />
            <col />
            <col className="c-fuel" />
            <col className="c-num" />
            <col className="c-num" />
            <col className="c-num" />
            <col className="c-outcome" />
            <col className="c-score" />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Finding</th>
              <th>Fuel</th>
              <th>O₂ %</th>
              <th>kPa</th>
              <th>cm/s</th>
              <th>Outcome</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, i) => (
              <tr key={f.id}>
                <td>{i + 1}</td>
                <td>
                  <strong>
                    {investigationLabel(f.investigation_id)} {f.id}
                  </strong>
                  <br />
                  {f.finding}
                  <br />
                  <span className="meta">
                    Flow {f.flow_direction === "unknown" ? "not reported" : FLOW_LABEL[f.flow_direction]} ·
                    closeness {f.closeness.toFixed(2)} × relevance{" "}
                    {(f.safety_relevance / 3).toFixed(2)} × completeness{" "}
                    {f.completeness.toFixed(2)} · source: {f.source_quote_location} ·{" "}
                    {f.source_url}
                  </span>
                </td>
                <td>{f.fuel}</td>
                <td>{f.oxygen_pct === null ? "n/r" : fmtNum(f.oxygen_pct)}</td>
                <td>{f.pressure_kpa === null ? "n/r" : fmtNum(f.pressure_kpa)}</td>
                <td>{f.flow_cm_s === null ? "n/r" : fmtNum(f.flow_cm_s)}</td>
                <td>{OUTCOME_META[f.outcome].label}</td>
                <td>{f.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta">n/r = not reported by the source. It is never guessed.</p>
      </section>

      <section>
        <h2>Method</h2>
        <p>
          closeness = 1 − mean( |O−o| / {CONDITION_RANGES.oxygen_pct}, |P−p| /{" "}
          {CONDITION_RANGES.pressure_kpa}, |F−f| / {CONDITION_RANGES.flow_cm_s} ), skipping
          conditions the source does not report. relevance = safety relevance (1, 2 or 3) / 3.
          completeness = reported conditions / 3. score = closeness × relevance × completeness.
        </p>
        <p>
          Every value was compared with its cited source document; that check was AI-assisted, and
          independent human review of each row is tracked separately and is not yet complete.
        </p>
      </section>

      <section>
        <h2>NASA investigations used</h2>
        <ul>
          {used.map((id) => {
            const inv = investigations.get(id);
            return (
              <li key={id}>
                <strong>{investigationLabel(id)}</strong>
                {inv ? ` — ${inv.name}, ${inv.platform}, ${inv.years}. ${inv.psi_url}` : ""}
              </li>
            );
          })}
        </ul>
      </section>

      <footer>
        <p className="meta">
          Evidence tool, not a source of design limits. Built for the NASA Space Apps Challenge
          2026 by team Skylize, and not affiliated with NASA.
        </p>
      </footer>
    </article>
  );
}
