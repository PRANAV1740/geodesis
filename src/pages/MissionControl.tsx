
import { Link } from 'react-router-dom';
import { Activity, MapPin, TrendingUp, AlertTriangle, Users, Clock, ArrowRight } from 'lucide-react';
import PipelineVisualizer from '../components/PipelineVisualizer';
import { currentSatelliteData, mockRecommendations, provinces } from '../data/mockData';

export default function MissionControl() {

  const liveMetrics = {
    points: currentSatelliteData.length,
    provinces: provinces.length,
    avgSalinity: (currentSatelliteData.reduce((a, b) => a + b.salinity, 0) / currentSatelliteData.length).toFixed(1),
    highRisk: currentSatelliteData.filter(p => p.salinity > 6).length,
  };

  const today = new Date()
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full whitespace-nowrap">LIVE • {today}</div>
            <div className="font-semibold tracking-tighter text-3xl sm:text-5xl">Mission Control</div>
          </div>
          <div className="text-lg text-slate-500 mt-1">Real-time satellite data ingestion &amp; decision pipeline</div>
        </div>
        <Link to="/live-ops" className="flex items-center gap-2 text-sm px-5 py-2 border border-slate-300 rounded-3xl hover:bg-white transition">
          Open Live Operations <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Live Status */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="font-semibold">Live Operations Status</div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-1">
                <div className="status-dot online" /> ALL SYSTEMS NOMINAL
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-emerald-700 font-semibold">+ 5,312 pts</div>
              <div className="text-xs text-slate-500">last 90 mins</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {[
              { label: 'Satellite Points', value: liveMetrics.points, icon: MapPin },
              { label: 'Provinces Covered', value: liveMetrics.provinces, icon: Users },
              { label: 'Avg Salinity', value: `${liveMetrics.avgSalinity} dS/m`, icon: TrendingUp },
              { label: 'High Risk Zones', value: liveMetrics.highRisk, icon: AlertTriangle },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-3xl p-4">
                  <div className="mt-0.5"><Icon className="w-4 h-4 text-slate-400" /></div>
                  <div>
                    <div className="text-xs text-slate-500">{m.label}</div>
                    <div className="text-2xl font-semibold tracking-tightererer text-slate-900">{m.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t text-xs flex flex-wrap gap-x-6 text-slate-500">
            <div><span className="font-medium text-slate-800">6</span> Data Sources</div>
            <div><span className="font-medium text-slate-800">98.3%</span> Data Validity</div>
            <div><span className="font-medium text-slate-800">42s</span> Latency</div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-7">
          <PipelineVisualizer 
            autoPlay={true} 
          />
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-12 grid md:grid-cols-3 gap-8">
          <Link to="/gis-map" className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <MapPin className="w-7 h-7 text-emerald-700" />
              <ArrowRight className="group-hover:translate-x-0.5 transition" />
            </div>
            <div className="mt-auto">
              <div className="font-semibold text-xl tracking-tighterer">Interactive GIS Map</div>
              <div className="text-sm text-slate-500">Real-time layers, timeline, province boundaries</div>
            </div>
          </Link>

          <Link to="/ai-engine" className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <Activity className="w-7 h-7 text-emerald-700" />
              <ArrowRight className="group-hover:translate-x-0.5 transition" />
            </div>
            <div className="mt-auto">
              <div className="font-semibold text-xl tracking-tighterer">Decision Engine (Rule-Based)</div>
              <div className="text-sm text-slate-500">Explainable recommendations with full confidence metrics</div>
            </div>
          </Link>

          <Link to="/historical" className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <Clock className="w-7 h-7 text-emerald-700" />
              <ArrowRight className="group-hover:translate-x-0.5 transition" />
            </div>
            <div className="mt-auto">
              <div className="font-semibold text-xl tracking-tighterer">Historical Replay</div>
              <div className="text-sm text-slate-500">2016 &amp; 2020 Salinity Crisis Simulations</div>
            </div>
          </Link>
        </div>

        {/* Top Recommendations */}
        <div className="lg:col-span-12">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="font-semibold tracking-tighterer text-xl">Latest Recommendations</div>
            <Link to="/ai-engine" className="text-sm text-emerald-700 font-medium flex items-center gap-1">VIEW FULL ENGINE <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {mockRecommendations.map((rec, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{rec.title}</div>
                  <div className={`px-2.5 py-px text-xs font-bold rounded-lg ${rec.confidence > 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {rec.confidence}%
                  </div>
                </div>
                
                <div className="text-sm text-slate-600 mt-2 mb-4 leading-tight">{rec.predictedOutcome}</div>

                <div className="flex justify-between text-xs">
                  <div>
                    <div className="font-medium text-emerald-700">+{rec.expectedYield} t/ha</div>
                    <div className="text-[10px]">Yield</div>
                  </div>
                  <div>
                    <div className="font-medium text-emerald-700">{rec.waterSavings}%</div>
                    <div className="text-[10px]">Water saved</div>
                  </div>
                  <div>
                    <div className="font-medium text-emerald-700">{rec.expectedIncome}M VND</div>
                    <div className="text-[10px]">Income uplift</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
