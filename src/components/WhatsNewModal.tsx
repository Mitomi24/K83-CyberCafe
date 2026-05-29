import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Calendar, Check, X, Shield, Cpu, RefreshCw, Layers } from 'lucide-react';

export interface VersionRelease {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  type: 'Major' | 'Minor' | 'Patch' | 'Maintenance';
  changes: {
    category: 'Electricity' | 'Visuals' | 'System' | 'Reports' | 'Features';
    text: string;
  }[];
}

const RELEASES: VersionRelease[] = [
  {
    version: '1.6.0-stable',
    date: 'May 29, 2026',
    title: 'The Smart Cumulative Calculation Engine Update',
    isLatest: true,
    type: 'Minor',
    changes: [
      {
        category: 'Electricity',
        text: 'Smart Automatic Cumulative kWh Calculation - Re-engineered consumption calculations to dynamically compute exact electricity usage via sequential cumulative meter readings, falls back seamlessly to wattage estimation.'
      },
      {
        category: 'Reports',
        text: 'Granular Data Exports - Completely overhauled Excel sheet export engines to output computed electricity draw, precise net profits, and correct cumulative meter reading sequences.'
      },
      {
        category: 'Visuals',
        text: 'Operational Closure Flags - Automatically highlights shop-closure markers. Entries logged by "CLOSE" are framed in dedicated amber badges with clear structural indicators across tables and report logs.'
      },
      {
        category: 'System',
        text: 'Proportional Grid Restructures - Stabilized the responsive page tables and calculation forms for extreme robust performance on mobile, desktop, and tablets.'
      }
    ]
  },
  {
    version: '1.5.5-stable',
    date: 'May 24, 2026',
    title: 'Retroactive Rate Configuration',
    type: 'Patch',
    changes: [
      {
        category: 'Features',
        text: 'Granular Printing Log Metadata - Added structured fields for target customer tracking, individual platforms, and cross-platform printed items tracking.'
      },
      {
        category: 'Electricity',
        text: 'Historical Rate History - Retroactive kWh calculations! Supports custom electricity rate ranges mapped historically, adapting automatically without corrupting past ledgers.'
      }
    ]
  },
  {
    version: '1.5.0-stable',
    date: 'May 18, 2026',
    title: 'Operational Consolidation & Live Shifts',
    type: 'Major',
    changes: [
      {
        category: 'Features',
        text: 'Multi-Module Operations - Consolidated Cyber Cafe tracking and automated Printing Tasks under a single cohesive tab-switched workspace with viewport transition rules.'
      },
      {
        category: 'System',
        text: 'Live Handover Sync Notes - Added collaborative systemic notes panels, synchronizing shift handover instructions and cash logs across concurrent operational devices instantly.'
      }
    ]
  },
  {
    version: '1.4.0-stable',
    date: 'May 10, 2026',
    title: 'Cloud Transformation & Real-time Ledger',
    type: 'Major',
    changes: [
      {
        category: 'System',
        text: 'Firebase Firestore Engine - Reconstructed the underlying architecture to stream transaction ledgers in real-time, preventing concurrent modification overrides.'
      },
      {
        category: 'Features',
        text: 'Google Authorization Security - Integrated Google Auth single sign-on to ensure shift accountability and secure data integrity.'
      }
    ]
  }
];

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose, currentVersion }) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Electricity': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Reports': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Visuals': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'System': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Features': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Major': return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white';
      case 'Minor': return 'bg-slate-800 text-slate-100';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] z-[101]"
          >
            {/* Header banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-white relative overflow-hidden flex-shrink-0">
              <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3.5 mb-2-accent">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                  <Sparkles size={22} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">System Update Release</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-500/25 border border-indigo-500/30 rounded-full text-indigo-300">
                      v{currentVersion}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-0.5">What&apos;s New in K83 Systems</h2>
                </div>
              </div>
            </div>

            {/* Version Scroll List */}
            <div className="overflow-y-auto flex-1 p-6 space-y-8 max-h-[55vh] scrollbar-thin scrollbar-thumb-slate-200">
              {RELEASES.map((release, rIdx) => (
                <div key={release.version} className="relative group">
                  {/* Timeline connector visual line */}
                  {rIdx < RELEASES.length - 1 && (
                    <div className="absolute left-[22px] top-12 bottom-0 w-0.5 bg-slate-100 group-hover:bg-indigo-50 transition-colors" />
                  )}

                  <div className="flex gap-4">
                    {/* Timestamp Dot */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all ${
                        release.isLatest 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-600 group-hover:bg-indigo-100' 
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                      }`}>
                        {release.isLatest ? <Cpu size={18} /> : <RefreshCw size={14} />}
                      </div>
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                          v{release.version}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getTypeStyle(release.type)}`}>
                          {release.type}
                        </span>
                        {release.isLatest && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-md">
                            Active
                          </span>
                        )}
                        <span className="text-slate-400 font-mono text-[10px] ml-auto flex items-center gap-1">
                          <Calendar size={11} />
                          {release.date}
                        </span>
                      </div>

                      <h3 className="text-xs font-black tracking-wide text-indigo-950 uppercase border-b border-dashed border-slate-100 pb-1.5 mb-3">
                        {release.title}
                      </h3>

                      <div className="space-y-3">
                        {release.changes.map((item, cIdx) => (
                          <div key={cIdx} className="flex gap-3 text-xs leading-relaxed text-slate-600 hover:text-slate-900 group/item transition-colors">
                            <span className={`h-5 px-2 rounded border text-[9px] font-black uppercase tracking-widest flex items-center justify-center self-start mt-0.5 select-none shrink-0 ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </span>
                            <p className="font-medium">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-5 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield size={14} className="text-slate-400" />
                <span className="text-[10px] font-mono tracking-tight">
                  Running sandbox secure ledger v{currentVersion}
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-5 py-2 hover:bg-slate-900 bg-indigo-600 text-white hover:text-indigo-50 border border-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:shadow active:scale-[0.98]"
              >
                <Check size={14} />
                Dismiss & Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
