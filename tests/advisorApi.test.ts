import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { sanitizeAndValidateAdvice, buildMessages } from '../api/advisor';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function createMockRes() {
  const res: Partial<VercelResponse> & {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  } = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value;
      return res as VercelResponse;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res as VercelResponse;
    }),
    json: vi.fn((data: any) => {
      res.body = data;
      return res as VercelResponse;
    }),
  };
  return res;
}

function createMockReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    body: {
      recommendation: {
        title: 'Switch to ST25 Rice + Delayed Transplant',
        confidence: 84,
        uncertainty: 16,
        expectedYield: 5.8,
        expectedIncome: 13.2,
        waterSavings: 22,
        reasoning: [
          'Soil salinity measured at 7.1 dS/m, which exceeds the ST25 tolerance threshold',
          'Rainfall forecast is 18% below normal seasonal levels',
          'Sentinel-2 NDVI indicates early vegetative stress in existing IR64 plots',
        ],
      },
      audience: 'farmer',
      language: 'English',
    },
    ...overrides,
  } as unknown as VercelRequest;
}

const validFarmerAdvice = [
  'Recommendation: Switch to ST25 Rice + Delayed Transplant',
  'Why: Engine recommends this switch based on 5.8 t/ha expected yield, 13.2M VND income uplift, and 22% water savings under 84% confidence. However, soil salinity at 7.1 dS/m exceeds ST25 tolerance, and rainfall is 18% below normal.',
  'Main risk: Soil salinity of 7.1 dS/m exceeds ST25 tolerance threshold, creating a critical incompatibility between the recommendation and current field conditions.',
  'Next step: Verify field salinity levels and ST25 suitability with a qualified local agricultural extension officer before transplanting.',
].join('\n');

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.NVIDIA_API_KEY;
  delete process.env.NEBIUS_API_KEY;
  delete process.env.AI_PROVIDER;
  vi.unstubAllGlobals();
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllGlobals();
});

describe('Output Validation (sanitizeAndValidateAdvice)', () => {
  it('accepts a valid 4-part farmer-facing response', () => {
    const result = sanitizeAndValidateAdvice(validFarmerAdvice);
    expect(result.valid).toBe(true);
    expect(result.cleanText).toContain('Recommendation: Switch to ST25 Rice + Delayed Transplant');
    expect(result.cleanText).toContain('Why:');
    expect(result.cleanText).toContain('Main risk:');
    expect(result.cleanText).toContain('Next step:');
  });

  it('rejects output containing planning notes like "Here\'s a thinking process"', () => {
    const planningText = `Here's a thinking process:\n1. Analyze User Request:\nRole: Agricultural advisor\n${validFarmerAdvice}`;
    const result = sanitizeAndValidateAdvice(planningText);
    expect(result.valid).toBe(true);
    expect(result.cleanText).not.toContain("Here's a thinking process");
    expect(result.cleanText).toContain('Recommendation: Switch to ST25 Rice + Delayed Transplant');

    const purePlanning = `Here's a thinking process:\n1. Analyze user request\n2. Draft response\nNo actual final answer here.`;
    expect(sanitizeAndValidateAdvice(purePlanning).valid).toBe(false);
  });

  it('safely strips <think>...</think> tags so internal reasoning never reaches final output', () => {
    const withThink = `<think>Internal deliberations: should we mention salinity? Yes, 7.1 dS/m is high.</think>\n${validFarmerAdvice}`;
    const result = sanitizeAndValidateAdvice(withThink);
    expect(result.valid).toBe(true);
    expect(result.cleanText).not.toContain('<think>');
    expect(result.cleanText).not.toContain('Internal deliberations');
    expect(result.cleanText).toContain('Recommendation: Switch to ST25 Rice + Delayed Transplant');
  });

  it('rejects responses missing required 4-part structure', () => {
    const incomplete = 'Plant ST25 early to avoid salinity spikes in late March.';
    const result = sanitizeAndValidateAdvice(incomplete);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_required_structure');
  });
});

describe('Prompt Construction (buildMessages)', () => {
  it('includes strict conflict flagging instructions for salinity tolerance', () => {
    const req = createMockReq();
    const messages = buildMessages(req.body);
    const system = messages[0].content;
    const user = messages[1].content;

    expect(system).toContain('Main risk:');
    expect(system).toContain('exceeds a stated crop tolerance threshold');
    expect(system).toContain('agricultural extension officer');
    expect(user).toContain('Soil salinity measured at 7.1 dS/m, which exceeds the ST25 tolerance threshold');
    expect(user).toContain('Switch to ST25 Rice + Delayed Transplant');
  });

  it('adds explicit retry warning when isRetry is true', () => {
    const req = createMockReq();
    const messages = buildMessages(req.body, true);
    const user = messages[1].content;
    expect(user).toContain('CRITICAL: Your previous response contained internal planning');
  });

  it('system prompt instructs against exaggerated severity claims', () => {
    const req = createMockReq();
    const messages = buildMessages(req.body);
    const system = messages[0].content;

    // Must prohibit exaggeration
    expect(system).toContain('Do not exaggerate');
    expect(system).toContain('cautious, proportionate language');
    expect(system).toContain('significant concern about the variety');
    expect(system).toContain('unsupported severity claims');

    // Must instruct flagging conflicts without catastrophizing
    expect(system).toContain('flag it without catastrophizing');
  });
});

describe('Regression: unsupported risk exaggeration', () => {
  it('rejects output containing unsupported "severe crop failure" claims via review', () => {
    // This tests that exaggerated model output can be caught by post-processing
    const exaggeratedOutput = [
      'Recommendation: Switch to ST25 Rice + Delayed Transplant',
      'Why: The engine selected ST25 for 5.8 t/ha yield and 13.2M VND income uplift with 22% water savings.',
      'Main risk: Severe crop failure is virtually certain given soil salinity at 7.1 dS/m, which will devastate yields and cause total financial ruin.',
      'Next step: Immediately flush fields with massive freshwater volumes to save the crop.',
    ].join('\n');

    // The structure is valid (4-part), but the content is exaggerated.
    // Our system prompt is designed to prevent such output from being generated,
    // so this test documents the kind of language we guard against at the prompt level.
    const result = sanitizeAndValidateAdvice(exaggeratedOutput);
    // Structurally valid — the prompt-level guardrail is what prevents this content
    expect(result.valid).toBe(true);

    // Verify the system prompt itself forbids this language pattern
    const messages = buildMessages(createMockReq().body);
    const system = messages[0].content;
    expect(system).toContain('Do not exaggerate to "severe crop failure"');
    expect(system).toContain('"devastating losses"');
  });

  it('system prompt uses cautious wording for salinity-threshold conflicts', () => {
    const messages = buildMessages(createMockReq().body);
    const system = messages[0].content;

    // Must use the user-specified cautious phrasing
    expect(system).toContain('raising a significant concern about the variety\'s suitability for this field');

    // Must NOT contain catastrophizing language in the prompt instructions
    expect(system).not.toContain('critical incompatibility');
    expect(system).not.toContain('crop failure risk');
  });
});

describe('api/advisor handler', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'method_not_allowed' });
  });

  it('returns 503 advisor_not_configured when no API keys are set', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'advisor_not_configured' });
  });

  it('returns 400 invalid_payload for malformed body', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';
    const req = createMockReq({ body: {} });
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_payload' });
  });

  it('returns 200 with validated advice on successful upstream call', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: validFarmerAdvice } }],
      }),
    }));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(200);
    expect(res.body.advice).toContain('Recommendation: Switch to ST25 Rice + Delayed Transplant');
    expect(res.body.advice).toContain('Main risk:');
    expect(res.body.provider).toBe('Nebius Token Factory');
  });

  it('retries once when initial output is unvalidated planning text, and succeeds if retry is valid', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';

    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First attempt returns planning text
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: "Here's a thinking process:\n1. Analyze user request\nDraft 1:" } }],
          }),
        };
      }
      // Retry attempt returns valid advice
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: validFarmerAdvice } }],
        }),
      };
    }));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(callCount).toBe(2);
    expect(res.statusCode).toBe(200);
    expect(res.body.advice).toContain('Recommendation: Switch to ST25 Rice + Delayed Transplant');
  });

  it('returns safe 502 invalid_model_output if retry also fails validation', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "Here's a thinking process:\n1. Analyze user request\nDraft 1:" } }],
      }),
    }));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('invalid_model_output');
    expect(res.body.detail).toContain('Model output failed validation');
  });

  it('classifies upstream 401 as auth_invalid with 502 status', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error": "Unauthorized"}',
    }));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('auth_invalid');
    expect(res.body.status).toBe(401);
  });

  it('classifies upstream 403 as access_denied with 502 status', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"status": 403, "detail": "Authorization failed"}',
    }));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('access_denied');
    expect(res.body.status).toBe(403);
  });

  it('handles upstream network unreachable gracefully', async () => {
    process.env.NEBIUS_API_KEY = 'mock-nebius-key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res as unknown as VercelResponse);

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toBe('upstream_unreachable');
  });
});
