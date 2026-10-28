/**
 * POST /api/advisor — Narrative advisor powered by Nebius Token Factory / NVIDIA API Catalog.
 *
 * Runs server-side only so API keys never reach the browser bundle.
 * The advisor only *explains* recommendations already produced by the rule-based
 * decision engine; it never changes or re-ranks them.
 *
 * Env (set in Vercel Project Settings → Environment Variables, or .env.local):
 *   NEBIUS_API_KEY / NVIDIA_API_KEY   required
 *   NEBIUS_MODEL / NVIDIA_MODEL       optional, model id (defaults to nvidia/Nemotron-3_5-Lightning)
 *   NEBIUS_BASE_URL / NVIDIA_BASE_URL optional, OpenAI-compatible base URL
 *   AI_PROVIDER                       optional, 'nebius' | 'nvidia'
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_NEBIUS_BASE_URL = 'https://api.tokenfactory.nebius.com/v1';
const DEFAULT_NEBIUS_MODEL = 'nvidia/Nemotron-3_5-Lightning';

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NVIDIA_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';

const MAX_BODY_BYTES = 16_000;
const UPSTREAM_TIMEOUT_MS = 40_000;

export interface AdvisorRecommendation {
  title: string;
  confidence: number;
  uncertainty: number;
  expectedYield: number;
  expectedIncome: number;
  waterSavings: number;
  reasoning: string[];
}

export interface AdvisorPayload {
  recommendation: AdvisorRecommendation;
  audience: string;
  language: string;
}

export interface ProviderConfig {
  name: string;
  providerId: 'nebius' | 'nvidia';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ValidationResult {
  valid: boolean;
  cleanText: string;
  reason?: string;
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function parsePayload(raw: unknown): AdvisorPayload | null {
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

export function buildMessages(p: AdvisorPayload, isRetry = false) {
  const { recommendation: r } = p;

  const systemContent = [
    'You are a concise agricultural advisor for Mekong Delta farmers.',
    'Explain the decision engine recommendation plainly and honestly in clear English under 120 words.',
    'Provide ONLY the final 4-part explanation using this exact structure:',
    '',
    'Recommendation: <Restate the recommendation title verbatim. Do not change, rerank, or replace it.>',
    'Why: <Brief explanation using ONLY the supplied engine reasoning and metrics. Do not invent numbers or claims.>',
    'Main risk: <Cautious, evidence-grounded statement of the primary reported risk. If a reported value (e.g. soil salinity) exceeds a stated crop tolerance threshold, note this as "raising a significant concern about the variety\'s suitability for this field." Do not exaggerate to "severe crop failure", "devastating losses", or other unsupported severity claims. State only what the supplied evidence supports.>',
    'Next step: <One practical action supported by the evidence. Recommend consulting a qualified local agricultural extension officer to verify field conditions and crop suitability before transplanting. Do not invent unverified agronomic practices, flooding schedules, or soil amendment procedures.>',
    '',
    'STRICT RULES:',
    '- Total response must be under 120 words.',
    '- Use ONLY the facts provided in the prompt. Do not invent numbers, rainfall data, or financial guarantees.',
    '- Do not exaggerate risks or invent unsupported outcomes. Use cautious, proportionate language.',
    '- When a conflict exists between the recommendation and the evidence, clearly flag it without catastrophizing.',
    '- Do not alter or rerank the rule-based recommendation.',
    '- Never output chain-of-thought, scratchpads, planning notes, draft refinement, or word counts.',
    '- Never begin with "Here\'s a thinking process", "Let me analyze", "Step-by-step reasoning", or "Draft".',
    '- Do not reproduce prompt instructions or describe how the response was built.',
    '- Output ONLY the 4 required lines, starting immediately with "Recommendation:".',
  ].join('\n');

  const userLines = [
    `Audience: ${p.audience}. Reply in ${p.language}.`,
    `Recommendation: ${r.title}`,
    `Metrics: Expected yield ${r.expectedYield} t/ha; income uplift ${r.expectedIncome}M VND; water savings ${r.waterSavings}%; confidence ${r.confidence}% (uncertainty ${r.uncertainty}%)`,
    'Engine reasoning facts:',
    ...r.reasoning.map((x) => `- ${x}`),
  ];

  if (isRetry) {
    userLines.push(
      '',
      'CRITICAL: Your previous response contained internal planning or lacked the exact 4-part structure.',
      'Output ONLY the final 4 lines for the farmer now, starting directly with "Recommendation:". No preamble, no thinking process.'
    );
  }

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userLines.join('\n') },
  ];
}

/**
 * Sanitizes and validates model output to ensure planning notes or chain-of-thought
 * are never presented to the farmer as final advice.
 */
export function sanitizeAndValidateAdvice(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, cleanText: '', reason: 'empty_response' };
  }

  // 1. Strip HTML reasoning/scratchpad tags
  let text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<scratchpad>[\s\S]*?<\/scratchpad>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .trim();

  // 2. Detect planning/scratchpad indicators
  const planningPatterns = [
    /here['’]?s\s+a\s+thinking\s+process/i,
    /thinking\s+process\s*:/i,
    /\bmental\s+refinement\b/i,
    /\bdeconstruct\s+(?:the\s+)?requirements\b/i,
    /\banalyze\s+user\s+(?:request|input)\b/i,
    /\bcheck\s+constraints\b/i,
    /\bword\s+count\s*:/i,
    /\bdraft\s+\d+\s*:/i,
    /step-by-step\s+reasoning/i,
  ];

  const hasPlanningMarker = planningPatterns.some((pattern) => pattern.test(text));

  // If planning markers exist at the start, check if an isolated clean 4-part block exists at the end
  if (hasPlanningMarker) {
    const recIndex = text.search(/(?:^|\n)\s*(?:\*\*)?Recommendation\s*:\s*(?:\*\*)?/i);
    if (recIndex !== -1) {
      const candidate = text.slice(recIndex).trim();
      if (!planningPatterns.some((pattern) => pattern.test(candidate))) {
        text = candidate;
      }
    }
  }

  // Still contains planning notes?
  if (planningPatterns.some((pattern) => pattern.test(text))) {
    return { valid: false, cleanText: '', reason: 'contains_planning_notes' };
  }

  // Check for prompt template placeholder leakage
  if (/<\s*(?:Restate|Brief explanation|Honest statement|Give one practical action)[^>]*>/i.test(text)) {
    return { valid: false, cleanText: '', reason: 'contains_prompt_template_placeholders' };
  }

  // 3. Verify required 4-part structure
  const hasRec = /(?:^|\n)\s*(?:\*\*)?Recommendation\s*:\s*(?:\*\*)?/i.test(text);
  const hasWhy = /(?:^|\n)\s*(?:\*\*)?Why\s*:\s*(?:\*\*)?/i.test(text);
  const hasRisk = /(?:^|\n)\s*(?:\*\*)?Main\s+risk\s*:\s*(?:\*\*)?/i.test(text);
  const hasNext = /(?:^|\n)\s*(?:\*\*)?Next\s+step\s*:\s*(?:\*\*)?/i.test(text);

  if (!hasRec || !hasWhy || !hasRisk || !hasNext) {
    return { valid: false, cleanText: '', reason: 'missing_required_structure' };
  }

  // 4. Normalize markdown bolding on headers for clean presentation
  const formatted = text
    .replace(/(?:^|\n)\s*\*\*Recommendation:\*\*\s*/gi, '\nRecommendation: ')
    .replace(/(?:^|\n)\s*\*\*Why:\*\*\s*/gi, '\nWhy: ')
    .replace(/(?:^|\n)\s*\*\*Main risk:\*\*\s*/gi, '\nMain risk: ')
    .replace(/(?:^|\n)\s*\*\*Next step:\*\*\s*/gi, '\nNext step: ')
    .trim();

  // 5. Ensure word count does not exceed limit
  const wordCount = formatted.split(/\s+/).filter(Boolean).length;
  if (wordCount > 150) {
    return { valid: false, cleanText: '', reason: 'exceeds_length_limit' };
  }

  return { valid: true, cleanText: formatted };
}

/**
 * Classify upstream HTTP errors into safe, user-facing categories.
 */
export function classifyUpstreamError(status: number): string {
  if (status === 401) return 'auth_invalid';
  if (status === 402) return 'quota_exhausted';
  if (status === 403) return 'access_denied';
  if (status === 404) return 'model_not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500 && status < 600) return 'provider_error';
  return 'upstream_error';
}

export function resolveProvider(): ProviderConfig | null {
  const explicit = (process.env.AI_PROVIDER || '').trim().toLowerCase();

  const nebiusKey = process.env.NEBIUS_API_KEY && !process.env.NEBIUS_API_KEY.startsWith('nvapi-')
    ? process.env.NEBIUS_API_KEY
    : (explicit === 'nebius' ? process.env.NEBIUS_API_KEY : '');
  const nvidiaKey = process.env.NVIDIA_API_KEY || (process.env.NEBIUS_API_KEY?.startsWith('nvapi-') && explicit !== 'nebius' ? process.env.NEBIUS_API_KEY : '');

  if (explicit === 'nebius' || (!explicit && nebiusKey)) {
    const key = process.env.NEBIUS_API_KEY || nebiusKey;
    if (!key) return null;
    return {
      name: 'Nebius Token Factory',
      providerId: 'nebius',
      apiKey: key,
      baseUrl: (process.env.NEBIUS_BASE_URL || DEFAULT_NEBIUS_BASE_URL).replace(/\/+$/, ''),
      model: process.env.NEBIUS_MODEL || DEFAULT_NEBIUS_MODEL,
    };
  }

  if (explicit === 'nvidia' || (!explicit && nvidiaKey)) {
    const key = nvidiaKey || process.env.NVIDIA_API_KEY || process.env.NEBIUS_API_KEY;
    if (!key) return null;
    return {
      name: 'NVIDIA API Catalog',
      providerId: 'nvidia',
      apiKey: key,
      baseUrl: (process.env.NVIDIA_BASE_URL || process.env.NEBIUS_BASE_URL || DEFAULT_NVIDIA_BASE_URL).replace(/\/+$/, ''),
      model: process.env.NVIDIA_MODEL || process.env.NEBIUS_MODEL || DEFAULT_NVIDIA_MODEL,
    };
  }

  const anyKey = process.env.NEBIUS_API_KEY || process.env.NVIDIA_API_KEY;
  if (!anyKey) return null;

  const isNv = anyKey.startsWith('nvapi-') && explicit !== 'nebius';
  return {
    name: isNv ? 'NVIDIA API Catalog' : 'Nebius Token Factory',
    providerId: isNv ? 'nvidia' : 'nebius',
    apiKey: anyKey,
    baseUrl: isNv
      ? (process.env.NVIDIA_BASE_URL || DEFAULT_NVIDIA_BASE_URL).replace(/\/+$/, '')
      : (process.env.NEBIUS_BASE_URL || DEFAULT_NEBIUS_BASE_URL).replace(/\/+$/, ''),
    model: isNv
      ? (process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL)
      : (process.env.NEBIUS_MODEL || DEFAULT_NEBIUS_MODEL),
  };
}

async function fetchUpstream(config: ProviderConfig, payload: AdvisorPayload, isRetry = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages: buildMessages(payload, isRetry),
      temperature: 0.1,
      max_tokens: 500,
    };

    // If using Nebius Token Factory with reasoning models, disable internal reasoning effort
    if (config.providerId === 'nebius') {
      requestBody.reasoning_effort = 'none';
    }

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return { ok: true as const, res };
  } catch (err) {
    clearTimeout(timeout);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return { ok: false as const, isTimeout, err };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Ensure local env files are loaded in development if not already present in process.env
  const proc = process as unknown as { loadEnvFile?: (path?: string) => void };
  if (!process.env.NEBIUS_API_KEY && !process.env.NVIDIA_API_KEY && typeof proc.loadEnvFile === 'function') {
    try {
      proc.loadEnvFile('.env.local');
    } catch {
      try {
        proc.loadEnvFile('.env');
      } catch {
        // Ignored in deployed environments where env vars are injected by host
      }
    }
  }

  const config = resolveProvider();
  if (!config) {
    console.error('advisor: neither NEBIUS_API_KEY nor NVIDIA_API_KEY is configured');
    return res.status(503).json({ error: 'advisor_not_configured' });
  }

  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  if (body && body.length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'payload_too_large' });
  }

  let payload: AdvisorPayload | null = null;
  try {
    const raw = typeof req.body === 'object' ? req.body : JSON.parse(body || '{}');
    payload = parsePayload(raw);
  } catch {
    payload = null;
  }
  if (!payload) return res.status(400).json({ error: 'invalid_payload' });

  // 1. Initial Upstream Attempt
  let attempt = await fetchUpstream(config, payload, false);
  if (!attempt.ok) {
    console.error('advisor upstream unreachable:', attempt.isTimeout ? 'timeout' : (attempt.err instanceof Error ? attempt.err.message : 'unknown'));
    return res.status(502).json({
      error: attempt.isTimeout ? 'upstream_timeout' : 'upstream_unreachable',
      provider: config.name,
      model: config.model,
    });
  }

  if (!attempt.res.ok) {
    const detail = (await attempt.res.text().catch(() => '')).slice(0, 300);
    const category = classifyUpstreamError(attempt.res.status);
    console.error(`advisor upstream error [${category}]`, attempt.res.status, detail);
    return res.status(502).json({
      error: category,
      status: attempt.res.status,
      detail,
      model: config.model,
      provider: config.name,
      host: new URL(config.baseUrl).host,
    });
  }

  let data = (await attempt.res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let rawContent = data.choices?.[0]?.message?.content || '';
  let validation = sanitizeAndValidateAdvice(rawContent);

  // 2. Retry Attempt if initial output failed validation
  if (!validation.valid) {
    console.warn(`advisor output failed initial validation (${validation.reason}), attempting retry...`);
    attempt = await fetchUpstream(config, payload, true);
    if (attempt.ok && attempt.res.ok) {
      data = (await attempt.res.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      rawContent = data.choices?.[0]?.message?.content || '';
      validation = sanitizeAndValidateAdvice(rawContent);
    }
  }

  // If still invalid after retry, return safe distinct error
  if (!validation.valid) {
    console.error(`advisor output failed validation after retry: ${validation.reason}`);
    return res.status(502).json({
      error: 'invalid_model_output',
      detail: `Model output failed validation: ${validation.reason}`,
      provider: config.name,
      model: config.model,
    });
  }

  return res.status(200).json({
    advice: validation.cleanText,
    model: config.model,
    provider: config.name,
  });
}
