/**
 * POST /api/advisor — Nebius (NVIDIA Nemotron) narrative advisor.
 *
 * Runs server-side only so NEBIUS_API_KEY never reaches the browser bundle.
 * The advisor only *explains* recommendations already produced by the rule-based
 * decision engine; it never changes or re-ranks them.
 *
 * Env (set in Vercel Project Settings → Environment Variables, or .env.local):
 *   NEBIUS_API_KEY   required
 *   NEBIUS_MODEL     optional, Nemotron model id from the Nebius catalog
 *   NEBIUS_BASE_URL  optional, OpenAI-compatible base URL
 */

const DEFAULT_BASE_URL = 'https://api.tokenfactory.nebius.com/v1';
const DEFAULT_MODEL = 'nvidia/Llama-3_1-Nemotron-Ultra-253B-v1';
const MAX_BODY_BYTES = 16_000;
const UPSTREAM_TIMEOUT_MS = 25_000;

interface AdvisorRecommendation {
  title: string;
  confidence: number;
  uncertainty: number;
  expectedYield: number;
  expectedIncome: number;
  waterSavings: number;
  reasoning: string[];
}

interface AdvisorPayload {
  recommendation: AdvisorRecommendation;
  audience: string;
  language: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parsePayload(raw: unknown): AdvisorPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = (raw as Record<string, unknown>).recommendation;
  if (!rec || typeof rec !== 'object') return null;
  const r = rec as Record<string, unknown>;
  const title = str(r.title, 200);
  if (!title) return null;

  return {
    recommendation: {
      title,
      confidence: num(r.confidence),
      uncertainty: num(r.uncertainty),
      expectedYield: num(r.expectedYield),
      expectedIncome: num(r.expectedIncome),
      waterSavings: num(r.waterSavings),
      reasoning: Array.isArray(r.reasoning)
        ? r.reasoning.slice(0, 8).map((x) => str(x, 300)).filter(Boolean)
        : [],
    },
    audience: str((raw as Record<string, unknown>).audience, 40) || 'farmer',
    language: str((raw as Record<string, unknown>).language, 20) || 'English',
  };
}

function buildMessages(p: AdvisorPayload) {
  const { recommendation: r } = p;
  return [
    {
      role: 'system',
      content:
        'You are an agricultural advisor for Mekong Delta farmers facing salinity and climate risk. ' +
        'You are given a recommendation already computed by a rule-based decision engine. ' +
        'Explain it plainly, flag the main risk, and suggest one practical next step. ' +
        'Do not change the recommendation, invent numbers, or give financial guarantees. ' +
        'Keep it under 120 words.',
    },
    {
      role: 'user',
      content:
        `Audience: ${p.audience}. Reply in ${p.language}.\n` +
        `Recommendation: ${r.title}\n` +
        `Confidence: ${r.confidence}% (uncertainty ${r.uncertainty}%)\n` +
        `Expected yield: ${r.expectedYield} t/ha; income uplift: ${r.expectedIncome}M VND; ` +
        `water savings: ${r.waterSavings}%\n` +
        `Engine reasoning:\n${r.reasoning.map((x) => `- ${x}`).join('\n')}`,
    },
  ];
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.NEBIUS_API_KEY;
  if (!apiKey) return json({ error: 'advisor_not_configured' }, 503);

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'payload_too_large' }, 413);

  let payload: AdvisorPayload | null = null;
  try {
    payload = parsePayload(JSON.parse(text));
  } catch {
    payload = null;
  }
  if (!payload) return json({ error: 'invalid_payload' }, 400);

  const model = process.env.NEBIUS_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.NEBIUS_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildMessages(payload),
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) return json({ error: 'upstream_error', status: upstream.status }, 502);

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const advice = data.choices?.[0]?.message?.content?.trim();
    if (!advice) return json({ error: 'empty_response' }, 502);

    return json({ advice, model });
  } catch {
    return json({ error: 'upstream_unreachable' }, 502);
  }
}

export function GET(): Response {
  return json({ error: 'method_not_allowed' }, 405);
}
