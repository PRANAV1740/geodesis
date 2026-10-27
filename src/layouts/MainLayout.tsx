import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, Activity, Brain, Clock, BarChart3, Users, Menu, X, User, LogOut } from 'lucide-react';
import { useRole, UserRole } from '../context/RoleContext';

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

const allNavItems: NavItem[] = [
  { href: '/mission-control', label: 'Mission Control', icon: Home },
  { href: '/live-ops', label: 'Live Operations', icon: Activity },
  { href: '/gis-map', label: 'GIS Map', icon: Map },
  { href: '/ai-engine', label: 'AI Decision Engine', icon: Brain },
  { href: '/historical', label: 'Historical Replay', icon: Clock },
  { href: '/analytics', label: 'Impact Analytics', icon: BarChart3 },
];

const roleNavMap: Record<UserRole, string[]> = {
  farmer: ['/mission-control', '/live-ops', '/ai-engine'],
  cooperative: ['/mission-control', '/live-ops', '/gis-map', '/ai-engine', '/historical', '/analytics'],
  government: ['/mission-control', '/live-ops', '/gis-map', '/ai-engine', '/historical', '/analytics'],
  research: ['/mission-control', '/live-ops', '/gis-map', '/ai-engine', '/historical', '/analytics'],
  public: [],
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, user, logout } = useRole();

  const allowedPaths = roleNavMap[role] || [];
  const navItems = allNavItems.filter(item => allowedPaths.includes(item.href));

  const showDashboards = role !== 'farmer' && role !== 'public';

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-[1100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-700 rounded-2xl flex items-center justify-center text-white font-bold text-lg tracking-tighter">MS</div>
              <div className="font-semibold tracking-tight text-base sm:text-xl">MEKONG SMART LAND</div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`nav-link px-4 py-2 rounded-2xl flex items-center gap-1.5 ${isActive(item.href) ? 'bg-emerald-100 text-emerald-800 font-medium' : 'hover:bg-slate-100'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}

            {showDashboards && (
              <Link to="/dashboards" className="ml-3 px-4 py-2 rounded-2xl flex items-center gap-1.5 hover:bg-slate-100 text-sm">
                <Users className="w-4 h-4" /> Dashboards
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <Link to="/profile" className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm border rounded-2xl hover:bg-slate-50">
                <User className="w-4 h-4" /> {user.name.split(' ')[0]}
              </Link>
            )}

            <Link to="/signup" className="hidden md:block px-4 py-2 text-sm border rounded-2xl hover:bg-slate-50">
              Sign Up
            </Link>

            {user && (
              <button onClick={handleLogout} className="hidden md:flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 px-3">
                <LogOut className="w-4 h-4" />
              </button>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t bg-white px-5 py-4">
            <div className="flex flex-col gap-1 text-sm">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100">
                    <Icon className="w-4 h-4" /> {item.label}
                  </Link>
                );
              })}
              <div className="h-px bg-slate-200 my-1"></div>
              <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100">
                <User className="w-4 h-4" /> Profile
              </Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-slate-100">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-white py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex justify-between gap-4">
          <div>© 2026 Mekong Smart Land • Demonstration Platform</div>
          <div className="hidden md:block">Satellite • Rule-Based Engine • Fully Transparent</div>
        </div>
      </footer>
    </div>
  );
}
