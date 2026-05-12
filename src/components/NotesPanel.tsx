import React, { useState, useEffect } from 'react';
import { StickyNote, Save, Clock, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { format } from 'date-fns';
import { SystemNote } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface NotesPanelProps {
  notes: SystemNote[];
  onUpdate: (content: string, category: 'cybercafe' | 'printing') => Promise<void>;
  category: 'cybercafe' | 'printing';
}

export const NotesPanel: React.FC<NotesPanelProps> = ({ notes, onUpdate, category }) => {
  const currentNote = notes.find(n => n.category === category);
  const [content, setContent] = useState(currentNote?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(currentNote?.updatedAt?.toDate() || null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentNote && currentNote.content !== content && !isSaving) {
      setContent(currentNote.content);
      setLastSaved(currentNote.updatedAt?.toDate());
    }
  }, [currentNote]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(content, category);
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-80 h-[400px] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5"
          >
            <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <StickyNote size={14} className="text-amber-500" />
                Operational Notes
              </h3>
              <div className="flex items-center gap-2">
                {lastSaved && (
                  <span className="text-[9px] text-slate-400 font-medium">
                    {format(lastSaved, 'HH:mm')}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 hover:bg-white rounded-lg transition-colors text-amber-600 disabled:opacity-50 shadow-sm border border-amber-100 bg-amber-50"
                >
                  <Save size={12} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-5 relative bg-[#fffdf0]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type reminders here..."
                className="w-full h-full bg-transparent border-none focus:ring-0 text-sm text-slate-600 placeholder:text-slate-300 resize-none font-medium leading-relaxed z-10 relative"
              />
              {/* Note paper lines */}
              <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none opacity-[0.05] p-5 flex flex-col gap-[1.55rem] mt-10">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="border-b border-slate-900 w-full" />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all duration-300 border backdrop-blur-sm",
          isExpanded 
            ? "bg-slate-900 border-slate-800 text-white" 
            : "bg-amber-400 border-amber-300 text-amber-950"
        )}
      >
        <StickyNote size={20} className={cn(isExpanded ? "text-amber-400" : "text-amber-900")} />
        <span className="text-xs font-black uppercase tracking-widest">
          {isExpanded ? 'Close Notes' : 'Open Notes'}
        </span>
        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </motion.button>
    </div>
  );
};

