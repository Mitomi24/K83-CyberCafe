import React, { useState } from 'react';
import { UserSettings, AppBackup } from '../types';
import { Save, Settings as SettingsIcon, Info, Database, Trash2, AlertTriangle, Calendar, Plus, RefreshCw, Download, UploadCloud } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/useData';

interface SettingsProps {
  settings: UserSettings;
  onUpdate: (newSettings: UserSettings) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdate }) => {
  const { user } = useAuth();
  const { clearAllData, restoreBackup, recalculateAllEntryCosts, entries, expenses } = useData();
  const [kwhRate, setKwhRate] = useState(settings.kwhRate.toString());
  const [currency, setCurrency] = useState(settings.currency);
  const [rateHistory, setRateHistory] = useState(settings.rateHistory || []);
  const [newRange, setNewRange] = useState({ startDate: '', endDate: '', rate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState<{ current: number, total: number, active: boolean, phase: 'entries' | 'expenses' | null }>({
    current: 0,
    total: 0,
    active: false,
    phase: null
  });

  const [restoreProgress, setRestoreProgress] = useState<{ current: number, total: number, active: boolean, phase: 'settings' | 'entries' | 'expenses' | null }>({
    current: 0,
    total: 0,
    active: false,
    phase: null
  });

  const [isConfirmingWipe, setIsConfirmingWipe] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);

  const handleSystemWipe = async () => {
    if (wipeConfirmText !== 'DELETE ALL') return;

    setIsConfirmingWipe(false);
    setWipeConfirmText('');
    setDeletionProgress({ current: 0, total: 0, active: true, phase: 'entries' });
    try {
      await clearAllData((current, total, phase) => {
        setDeletionProgress(prev => ({ ...prev, current, total, phase }));
      });
    } catch (e) {
      console.error(e);
    }
    setDeletionProgress({ current: 0, total: 0, active: false, phase: null });
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate({ kwhRate: Number(kwhRate), currency, rateHistory });
      
      // Check if user wants to recalculate after saving
      if (rateHistory.length > 0) {
        setShowRecalculateConfirm(true);
      }
    } catch (error) {
      console.error("Save failed", error);
    }
    setIsSaving(false);
  };

  const handleAddRange = () => {
    if (!newRange.startDate || !newRange.endDate || !newRange.rate) return;
    setRateHistory(prev => [...prev, {
      startDate: newRange.startDate,
      endDate: newRange.endDate,
      rate: Number(newRange.rate)
    }].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    setNewRange({ startDate: '', endDate: '', rate: '' });
  };

  const handleRemoveRange = (index: number) => {
    setRateHistory(prev => prev.filter((_, i) => i !== index));
  };

  const handleRecalculate = async () => {
    setShowRecalculateConfirm(false);
    setIsRecalculating(true);
    // Pass the current state values directly to ensure the latest ranges are used
    await recalculateAllEntryCosts({ 
      kwhRate: Number(kwhRate), 
      currency, 
      rateHistory 
    });
    setIsRecalculating(false);
  };

  const handleExportBackup = () => {
    const backup: AppBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings,
      entries,
      expenses
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mining_ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup: AppBackup = JSON.parse(text);
      
      if (!backup.version || !backup.settings || !Array.isArray(backup.entries)) {
        alert("Invalid backup file format.");
        return;
      }

      const confirmRestore = window.confirm("WARNING: Restoring a backup will wipe all current data and replace it with the backup content. This cannot be undone. Proceed?");
      if (!confirmRestore) return;

      setRestoreProgress({ current: 0, total: 0, active: true, phase: null });
      
      await restoreBackup(backup, (current, total, phase) => {
        setRestoreProgress({ current, total, active: true, phase });
      });

      alert("Backup restored successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to read or restore backup file.");
    }
    setRestoreProgress({ current: 0, total: 0, active: false, phase: null });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Configuration</h2>
        <p className="text-sm text-slate-500">Maintain constant parameters for the calculation engine</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-600" />
              Operational Config & Billing History
            </h3>
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-white px-3 py-2 rounded-lg transition-all border border-indigo-100 shadow-sm"
            >
              <RefreshCw size={14} className={isRecalculating ? "animate-spin" : ""} />
              Apply Rates to Ledger
            </button>
          </div>
          
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              <strong>Workflow:</strong> 1. Define your <strong>Currency</strong> and <strong>Fallback Rate</strong>. 2. Add specific date ranges when you receive your monthly bill. 3. <strong>Save Changes</strong>. 4. Click <strong>Apply Rates to Ledger</strong> to recalculate profit history.
            </p>
          </div>
          
          <div className="p-8 space-y-10">
            {/* Core Params Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-slate-100">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Ledger Currency (ISO)
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  maxLength={3}
                  placeholder="PHP"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold uppercase text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                  Fallback P/kWh (Default)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={kwhRate}
                  onChange={(e) => setKwhRate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono font-bold text-lg"
                />
              </div>
            </div>

            {/* Rate Adding Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Billing Range</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                  <input 
                    type="date" 
                    value={newRange.startDate} 
                    onChange={e => setNewRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                  <input 
                    type="date" 
                    value={newRange.endDate} 
                    onChange={e => setNewRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Range Rate ({currency})</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      step="0.1" 
                      value={newRange.rate} 
                      onChange={e => setNewRange(prev => ({ ...prev, rate: e.target.value }))}
                      placeholder="e.g. 14.19"
                      className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono"
                    />
                    <button 
                      onClick={handleAddRange}
                      type="button"
                      className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* History List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Rate History</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rateHistory.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-lg">No historical rate ranges defined.</p>
                ) : (
                  rateHistory.map((range, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Period</span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {range.startDate} → {range.endDate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">Applied Rate</span>
                          <span className="text-sm font-mono font-black text-indigo-600">{Number(range.rate || 0).toFixed(4)}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveRange(idx)}
                          type="button"
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-3 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              <Save size={18} />
              {isSaving ? 'Synchronizing...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-12 space-y-8">
        {/* Backup & Recovery */}
        {/* Backup & Recovery */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit mt-8">
          <div className="p-6 border-b border-slate-100 bg-indigo-50/10 flex items-center gap-2">
            <Database size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">
              Backup & Recovery
            </h3>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-slate-800 tracking-tight">Export System Backup</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Download a complete snapshot of your billing configuration, profit history, and expense ledger as a high-integrity JSON file.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-fit px-6 py-2.5 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm"
              >
                <Download size={16} />
                Generate Backup File
              </button>
            </div>

            <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-10 pt-6 md:pt-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-slate-800 tracking-tight">Restore System Backup</span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Upload a previously generated backup file to restore your entire database state. <strong>This will overwrite all current data.</strong>
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  disabled={restoreProgress.active}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <button
                  type="button"
                  disabled={restoreProgress.active}
                  className="px-6 py-2.5 bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest shadow-sm disabled:opacity-50"
                >
                  <UploadCloud size={16} />
                  {restoreProgress.active ? 'Restoring...' : 'Upload & Restore'}
                </button>
              </div>
            </div>
          </div>

          {restoreProgress.active && (
            <div className="mx-8 mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-indigo-600 font-bold">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest">
                      Processing {restoreProgress.phase}: {restoreProgress.current} / {restoreProgress.total}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono">
                    {Math.round((restoreProgress.current / (restoreProgress.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${Math.min(100, (restoreProgress.current / (restoreProgress.total || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic"> Restoring system state. Please do not close windows. </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-red-50/50 rounded-xl border border-red-100 overflow-hidden mt-8">
          <div className="p-6 border-b border-red-100 bg-red-50/30 flex items-center justify-between">
            <h3 className="font-bold text-red-800 flex items-center gap-2 uppercase tracking-widest text-xs">
              <AlertTriangle size={18} className="text-red-600" />
              Danger Zone
            </h3>
          </div>
          <div className="p-8">
            <div className="max-w-2xl">
              <div className="flex flex-col gap-2 mb-6">
                <span className="text-sm font-bold text-slate-800">Complete Database Reset</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will permanently wipe <strong>all operational history</strong> and <strong>business expenses</strong>. 
                  This action is intended for a full system reset and cannot be undone.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {!isConfirmingWipe ? (
                  <button
                    type="button"
                    disabled={deletionProgress.active}
                    onClick={() => setIsConfirmingWipe(true)}
                    className="w-fit px-8 py-3 bg-white border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold rounded-xl transition-all flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 shadow-sm"
                  >
                    <Trash2 size={18} />
                    Reset System Data
                  </button>
                ) : (
                  <div className="p-6 bg-white border-2 border-red-200 rounded-xl space-y-4 shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-3 text-red-600">
                      <AlertTriangle size={20} className="shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-black uppercase tracking-tight">Destructive Action Required</p>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          To confirm permanent deletion of ALL records, please type <span className="font-mono font-bold text-red-600 tracking-widest">DELETE ALL</span> below. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={wipeConfirmText}
                        onChange={(e) => setWipeConfirmText(e.target.value)}
                        placeholder="Type DELETE ALL"
                        className="flex-1 px-4 py-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm font-mono font-bold focus:border-red-500 outline-none transition-all uppercase"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSystemWipe}
                          disabled={wipeConfirmText !== 'DELETE ALL'}
                          className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-red-700 transition-all shadow-md"
                        >
                          Confirm Wipe
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsConfirmingWipe(false);
                            setWipeConfirmText('');
                          }}
                          className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {deletionProgress.active && (
                  <div className="space-y-2 p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">
                        Wiping Database ({deletionProgress.phase === 'entries' ? 'Operations' : 'Expenses'}): {deletionProgress.current}/{deletionProgress.total}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.round((deletionProgress.current / (deletionProgress.total || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-red-600 h-full transition-all duration-500 ease-out" 
                        style={{ width: `${Math.min(100, (deletionProgress.current / (deletionProgress.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showRecalculateConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-indigo-50/30 flex items-center gap-3">
              <RefreshCw className="text-indigo-600" size={24} />
              <h3 className="font-bold text-slate-800 text-lg">Recalculate Ledger?</h3>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Settings saved. Would you like to scan and recalculate your <strong>Profit history</strong> based on the updated billing history ranges?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRecalculate}
                  className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  Recalculate Profits Now
                </button>
                <button
                  onClick={() => setShowRecalculateConfirm(false)}
                  className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

