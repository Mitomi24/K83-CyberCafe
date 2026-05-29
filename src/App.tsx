import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Expenses } from './components/Expenses';
import { Login } from './components/Login';
import { Reports } from './components/Reports';
import { useData } from './lib/useData';
import { APP_VERSION } from './version';
import { WhatsNewModal } from './components/WhatsNewModal';

const AppContent: React.FC = () => {
  const { user, loading, settings, updateSettings } = useAuth();
  const [activeView, setActiveView] = useState<'cybercafe' | 'printing' | 'reports' | 'settings'>('cybercafe');
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    document.title = `K83 Management v${APP_VERSION}`;
  }, []);

  useEffect(() => {
    if (user) {
      const key = `k83_whats_new_seen_${APP_VERSION}_${user.uid}`;
      const hasSeen = localStorage.getItem(key);
      if (!hasSeen) {
        setShowWhatsNew(true);
      }
    }
  }, [user]);

  const handleCloseWhatsNew = () => {
    if (user) {
      const key = `k83_whats_new_seen_${APP_VERSION}_${user.uid}`;
      localStorage.setItem(key, 'true');
    }
    setShowWhatsNew(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-medium text-slate-500 font-mono">Initializing K83 Systems...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      <Navbar onNavigate={setActiveView} activeView={activeView} onShowWhatsNew={() => setShowWhatsNew(true)} />
      
      <main className="transition-all duration-300 ease-in-out">
        {activeView === 'cybercafe' && <Dashboard category="cybercafe" />}
        {activeView === 'printing' && <Dashboard category="printing" />}
        {activeView === 'reports' && <Reports />}
        {activeView === 'settings' && settings && (
          <Settings settings={settings} onUpdate={updateSettings} />
        )}
      </main>
      
      <footer className="py-12 border-t border-slate-200 mt-auto bg-white transition-colors">
        <div className="max-w-none mx-auto px-4 lg:px-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-[10px] font-bold">K83</div>
            <span className="font-bold text-slate-400">K83 Cyber Cafe</span>
            <span className="text-[10px] font-mono text-slate-300 ml-2">v{APP_VERSION}</span>
          </div>
          <p className="text-slate-400 text-[10px] tracking-widest uppercase font-bold">
            © {new Date().getFullYear()} K83 Operational Management System
          </p>
        </div>
      </footer>

      <WhatsNewModal 
        isOpen={showWhatsNew} 
        onClose={handleCloseWhatsNew} 
        currentVersion={APP_VERSION} 
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
