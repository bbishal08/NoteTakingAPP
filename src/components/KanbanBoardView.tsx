import React, { useMemo, useState } from 'react';
import {
  Kanban,
  CheckCircle2,
  Circle,
  Plus,
  Hash,
  ExternalLink,
  CheckSquare,
  Columns,
  ArrowRight,
} from 'lucide-react';
import { ExtractedTask, NoteItem, NoteStatus, ProjectItem } from '../types';

interface KanbanBoardViewProps {
  notes: NoteItem[];
  projects: ProjectItem[];
  onUpdateNoteStatus: (noteId: string, status: NoteStatus) => void;
  onToggleExtractedTask: (noteId: string, lineIndex: number) => void;
  onSelectNote: (noteId: string, openInSplit?: boolean) => void;
  onCreateNoteInStatus: (status: NoteStatus, projectId: string) => void;
}

const COLUMNS: { id: NoteStatus; title: string; badgeColor: string }[] = [
  { id: 'backlog', title: 'Backlog', badgeColor: 'bg-slate-500/20 text-slate-300' },
  { id: 'todo', title: 'To Do', badgeColor: 'bg-sky-500/20 text-sky-300' },
  { id: 'in-progress', title: 'In Progress', badgeColor: 'bg-amber-500/20 text-amber-300' },
  { id: 'review', title: 'In Review', badgeColor: 'bg-purple-500/20 text-purple-300' },
  { id: 'done', title: 'Done', badgeColor: 'bg-emerald-500/20 text-emerald-300' },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  notes,
  projects,
  onUpdateNoteStatus,
  onToggleExtractedTask,
  onSelectNote,
  onCreateNoteInStatus,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [subTab, setSubTab] = useState<'board' | 'tasks'>('board');
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const filteredNotes = useMemo(
    () =>
      notes.filter(
        (n) =>
          !n.trashed &&
          (selectedProjectId === 'all' || n.projectId === selectedProjectId)
      ),
    [notes, selectedProjectId]
  );

  // Extract all `- [ ]` and `- [x]` action items across all notes
  const extractedTasks = useMemo<ExtractedTask[]>(() => {
    const list: ExtractedTask[] = [];
    filteredNotes.forEach((n) => {
      const lines = n.content.split('\n');
      lines.forEach((line, idx) => {
        const match = line.match(/^- \[([ xX])\]\s*(.+)$/);
        if (match) {
          list.push({
            noteId: n.id,
            noteTitle: n.title,
            projectId: n.projectId,
            lineIndex: idx,
            text: match[2].trim(),
            completed: match[1].toLowerCase() === 'x',
          });
        }
      });
    });
    return list;
  }, [filteredNotes]);

  const completedTasksCount = extractedTasks.filter((t) => t.completed).length;

  return (
    <div className="flex flex-col h-full bg-slate-950/60 overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Kanban &amp; Action Items Hub</h2>
            <p className="text-xs text-slate-400">
              Drag &amp; drop notes across stages or manage{' '}
              <span className="text-emerald-400 font-medium">
                {completedTasksCount}/{extractedTasks.length} inline tasks
              </span>{' '}
              extracted from your notes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view Switcher */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSubTab('board')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                subTab === 'board'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Note Workflow Board
            </button>
            <button
              type="button"
              onClick={() => setSubTab('tasks')}
              className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
                subTab === 'tasks'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              All Note Checklists ({extractedTasks.length})
            </button>
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Columns View */}
      {subTab === 'board' ? (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[920px] h-full">
            {COLUMNS.map((col) => {
              const colNotes = filteredNotes.filter((n) => (n.status || 'todo') === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedNoteId) {
                      onUpdateNoteStatus(draggedNoteId, col.id);
                      setDraggedNoteId(null);
                    }
                  }}
                  className="flex flex-col rounded-2xl bg-slate-900/70 border border-slate-800/80 p-3 h-full"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.badgeColor}`}
                      >
                        {col.title}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {colNotes.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onCreateNoteInStatus(
                          col.id,
                          selectedProjectId === 'all'
                            ? projects[0]?.id || 'proj-product'
                            : selectedProjectId
                        )
                      }
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                      title={`New Note in ${col.title}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                    {colNotes.map((n) => {
                      const proj = projects.find((p) => p.id === n.projectId);
                      const totalTasks = (n.content.match(/^- \[[ xX]\]/gm) || []).length;
                      const doneTasks = (n.content.match(/^- \[[xX]\]/gm) || []).length;

                      return (
                        <div
                          key={n.id}
                          draggable
                          onDragStart={() => setDraggedNoteId(n.id)}
                          className="group rounded-xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 p-3.5 shadow-sm transition cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: `${proj?.color || '#6366f1'}22`,
                                color: proj?.color || '#818cf8',
                              }}
                            >
                              {proj?.name || 'General'}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => onSelectNote(n.id, false)}
                                className="p-1 rounded hover:bg-slate-700 text-slate-300"
                                title="Open Note"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectNote(n.id, true)}
                                className="p-1 rounded hover:bg-slate-700 text-slate-300"
                                title="Open in Split Pane"
                              >
                                <Columns className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div
                            onClick={() => onSelectNote(n.id, false)}
                            className="text-sm font-semibold text-slate-100 hover:text-indigo-300 cursor-pointer mb-1.5"
                          >
                            {n.title || 'Untitled'}
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                            {n.content.replace(/[#>*`-]/g, '').slice(0, 100)}
                          </p>

                          {/* Tags & Task Progress */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                            <div className="flex flex-wrap gap-1">
                              {n.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300"
                                >
                                  <Hash className="w-2.5 h-2.5 text-indigo-400" />
                                  {t}
                                </span>
                              ))}
                            </div>

                            {totalTasks > 0 && (
                              <span className="text-[11px] font-mono text-emerald-400">
                                ✓ {doneTasks}/{totalTasks}
                              </span>
                            )}
                          </div>

                          {/* Quick Move Buttons */}
                          <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Move to:</span>
                            <div className="flex items-center gap-1">
                              {COLUMNS.filter((c) => c.id !== col.id).map((targetCol) => (
                                <button
                                  key={targetCol.id}
                                  type="button"
                                  onClick={() => onUpdateNoteStatus(n.id, targetCol.id)}
                                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-indigo-600/30 hover:text-indigo-200 transition"
                                >
                                  {targetCol.title.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Aggregated Checklists View */
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-1">
              Action Items Synced Across Your Notes
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Checking or unchecking any item here automatically updates the markdown{' '}
              <code className="text-emerald-400">- [ ]</code> inside its parent note.
            </p>

            {extractedTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No <code className="text-indigo-400">- [ ]</code> tasks found in the selected
                project. Type <code className="text-indigo-400">/todo</code> inside any note to
                create one!
              </p>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {extractedTasks.map((task, i) => (
                  <div
                    key={`${task.noteId}-${task.lineIndex}-${i}`}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-lg transition"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleExtractedTask(task.noteId, task.lineIndex)}
                      className="flex items-center gap-3 text-left flex-1"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500 hover:text-indigo-400 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {task.text}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectNote(task.noteId, false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-xs text-indigo-300 flex items-center gap-1 shrink-0"
                    >
                      <span>{task.noteTitle}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
