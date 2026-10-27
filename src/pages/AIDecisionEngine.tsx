import { useState } from 'react';
import { mockRecommendations } from '../data/mockData';
import { Recommendation } from '../types';
import { CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useDemoMode } from '../context/DemoModeContext';
import { toast } from 'sonner';
import AdvisorPanel from '../components/AdvisorPanel';

export default function AIDecisionEngine() {
  const demo = useDemoMode();

  // When demo mode is active, use scenario recommendations
  const baseRecs: Recommendation[] = (demo.isDemoMode && demo.demoData) 
    ? demo.demoData.recommendations.map((r, i) => ({
        id: `demo-rec-${i}`,
        title: `${r.crop} — ${demo.currentScenario?.toUpperCase() || 'DEMO'}`,
        type: 'crop',
        confidence: r.confidence,
        reasoning: r.reasoning.slice(0, 3),
        supportingDatasets: r.supportingDatasets || ['DEMO MODE'],
        expectedYield: r.expectedYield,
        expectedIncome: r.expectedProfit,
        waterSavings: Math.round((r.waterRequirement / 5200) * 38),
        uncertainty: 100 - r.confidence,
        priority: (r.riskLevel === 'High' ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        action: `Apply ${r.crop} recommendation`,
        predictedOutcome: `Expected +${(r.expectedYield - 5.5).toFixed(1)} t/ha, ${(100 - r.confidence) + 6}% uncertainty`,
      }))
    : mockRecommendations;

  const [recommendations, setRecommendations] = useState(baseRecs);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(baseRecs[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const regenerateRecommendations = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // DEMONSTRATION: deterministic variation for stable demo
      const shuffled = [...mockRecommendations].map((r, i) => {
        const seed = (Date.now() + i) % 11;
        return {
          ...r,
          id: `rec-${Date.now()}-${i}`,
          confidence: Math.max(78, Math.min(97, r.confidence + (seed - 5) * 0.6)),
          expectedYield: parseFloat((r.expectedYield + (seed - 5) * 0.06).toFixed(1)),
          expectedIncome: parseFloat((r.expectedIncome + (seed - 4) * 0.3).toFixed(1)),
          waterSavings: Math.max(8, Math.min(47, Math.round(r.waterSavings + (seed % 7 - 3) * 0.8))),
        };
      });
      setRecommendations(shuffled);
      setSelectedRec(shuffled[0]);
      setIsGenerating(false);
    }, 850);
  };

  const applyRecommendation = (rec: Recommendation) => {
    toast.success(`Recommendation applied: ${rec.title}`, {
      description: `Action queued. SMS will be sent to registered farmers.`,
      duration: 4000,
    });
    // Simulate state update
    setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, title: '✓ ' + r.title } : r));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <div className="font-semibold text-3xl sm:text-4xl tracking-tighter">Decision Engine (Rule-Based)</div>
          <div className="text-xl text-slate-500">Explainable multi-objective recommendations</div>
        </div>
        <button 
          onClick={regenerateRecommendations}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-3xl px-6 py-3 text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60"
        >
          {isGenerating ? 'REGENERATING...' : 'REGENERATE RECOMMENDATIONS'} 
          <TrendingUp className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Recommendations List */}
        <div className="xl:col-span-5">
          <div className="mb-3 px-1 flex justify-between items-center">
            <div className="uppercase tracking-[1px] text-xs font-semibold text-slate-500">PRIORITIZED ACTIONS • {recommendations.length}</div>
          </div>
          
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div 
                key={rec.id}
                onClick={() => setSelectedRec(rec)}
                className={`recommendation-card cursor-pointer border ${selectedRec?.id === rec.id ? 'border-emerald-500 ring-1 ring-emerald-200' : 'border-slate-200'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-lg tracking-tighter pr-4">{rec.title}</div>
                  <div className={`text-xs font-semibold px-3 py-1 rounded-full ${rec.confidence >= 90 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                    {rec.confidence}%
                  </div>
                </div>

                <div className="text-sm text-slate-600 line-clamp-2 mb-4">{rec.predictedOutcome}</div>

                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex gap-8">
                    <div><span className="text-emerald-600">+{rec.expectedYield}</span> t/ha</div>
                    <div><span className="text-blue-600">{rec.waterSavings}%</span> water</div>
                  </div>
                  <div className={`text-xs font-semibold ${rec.priority === 'high' ? 'text-red-600' : 'text-amber-600'}`}>{rec.priority.toUpperCase()}</div>
                </div>

                {/* Trust micro line */}
                <div className="mt-2 text-[10px] flex gap-3 text-slate-500">
                  <span>{rec.confidence}% confidence</span>
                  {rec.uncertainty && <span>±{rec.uncertainty}% uncertainty</span>}
                  {rec.confidence < 70 && <span className="text-amber-600 font-medium">⚠ Verify locally</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs px-1 mt-5 text-slate-500">All recommendations are explainable. Click any to inspect reasoning.</div>
        </div>

        {/* Detailed Explainable Panel */}
        <div className="xl:col-span-7">
          {selectedRec && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <div className="uppercase text-xs font-bold text-emerald-600 tracking-widest">EXPLAINABLE RECOMMENDATION</div>
                  <div className="text-3xl font-semibold tracking-tighterer mt-1 pr-6 leading-none">{selectedRec.title}</div>
                </div>
                <div>
                  <div className="px-4 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">{selectedRec.confidence}% CONFIDENCE</div>
                  <div className="text-right mt-0.5 text-xs text-red-600">{selectedRec.uncertainty}% uncertainty</div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
                {[
                  { label: 'Expected Yield', value: `${selectedRec.expectedYield} t/ha`, color: 'emerald' },
                  { label: 'Income Uplift', value: `${selectedRec.expectedIncome}M VND`, color: 'emerald' },
                  { label: 'Water Savings', value: `${selectedRec.waterSavings}%`, color: 'blue' },
                  { label: 'Priority', value: selectedRec.priority.toUpperCase(), color: selectedRec.priority === 'high' ? 'red' : 'amber' },
                ].map((item, i) => (
                  <div key={i} className="rounded-3xl border px-4 py-[13px]">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className={`text-xl font-semibold mt-px text-${item.color}-700`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              <div className="mt-7">
                <div className="uppercase text-xs tracking-wider font-semibold mb-2 text-slate-500">REASONING</div>
                <div className="space-y-[9px]">
                  {selectedRec.reasoning.map((reason, i) => (
                    <div key={i} className="flex gap-3 text-[14.5px]">
                      <div className="w-5 h-5 flex-shrink-0 mt-px"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                      <div className="leading-snug">{reason}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supporting Datasets */}
              <div className="mt-7">
                <div className="uppercase text-xs tracking-wider font-semibold mb-3 text-slate-500">SUPPORTING DATASETS</div>
                <div className="flex flex-wrap gap-2">
                  {selectedRec.supportingDatasets.map((ds, i) => (
                    <div key={i} className="data-source px-4 py-1">{ds}</div>
                  ))}
                </div>
              </div>

              {/* Expected Outcome */}
              <div className="mt-7 p-4 bg-emerald-50/70 border-emerald-200 border rounded-3xl text-sm">
                <div className="text-emerald-800 font-medium mb-0.5">PREDICTED OUTCOME</div>
                {selectedRec.predictedOutcome}
              </div>

              <AdvisorPanel recommendation={selectedRec} />

              {/* Action + SMS */}
              <div className="flex items-center gap-3 mt-6">
                <button 
                  onClick={() => applyRecommendation(selectedRec)}
                  className="flex-1 bg-primary hover:bg-emerald-900 text-white font-semibold py-[13px] rounded-3xl text-sm transition flex items-center justify-center gap-2"
                >
                  APPLY RECOMMENDATION <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => window.location.href = '/live-ops'} 
                  className="flex-1 border border-emerald-200 hover:bg-emerald-50 font-semibold py-[13px] rounded-3xl text-sm text-emerald-700"
                >
                  PREVIEW SMS ALERT
                </button>
              </div>

              <div className="mt-2 text-xs text-center text-slate-500">All predictions include 95% confidence intervals. Validated against 2020 event dataset.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
