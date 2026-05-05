import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogOut, LayoutDashboard, Settings as SettingsIcon, PlusCircle, ReceiptText, DollarSign, Monitor, Printer } from 'lucide-react';

interface NavbarProps {
  onNavigate: (view: 'cybercafe' | 'printing' | 'settings') => void;
  activeView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeView }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { id: 'cybercafe', icon: Monitor, label: 'Cyber Cafe' },
    { id: 'printing', icon: Printer, label: 'Printing' },
    { id: 'settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm">
              <DollarSign size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              K83 Cyber Cafe <span className="text-slate-400 font-normal">Management</span>
            </h1>
          </div>

          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-md">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                    activeView === item.id 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
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
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                className="w-8 h-8 rounded-full ring-2 ring-slate-100"
                alt="Profile"
              />
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
            className={`p-2 rounded-lg flex flex-col items-center gap-1 ${
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
