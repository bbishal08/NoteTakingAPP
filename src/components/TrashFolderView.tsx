import React from 'react';
import {
  Trash2,
  RotateCcw,
  Folder,
  FileText,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { NoteItem, ProjectItem } from '../types';

interface TrashFolderViewProps {
  trashedProjects: ProjectItem[];
  trashedNotes: NoteItem[];
  allProjects: ProjectItem[];
  vaultPath: string;
  onRestoreProject: (projectId: string) => void;
  onPermanentDeleteProject: (projectId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onPermanentDeleteNote: (noteId: string) => void;
  onEmptyTrash: () => void;
}

export const TrashFolderView: React.FC<TrashFolderViewProps> = ({
  trashedProjects,
  trashedNotes,
  allProjects,
  vaultPath,
  onRestoreProject,
  onPermanentDeleteProject,
  onRestoreNote,
  onPermanentDeleteNote,
  onEmptyTrash,
}) => {
  const totalTrashed = trashedProjects.length + trashedNotes.length;

  return (
    <div className="flex-1 h-full overflow-y-auto px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-[#111827] border border-slate-800 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">Trash Folder</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Deleted projects and notes are safely stored here (and in{' '}
                <code className="text-indigo-400">{vaultPath}/Trash</code>) until you
                restore or permanently delete them.
              </p>
            </div>
          </div>

          {totalTrashed > 0 && (
            <button
              type="button"
              onClick={onEmptyTrash}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition"
            >
              Empty Trash ({totalTrashed})
            </button>
          )}
        </div>

        {totalTrashed === 0 ? (
          <div className="rounded-2xl bg-[#111827]/60 border border-slate-800/80 p-12 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto opacity-80" />
            <h3 className="text-sm font-bold text-slate-200">Your Trash Folder is Empty</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When you delete a Project or a Note, it will appear here so you can
              restore it anytime with one click.
            </p>
          </div>
        ) : (
          <>
            {/* Deleted Projects Section */}
            {trashedProjects.length > 0 && (
              <div className="rounded-2xl bg-[#111827]/90 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    Deleted Projects ({trashedProjects.length})
                  </h2>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {trashedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{proj.name}</div>
                          <div className="text-xs text-slate-400">
                            Restoring this project also restores its folders and notes
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRestoreProject(proj.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore Project
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteProject(proj.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                        >
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deleted Notes Section */}
            {trashedNotes.length > 0 && (
              <div className="rounded-2xl bg-[#111827]/90 border border-slate-800 p-5 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Deleted Notes ({trashedNotes.length})
                </h2>

                <div className="divide-y divide-slate-800/80">
                  {trashedNotes.map((note) => {
                    const parentProj = allProjects.find((p) => p.id === note.projectId);
                    return (
                      <div
                        key={note.id}
                        className="py-3.5 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white truncate">
                              {note.title || 'Untitled Note'}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-md text-xs font-medium"
                              style={{
                                backgroundColor: `${parentProj?.color || '#6366f1'}20`,
                                color: parentProj?.color || '#818cf8',
                              }}
                            >
                              {parentProj?.name || 'General'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {note.content.replace(/[#>*`\[\]-]/g, '').slice(0, 120) ||
                              'Empty note...'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onRestoreNote(note.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => onPermanentDeleteNote(note.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
