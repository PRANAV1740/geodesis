import { useState, useEffect } from 'react';
import { mockSMSAlerts, currentSatelliteData, provinces } from '../data/mockData';
import { SMSAlert } from '../types';
import { Send, Clock, CheckCircle } from 'lucide-react';
import GISMapComponent from '../components/GISMapComponent';
import { useDemoMode } from '../context/DemoModeContext';

export default function LiveOperations() {
  const [alerts, setAlerts] = useState<SMSAlert[]>(mockSMSAlerts);
  const [sending, setSending] = useState(false);
  const [newAlert, setNewAlert] = useState({ recipient: '', phone: '', message: '' });

  const demo = useDemoMode();
  const [livePoints, setLivePoints] = useState(currentSatelliteData);

  // DEMO MODE: override live data with scenario values
  const effectiveLivePoints = (demo.isDemoMode && demo.demoData)
    ? currentSatelliteData.map(p => ({
        ...p,
        salinity: demo.demoData!.soil.salinity,
        rainfall: demo.demoData!.weather.current.rainfall,
        temperature: demo.demoData!.weather.current.temp,
      }))
    : livePoints;

  // Demo SMS preview
  const demoSmsMessage = demo.isDemoMode && demo.demoData 
    ? demo.demoData.smsPreview 
    : null;

  useEffect(() => {
    // DEMONSTRATION live stream (deterministic variation)
    let tick = 0;
    const interval = setInterval(() => {
      tick = (tick + 1) % 9;
      setLivePoints(prev => prev.map((p, i) => ({
        ...p,
        salinity: Math.max(0.5, Math.min(13, p.salinity + ((tick + i) % 7 - 3) * 0.28)),
        rainfall: Math.max(3, Math.min(72, p.rainfall + ((tick * 2 + i) % 5 - 2) * 1.4)),
      })));
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const sendNewAlert = () => {
    if (!newAlert.recipient || !newAlert.phone) return;
    
    setSending(true);
    setTimeout(() => {
      const alert: SMSAlert = {
        id: `sms-${Date.now()}`,
        recipient: newAlert.recipient,
        phone: newAlert.phone,
        message: newAlert.message || `URGENT: Salinity update for your area. Check full analysis on mekong.ai. Priority: HIGH.`,
        timestamp: new Date().toISOString().slice(0,16).replace('T', ' '),
        priority: 'high',
        status: 'sent',
      };
      setAlerts(prev => [alert, ...prev]);
      setNewAlert({ recipient: '', phone: '', message: '' });
      setSending(false);
    }, 650);
  };

  const markDelivered = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'delivered' } : a));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-semibold text-3xl sm:text-5xl tracking-tighter">Live Operations Center</div>
            <div className="px-3 text-xs py-1 bg-red-100 text-red-700 rounded-full font-bold">LIVE</div>
          </div>
          <div className="text-xl text-slate-500">Real-time monitoring, alerting and dispatch</div>
        </div>
        <div className="text-xs px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-3xl font-medium flex items-center gap-1.5">
          <div className="status-dot online"></div> 12,983 active sessions
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Live Map + Stats */}
        <div className="xl:col-span-7">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-md transition-all">
            <div className="pb-3 flex flex-wrap gap-2 justify-between">
              <div>
                <div className="font-semibold">Live Satellite Feed</div>
                <div className="text-xs text-slate-500">Updating every 3.8s • 10 provinces</div>
              </div>
              <div className="text-xs flex items-center gap-1 text-emerald-700 font-medium">
                <Clock className="w-3.5 h-3.5" /> LIVE DATA STREAM
              </div>
            </div>
            <GISMapComponent data={effectiveLivePoints} showTimeline={false} height="410px" />
          </div>
        </div>

        {/* Operations Stats */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="font-semibold mb-4 text-sm">OPERATIONS DASHBOARD</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Active Farmers Monitored", val: "278,900" },
                { label: "Current Alerts", val: "14" },
                { label: "SMS Sent Today", val: "3,174" },
                { label: "Avg Response Time", val: "41s" },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border rounded-3xl px-4 py-3">
                  <div className="text-xs text-slate-500">{item.label}</div>
                  <div className="font-semibold text-3xl tracking-tightererer text-primary">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all">
            <div className="font-semibold text-sm mb-3">HIGH RISK AREAS</div>
            <div className="space-y-3">
              {provinces.filter(p => p.salinityRisk > 75).map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm px-3">
                  <div className="flex-1 font-medium">{p.name}</div>
                  <div className="text-red-600 font-medium">{p.salinityRisk}% salinity risk</div>
                  <div className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-px rounded">ACTIVE</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SMS Alert System */}
        <div className="xl:col-span-12">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold tracking-tighterer text-2xl">SMS Alert Engine</div>
            <button onClick={() => setAlerts(mockSMSAlerts)} className="text-sm text-emerald-700">Reset Demo</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
            {/* Send New */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-md transition-all">
              <div className="font-semibold mb-3">Dispatch New Alert</div>
              <div className="space-y-3">
                <input 
                  value={newAlert.recipient}
                  onChange={(e) => setNewAlert({...newAlert, recipient: e.target.value})}
                  className="w-full border border-slate-300 rounded-3xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600" 
                  placeholder="Recipient name" 
                />
                <input 
                  value={newAlert.phone}
                  onChange={(e) => setNewAlert({...newAlert, phone: e.target.value})}
                  className="w-full border border-slate-300 rounded-3xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600" 
                  placeholder="+84 9xx xxx xxx" 
                />
                <textarea 
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                  className="w-full border border-slate-300 rounded-3xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600 min-h-[72px]" 
                  placeholder="Custom alert text (optional)" 
                />
                <button 
                  disabled={sending || !newAlert.recipient || !newAlert.phone}
                  onClick={sendNewAlert}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-3xl flex items-center justify-center gap-2 disabled:bg-slate-300"
                >
                  <Send className="w-4 h-4" /> {sending ? 'SENDING...' : 'SEND SMS ALERT'}
                </button>
              </div>
              <div className="text-xs text-center mt-3 text-slate-500">Preview shown below • Production uses authenticated SMS gateway</div>
            </div>

            {/* Alerts Feed */}
            <div className="lg:col-span-3 min-w-0 bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-2 mb-3 text-xs uppercase font-semibold text-slate-500">RECENT ALERTS • {alerts.length}</div>
              
              {demoSmsMessage && (
                <div className="mb-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-snug text-emerald-900 break-words">
                  <div className="font-semibold mb-1">DEMO SCENARIO PREVIEW</div>
                  {demoSmsMessage}
                </div>
              )}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border bg-slate-50 rounded-3xl px-4 py-3.5 text-sm">
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-2">
                      <div className="font-medium">{alert.recipient} <span className="text-xs text-slate-500">• {alert.phone}</span></div>
                      <div className="flex items-center gap-1.5">
                        {alert.status === 'delivered' ? (
                          <span className="text-emerald-700 flex items-center gap-1 text-xs font-medium whitespace-nowrap"><CheckCircle className="w-3.5 h-3.5" /> DELIVERED</span>
                        ) : (
                          <button onClick={() => markDelivered(alert.id)} className="text-[10px] px-2 py-0.5 bg-white rounded border text-emerald-700 whitespace-nowrap">MARK DELIVERED</button>
                        )}
                        <span className={`text-xs font-medium uppercase px-2 py-px rounded ${alert.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{alert.priority}</span>
                      </div>
                    </div>
                    <div className="text-xs leading-snug text-slate-600 mt-1.5 break-words">
                      {alert.message}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-2">{alert.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
