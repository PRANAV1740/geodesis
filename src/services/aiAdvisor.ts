import type { Recommendation } from '../types';

export interface AdvisorResult {
  advice: string;
  model: string;
}

export class AdvisorUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`AI advisor unavailable: ${reason}`);
    this.name = 'AdvisorUnavailableError';
  }
}

export function buildAdvisorRequest(rec: Recommendation, audience = 'farmer', language = 'English') {
  return {
    recommendation: {
      title: rec.title,
      confidence: rec.confidence,
      uncertainty: rec.uncertainty,
      expectedYield: rec.expectedYield,
      expectedIncome: rec.expectedIncome,
      waterSavings: rec.waterSavings,
      reasoning: rec.reasoning,
    },
    audience,
    language,
  };
}

/**
 * Asks the Nebius-hosted Nemotron advisor (via /api/advisor) to explain an
 * existing recommendation. Read-only: never alters decision engine output.
 */
export async function getAdvisorNarrative(
  rec: Recommendation,
  signal?: AbortSignal,
  audience?: string,
  language?: string,
): Promise<AdvisorResult> {
  let res: Response;
  try {
    res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAdvisorRequest(rec, audience, language)),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new AdvisorUnavailableError('network');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AdvisorUnavailableError(body.error ?? `http_${res.status}`);
  }

  const data = (await res.json()) as Partial<AdvisorResult>;
  if (!data.advice) throw new AdvisorUnavailableError('empty_response');
  return { advice: data.advice, model: data.model ?? 'unknown' };
}
