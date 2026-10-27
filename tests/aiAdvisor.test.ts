import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildAdvisorRequest, getAdvisorNarrative, AdvisorUnavailableError } from '../src/services/aiAdvisor';
import type { Recommendation } from '../src/types';

const rec: Recommendation = {
  id: 'r1',
  title: 'ST25 Rice',
  type: 'crop',
  confidence: 90,
  reasoning: ['Salinity within tolerance'],
  supportingDatasets: ['SoilGrids'],
  expectedYield: 6.2,
  expectedIncome: 12.5,
  waterSavings: 20,
  uncertainty: 10,
  priority: 'high',
  action: 'Plant',
  predictedOutcome: 'Good',
};

afterEach(() => vi.unstubAllGlobals());

describe('aiAdvisor', () => {
  it('sends only the fields the advisor needs', () => {
    const req = buildAdvisorRequest(rec);
    expect(req.recommendation).not.toHaveProperty('id');
    expect(req.recommendation.title).toBe('ST25 Rice');
  });

  it('returns advice on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ advice: 'Plant early.', model: 'm' }) }));
    await expect(getAdvisorNarrative(rec)).resolves.toEqual({ advice: 'Plant early.', model: 'm' });
  });

  it('surfaces the server error code when unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: 'advisor_not_configured' }) }));
    await expect(getAdvisorNarrative(rec)).rejects.toMatchObject({ reason: 'advisor_not_configured' });
    await expect(getAdvisorNarrative(rec)).rejects.toBeInstanceOf(AdvisorUnavailableError);
  });
});
