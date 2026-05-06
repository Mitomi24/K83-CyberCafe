import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogOut, LayoutDashboard, Settings as SettingsIcon, PlusCircle, ReceiptText, DollarSign, Monitor, Printer, FileText } from 'lucide-react';
import { APP_VERSION } from '../version';

interface NavbarProps {
  onNavigate: (view: 'cybercafe' | 'printing' | 'reports' | 'settings') => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeView }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { id: 'cybercafe', icon: Monitor, label: 'Cyber Cafe' },
    { id: 'printing', icon: Printer, label: 'Printing' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 transition-colors">
      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'K83')}`} 
                className="w-10 h-10 rounded-xl ring-2 ring-indigo-500/20 object-cover bg-white shadow-sm transition-transform active:scale-95"
                referrerPolicy="no-referrer"
                alt="Logo"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded-lg flex items-center justify-center text-[7px] font-black text-white shadow-lg border border-white group-hover:scale-110 transition-transform">
                K83
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                K83 Management
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono font-bold text-indigo-500/50">v{APP_VERSION}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    activeView === item.id 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <item.icon size={14} className={activeView === item.id ? 'text-indigo-600' : ''} />
                    {item.label}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-700">{user.displayName || 'User'}</span>
                <button 
                  onClick={logout}
                  className="text-[10px] uppercase tracking-wider font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Logout
                </button>
              </div>
              <div className="relative">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  className="w-10 h-10 rounded-xl ring-2 ring-slate-100 object-cover bg-white"
                  referrerPolicy="no-referrer"
                  alt="Profile"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav */}
      <div className="md:hidden flex justify-around py-2 border-t border-slate-100 bg-slate-50/50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as any)}
            className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
              activeView === item.id ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
