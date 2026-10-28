import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { Recommendation } from '../types';
import { getAdvisorNarrative, AdvisorUnavailableError, type AdvisorResult } from '../services/aiAdvisor';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: AdvisorResult }
  | { status: 'error'; message: string };

/**
 * Map error reasons to user-friendly messages.
 * In development, include diagnostic detail; in production, keep it safe.
 */
function friendlyErrorMessage(err: AdvisorUnavailableError): string {
  const isDev = import.meta.env.DEV;
  const reason = err.reason;
  const provider = err.provider || 'Nebius Token Factory';

  switch (reason) {
    case 'advisor_not_configured':
      return 'AI advisor is not configured. Check NEBIUS_API_KEY / NVIDIA_API_KEY in .env.local.';
    case 'auth_invalid':
      return isDev
        ? `API key rejected by ${provider} (HTTP 401). Verify that your API key in .env.local is valid.`
        : 'AI advisor authentication failed. Please contact the administrator.';
    case 'quota_exhausted':
      return `AI advisor quota exhausted on ${provider}. Please try again later or add credits.`;
    case 'access_denied':
      return isDev
        ? `${provider} access denied (HTTP 403: Authorization failed). Your account lacks backend inference permissions. Verify entitlement on ${provider}.`
        : 'AI advisor access denied (HTTP 403). Upstream account requires inference permissions.';
    case 'model_not_found':
      return isDev
        ? `Model not found (HTTP 404). Check the model identifier in .env.local.`
        : 'AI advisor model unavailable. Please try again later.';
    case 'rate_limited':
      return 'AI advisor is rate-limited. Please wait a moment and try again.';
    case 'provider_error':
      return `${provider} is experiencing issues. Please try again later.`;
    case 'upstream_timeout':
      return 'AI advisor request timed out. Please try again.';
    case 'upstream_unreachable':
      return isDev
        ? `Could not reach ${provider}. Check network connectivity and base URL.`
        : 'AI advisor is temporarily unreachable. Please try again later.';
    case 'network':
      return isDev
        ? 'Network error reaching /api/advisor. Is `vercel dev` running?'
        : 'AI advisor is temporarily unavailable.';
    case 'empty_response':
      return 'AI advisor returned an empty response. Please try again.';
    case 'invalid_model_output':
      return isDev
        ? `AI advisor output failed validation (internal reasoning or planning text was rejected). Detail: ${err.detail || 'invalid format'}.`
        : 'AI advisor output could not be validated. The rule-based recommendation above is unaffected.';
    default:
      return isDev
        ? `AI advisor error: ${reason}${err.upstreamStatus ? ` (HTTP ${err.upstreamStatus})` : ''}${err.detail ? ` — ${err.detail.slice(0, 120)}` : ''}`
        : 'AI advisor is temporarily unavailable. The rule-based recommendation above is unaffected.';
  }
}

export default function AdvisorPanel({ recommendation }: { recommendation: Recommendation }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // Reset when a different recommendation is selected.
  useEffect(() => {
    abortRef.current?.abort();
    setState({ status: 'idle' });
  }, [recommendation.id]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading' });
    try {
      const result = await getAdvisorNarrative(recommendation, controller.signal);
      setState({ status: 'done', result });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof AdvisorUnavailableError
          ? friendlyErrorMessage(err)
          : 'AI advisor is temporarily unavailable. The rule-based recommendation above is unaffected.';
      setState({ status: 'error', message });
    }
  };

  const isNvidia = state.status === 'done' && state.result.provider?.toLowerCase().includes('nvidia');
  const providerLabel = isNvidia
    ? 'AI ADVISOR (NVIDIA NIM / NEMOTRON)'
    : 'AI ADVISOR (NEMOTRON ON NEBIUS)';

  return (
    <div className="mt-7 p-4 border border-slate-200 rounded-3xl text-sm">
      <div className="flex items-center justify-between">
        <div className="uppercase text-xs tracking-wider font-semibold text-slate-500">
          {providerLabel}
        </div>
        <button
          onClick={ask}
          disabled={state.status === 'loading'}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-emerald-200 text-emerald-700 font-semibold text-xs hover:bg-emerald-50 disabled:opacity-60"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {state.status === 'loading' ? 'ASKING...' : 'EXPLAIN THIS'}
        </button>
      </div>
      {state.status === 'done' && (
        <div className="mt-3">
          <div className="leading-snug whitespace-pre-line">{state.result.advice}</div>
          <div className="mt-2 text-xs text-slate-500">
            Generated by {state.result.model} via {state.result.provider || 'Nebius Token Factory'}. Narrative only; it does not change the recommendation.
          </div>
        </div>
      )}
      {state.status === 'error' && <div className="mt-3 text-amber-700">{state.message}</div>}
    </div>
  );
}
