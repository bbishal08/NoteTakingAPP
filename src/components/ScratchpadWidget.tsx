import React, { useEffect, useState } from 'react';
import { Zap, X, ArrowUpRight, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { ProjectItem } from '../types';

interface ScratchpadWidgetProps {
  scratchpad: string;
  projects: ProjectItem[];
  onChangeScratchpad: (value: string) => void;
  onPromoteToNote: (title: string, content: string, projectId: string) => void;
}

export const ScratchpadWidget: React.FC<ScratchpadWidgetProps> = ({
  scratchpad,
  projects,
  onChangeScratchpad,
  onPromoteToNote,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [targetProjectId, setTargetProjectId] = useState(
    projects[0]?.id || 'general'
  );
  const [promotedBanner, setPromotedBanner] = useState<string | null>(null);

  // Keep targetProjectId synced whenever active projects change or get deleted
  useEffect(() => {
    if (projects.length === 0) {
      if (targetProjectId !== 'general') {
        setTargetProjectId('general');
      }
      return;
    }
    const exists = projects.some((p) => p.id === targetProjectId);
    if (!exists) {
      setTargetProjectId(projects[0].id);
    }
  }, [projects, targetProjectId]);

  // Support Cmd+J / Ctrl+J shortcut to toggle Scratchpad
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handlePromote = () => {
    const trimmed = scratchpad.trim();
    if (!trimmed && !customTitle.trim()) return;

    const firstLine = trimmed.split('\n')[0].replace(/^[#*-\s]+/, '');
    const title = customTitle.trim() || firstLine.slice(0, 60) || 'Quick Captured Note';
    const body = trimmed || title;
    const validProjectId =
      projects.some((p) => p.id === targetProjectId)
        ? targetProjectId
        : projects[0]?.id || 'general';

    onPromoteToNote(title, body, validProjectId);
    setCustomTitle('');
    setPromotedBanner(`Promoted "${title}" to Notes!`);
    setIsOpen(false);
    window.setTimeout(() => {
      setPromotedBanner(null);
    }, 3000);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {promotedBanner && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/95 text-white text-xs font-semibold shadow-xl border border-emerald-400/40 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{promotedBanner}</span>
        </div>
      )}

      {isOpen ? (
        <div className="w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-600/20 border-b border-indigo-500/30">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Quick Capture Scratchpad
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
              title="Close Scratchpad"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Note title (optional — defaults to 1st line)..."
              className="w-full bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <textarea
              value={scratchpad}
              onChange={(e) => onChangeScratchpad(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handlePromote();
                }
              }}
              rows={6}
              placeholder="Jot down a quick thought, snippet, or phone number here. Promote it to a full organized note anytime..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />

            <div className="pt-1 flex items-center justify-between gap-2">
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none max-w-[165px] truncate"
              >
                {projects.length > 0 ? (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      → {p.name}
                    </option>
                  ))
                ) : (
                  <option value="general">→ General Notes</option>
                )}
              </select>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onChangeScratchpad('');
                    setCustomTitle('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                  title="Clear Scratchpad"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!scratchpad.trim() && !customTitle.trim()}
                  onClick={handlePromote}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1 shadow"
                >
                  <span>Promote to Note</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition hover:scale-105"
          title="Open Quick Capture Scratchpad (Cmd + J)"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Scratchpad</span>
        </button>
      )}
    </div>
  );
};
