import { NextRequest, NextResponse } from "next/server";
import findingsData from "@/data/findings.json";
import type { Finding } from "@/lib/schema";

const findings = findingsData as Finding[];

const FALLBACK_ANSWER =
  "The live Q&A is unavailable right now. Browse the ranked evidence cards above — every one links to its NASA PSI source.";

// Guardrail: this route only ever answers from the verified findings/investigations
// JSON shipped in /data. It never invents a number or a citation. If no API key is
// configured, or the call fails, it falls back to a canned, honest response.
export async function POST(request: NextRequest) {
  let question: string | undefined;
  try {
    const body = await request.json();
    question = typeof body?.question === "string" ? body.question.trim() : undefined;
  } catch {
    return NextResponse.json({ answer: FALLBACK_ANSWER }, { status: 400 });
  }

  if (!question) {
    return NextResponse.json(
      { answer: "Ask a question about the atmospheres or fuels above." },
      { status: 400 }
    );
  }

  const apiKey = process.env.LLM_API_KEY;
  const verified = findings.filter((f) => f.source_checked);

  if (!apiKey || verified.length === 0) {
    return NextResponse.json({ answer: FALLBACK_ANSWER });
  }

  try {
    // TODO: wire to the chosen LLM provider. Pass only `verified` findings (plus
    // investigations.json for context) as the model's sole source; require it to
    // cite finding IDs and to say "not in the dataset" when records don't cover it.
    return NextResponse.json({ answer: FALLBACK_ANSWER });
  } catch {
    return NextResponse.json({ answer: FALLBACK_ANSWER });
  }
}
