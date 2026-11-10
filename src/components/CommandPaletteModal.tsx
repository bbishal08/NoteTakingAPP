import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  FileText,
  Plus,
  Network,
  Kanban,
  FolderOpen,
  Maximize2,
  Sun,
  Moon,
  BookOpen,
  Columns,
  Hash,
  Sparkles,
  X,
  Clock,
} from 'lucide-react';
import { MainViewMode, NoteItem, ProjectItem, ThemeMode } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: NoteItem[];
  projects: ProjectItem[];
  onSelectNote: (noteId: string, openInSplit?: boolean) => void;
  onCreateNote: () => void;
  onSwitchView: (view: MainViewMode) => void;
  onToggleZen: () => void;
  onSwitchTheme: (theme: ThemeMode) => void;
  onChooseVaultFolder: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  notes,
  projects,
  onSelectNote,
  onCreateNote,
  onSwitchView,
  onToggleZen,
  onSwitchTheme,
  onChooseVaultFolder,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.toLowerCase().trim();

    const noteItems = notes
      .filter(
        (n) =>
          !n.trashed &&
          (n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)))
      )
      .map((n) => {
        const proj = projects.find((p) => p.id === n.projectId);
        return {
          id: `note-${n.id}`,
          category: 'Notes',
          title: n.title || 'Untitled',
          subtitle: `${proj?.name || 'General'} • ${n.tags.map((t) => `#${t}`).join(' ')}`,
          icon: <FileText className="w-4 h-4 text-indigo-400" />,
          run: (shift?: boolean) => {
            onSelectNote(n.id, Boolean(shift));
            onClose();
          },
        };
      });

    const commandActions = [
      {
        id: 'cmd-new-note',
        category: 'Quick Actions',
        title: 'Create New Note',
        subtitle: 'Start a fresh note in the current project/folder',
        icon: <Plus className="w-4 h-4 text-emerald-400" />,
        run: () => {
          onCreateNote();
          onClose();
        },
      },
      {
        id: 'cmd-vault-folder',
        category: 'Local Storage Vault',
        title: 'Choose Local Vault Folder on Mac...',
        subtitle: 'Select where your Project & Folder Markdown notes are stored on disk',
        icon: <FolderOpen className="w-4 h-4 text-amber-400" />,
        run: () => {
          onChooseVaultFolder();
          onClose();
        },
      },
      {
        id: 'cmd-view-graph',
        category: 'Views',
        title: 'Open Interactive Knowledge Graph',
        subtitle: 'Visualize [[Wiki-Links]] and #tags connections',
        icon: <Network className="w-4 h-4 text-purple-400" />,
        run: () => {
          onSwitchView('graph');
          onClose();
        },
      },
      {
        id: 'cmd-view-kanban',
        category: 'Views',
        title: 'Open Kanban & Action Items Board',
        subtitle: 'Manage workflow stages and all - [ ] checklists',
        icon: <Kanban className="w-4 h-4 text-sky-400" />,
        run: () => {
          onSwitchView('kanban');
          onClose();
        },
      },
      {
        id: 'cmd-view-timeline',
        category: 'Views',
        title: 'Open Work Timer & Timeline Tracker',
        subtitle: 'Track time spent per note/work and view chronological timeline',
        icon: <Clock className="w-4 h-4 text-emerald-400" />,
        run: () => {
          onSwitchView('timeline');
          onClose();
        },
      },
      {
        id: 'cmd-zen',
        category: 'Workspace',
        title: 'Toggle Focus / Zen Mode (Cmd + \\)',
        subtitle: 'Hide sidebars for distraction-free writing',
        icon: <Maximize2 className="w-4 h-4 text-pink-400" />,
        run: () => {
          onToggleZen();
          onClose();
        },
      },
      {
        id: 'cmd-theme-dark',
        category: 'Appearance',
        title: 'Switch Theme: Midnight Dark',
        subtitle: 'Deep slate OLED dark theme',
        icon: <Moon className="w-4 h-4 text-indigo-300" />,
        run: () => {
          onSwitchTheme('dark');
          onClose();
        },
      },
      {
        id: 'cmd-theme-light',
        category: 'Appearance',
        title: 'Switch Theme: Clean Daylight',
        subtitle: 'Crisp high-contrast light theme',
        icon: <Sun className="w-4 h-4 text-amber-400" />,
        run: () => {
          onSwitchTheme('light');
          onClose();
        },
      },
      {
        id: 'cmd-theme-sepia',
        category: 'Appearance',
        title: 'Switch Theme: Warm Sepia Paper',
        subtitle: 'Cozy book-paper reading & writing ambiance',
        icon: <BookOpen className="w-4 h-4 text-orange-300" />,
        run: () => {
          onSwitchTheme('sepia');
          onClose();
        },
      },
    ].filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q)
    );

    return [...noteItems, ...commandActions];
  }, [
    query,
    notes,
    projects,
    onSelectNote,
    onCreateNote,
    onSwitchView,
    onToggleZen,
    onSwitchTheme,
    onChooseVaultFolder,
    onClose,
  ]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(1, items.length)) % Math.max(1, items.length));
    } else if (e.key === 'Enter' && items[selectedIndex]) {
      e.preventDefault();
      items[selectedIndex].run(e.shiftKey);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search notes, #tags, folders, or run a command..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No matching notes or commands found for "{query}".
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={(e) => item.run(e.shiftKey)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition ${
                  idx === selectedIndex
                    ? 'bg-indigo-600/25 border border-indigo-500/40'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-800 shrink-0">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Enter</kbd> Open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">
                Shift + Enter
              </kbd>{' '}
              Open in Split Pane
            </span>
          </div>
          <span className="flex items-center gap-1 text-indigo-400">
            <Sparkles className="w-3 h-3" /> Cmd + K
          </span>
        </div>
      </div>
    </div>
  );
};
