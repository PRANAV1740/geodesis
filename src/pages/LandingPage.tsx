import { Link } from 'react-router-dom';
import { ArrowRight, Satellite, Users, TrendingUp, Shield, Globe, Zap } from 'lucide-react';
import { currentSatelliteData, provinces } from '../data/mockData';

export default function LandingPage() {
  const stats = [
    { value: String(provinces.length), label: "Provinces", unit: "Mekong Delta (demo data)" },
    { value: String(currentSatelliteData.length), label: "Satellite points", unit: "sample observations" },
    { value: "4.1", label: "t/ha yield lift", unit: "modelled scenario" },
    { value: "39%", label: "Water savings", unit: "modelled scenario" },
  ];

  const features = [
    { icon: Satellite, title: "Multi-Satellite Fusion", desc: "Sentinel-1/2, MODIS, CHIRPS, MONRE ground truth fused in real time." },
    { icon: Zap, title: "Explainable AI", desc: "Every recommendation includes confidence, reasoning and supporting datasets." },
    { icon: Users, title: "Role-Specific Dashboards", desc: "Tailored for farmers, cooperatives, government agencies and researchers." },
    { icon: TrendingUp, title: "Economic Impact Engine", desc: "Yield, income, water savings and cost-benefit analysis in every decision." },
    { icon: Shield, title: "Salinity & Climate Resilience", desc: "Historical replay of 2016 & 2020 crises with predictive modeling." },
    { icon: Globe, title: "Transparent Data", desc: "Every value shows its source, confidence and last-updated time." },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden border-b bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(#14532D_0.5px,transparent_1px)] bg-[length:5px_5px] opacity-[0.035]"></div>
        
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-16 sm:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-emerald-600 rounded-full mr-2 animate-pulse"></div>
              2026 INTERNATIONAL HACKATHON • VIETNAM
            </div>
            
            <h1 className="text-5xl sm:text-[68px] font-semibold tracking-tighter leading-none mb-6">
              MEKONG<br />SMART LAND
            </h1>
            <p className="text-2xl text-slate-600 tracking-tight mb-2">Satellite-powered Climate Decision Intelligence</p>
            <p className="text-xl text-slate-500 max-w-md">Salinity, weather and market signals turned into clear crop decisions for the Mekong Delta.</p>

            <div className="flex flex-wrap items-center gap-4 mt-10">
              <Link 
                to="/mission-control" 
                className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 h-14 bg-primary hover:bg-emerald-900 active:bg-emerald-950 transition-all text-white font-semibold rounded-3xl text-lg shadow-sm"
              >
                Open Intelligence Platform <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/gis-map" 
                className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 h-14 border border-slate-300 hover:bg-slate-50 font-medium rounded-3xl text-lg"
              >
                Explore Live GIS Map
              </Link>
            </div>

            <div className="mt-8 text-sm text-slate-500 flex items-center gap-x-5">
              <div>Demonstration platform</div>
              <div>•</div>
              <div>Rule-based, explainable scoring</div>
            </div>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col">
                <div className="text-4xl sm:text-5xl font-semibold tracking-tighter text-primary">{stat.value}</div>
                <div>
                  <div className="font-medium text-slate-700">{stat.label}</div>
                  <div className="text-xs text-slate-500">{stat.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="flex items-center gap-4 mb-9">
          <div className="uppercase tracking-[2px] text-xs font-semibold text-primary">Core Capabilities</div>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="group p-7 border border-slate-200 hover:border-emerald-200 bg-white rounded-3xl transition-all">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 flex items-center justify-center rounded-2xl mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-xl mb-2 tracking-tight">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed text-[15px]">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Overview */}
      <div className="bg-white border-y">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
          <div className="flex flex-wrap gap-4 justify-between items-end mb-8">
            <div>
              <div className="text-xs tracking-[1px] font-semibold text-emerald-700">END-TO-END PIPELINE</div>
              <div className="text-3xl sm:text-5xl font-semibold tracking-tight mt-1">From Orbit to Farmer SMS</div>
            </div>
            <Link to="/mission-control" className="text-sm font-medium flex items-center gap-1 text-primary hover:underline">
              View Full Platform <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              'Satellite Data', 'Validation', 'ML Prediction', 
              'Decision Intelligence', 'SMS Alerts'
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl">
                <div className="w-7 h-7 flex-shrink-0 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">{idx + 1}</div>
                <div className="font-medium text-sm leading-tight">{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Personas */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <div className="mb-9">
          <div className="uppercase tracking-wider text-xs text-slate-500 mb-1">BUILT FOR EVERY STAKEHOLDER</div>
          <div className="text-3xl sm:text-5xl font-semibold tracking-tighter">Dedicated workflows for 4 user roles</div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { role: 'Farmer', title: 'Nguyen Van Minh', subtitle: 'Chau Doc, An Giang', link: '/dashboards/farmer', color: 'emerald' },
            { role: 'Cooperative', title: 'Kien Giang Rice Coop', subtitle: '167k ha under management', link: '/dashboards/cooperative', color: 'blue' },
            { role: 'Government', title: 'MARD — Ministry', subtitle: 'Policy & Provincial Coordination', link: '/dashboards/government', color: 'violet' },
            { role: 'Researcher', title: 'Can Tho University', subtitle: 'Climate & Agronomy Research', link: '/dashboards/researcher', color: 'amber' },
          ].map((persona, i) => (
            <Link 
              to={persona.link} 
              key={i} 
              className="group border border-slate-200 bg-white hover:border-slate-300 px-8 py-7 rounded-3xl flex flex-col justify-between transition-all"
            >
              <div>
                <div className={`inline-block text-xs font-semibold tracking-[1px] rounded-full px-3 py-1 mb-5 bg-${persona.color}-100 text-${persona.color}-700`}>
                  {persona.role.toUpperCase()}
                </div>
                <div className="font-semibold tracking-tight text-xl group-hover:text-emerald-700 transition-colors">{persona.title}</div>
                <div className="text-sm text-slate-500 mt-0.5">{persona.subtitle}</div>
              </div>
              <div className="mt-auto pt-6 text-xs flex items-center gap-2 text-emerald-700 font-medium">
                OPEN DASHBOARD <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
        <div className="bg-primary text-white rounded-3xl px-9 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-white/70 text-sm font-medium">TRY IT</div>
            <div className="text-3xl font-semibold tracking-tighter mt-1">Explore the platform and map.</div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/mission-control" className="bg-white hover:bg-slate-100 active:bg-white px-7 py-3 text-primary font-semibold rounded-3xl">Open Intelligence Platform</Link>
            <Link to="/gis-map" className="bg-white/10 hover:bg-white/20 border border-white/30 px-7 py-3 text-white font-medium rounded-3xl">Open Interactive Map</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
