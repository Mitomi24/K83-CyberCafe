import React from 'react';
import { DailyEntry } from '../types';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { format, eachDayOfInterval, isSameDay, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface MissingRecordsAlertProps {
  entries: DailyEntry[];
  onMarkClosed: (date: Date) => Promise<void>;
}

export const MissingRecordsAlert: React.FC<MissingRecordsAlertProps> = ({ entries, onMarkClosed }) => {
  // Check last 7 days for missing records, but don't go before May 5, 2026
  const today = new Date();
  const SYSTEM_START_DATE = new Date('2026-05-05T00:00:00');
  
  // We check from 7 days ago up to yesterday, but clamped to System Start Date
  let startCheck = subDays(today, 7);
  if (startCheck < SYSTEM_START_DATE) {
    startCheck = SYSTEM_START_DATE;
  }
  
  const yesterday = subDays(today, 1);
  if (yesterday < startCheck) return null;

  const allDays = eachDayOfInterval({
    start: startCheck,
    end: yesterday
  });

  const missingDays = allDays.filter(day => {
    return !entries.find(entry => isSameDay(entry.date.toDate(), day));
  }).reverse(); // Most recent first

  if (missingDays.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="mb-8"
      >
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-900 font-bold text-sm">Gaps in Operational Ledger</h3>
              <p className="text-amber-700 text-xs mt-1">We noticed missing records for the following dates. Was the shop closed or did you forget to log?</p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {missingDays.map(day => (
                  <div 
                    key={day.toISOString()}
                    className="flex lg:items-center gap-3 bg-white/50 border border-amber-200 rounded-xl px-3 py-2 pr-2"
                  >
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">
                      {format(day, 'EEE, MMM d')}
                    </span>
                    <button
                      onClick={() => onMarkClosed(day)}
                      className="flex items-center gap-1.5 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                    >
                      <PlusCircle size={12} />
                      Set as Closed
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
