import type { Recommendation } from '../types';

export interface AdvisorResult {
  advice: string;
  model: string;
  provider?: string;
}

export class AdvisorUnavailableError extends Error {
  /** Machine-readable reason code from the backend */
  public readonly reason: string;
  /** Upstream HTTP status if available */
  public readonly upstreamStatus?: number;
  /** Safe detail string for local debugging */
  public readonly detail?: string;
  /** Upstream provider name (e.g., 'NVIDIA API Catalog' or 'Nebius Token Factory') */
  public readonly provider?: string;
  /** Upstream model identifier */
  public readonly model?: string;

  constructor(
    reason: string,
    upstreamStatus?: number,
    detail?: string,
    provider?: string,
    model?: string,
  ) {
    super(`AI advisor unavailable: ${reason}`);
    this.name = 'AdvisorUnavailableError';
    this.reason = reason;
    this.upstreamStatus = upstreamStatus;
    this.detail = detail;
    this.provider = provider;
    this.model = model;
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
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      status?: number;
      detail?: string;
      model?: string;
      provider?: string;
      host?: string;
    };
    throw new AdvisorUnavailableError(
      body.error ?? `http_${res.status}`,
      body.status,
      body.detail,
      body.provider,
      body.model,
    );
  }

  const data = (await res.json()) as Partial<AdvisorResult>;
  if (!data.advice) throw new AdvisorUnavailableError('empty_response', undefined, undefined, data.provider, data.model);
  return {
    advice: data.advice,
    model: data.model ?? 'unknown',
    provider: data.provider ?? 'NVIDIA API Catalog',
  };
}
