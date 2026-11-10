import React, { useMemo, useState } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileText,
  Sparkles,
  BarChart3,
  History,
  ShieldAlert,
  RotateCcw,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { NoteItem, ProjectItem, WorkSessionLog } from '../types';

export function formatDurationHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [
    String(hrs).padStart(2, '0'),
    String(mins).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ].join(':');
}

export function formatDurationHuman(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

interface WorkTimerTimelineViewProps {
  notes: NoteItem[];
  projects: ProjectItem[];
  workSessions: WorkSessionLog[];
  activeNoteId: string;
  timerRunning: boolean;
  timerPaused: boolean;
  timerIdlePaused: boolean;
  timerElapsedSec: number;
  timerIdleElapsedSec: number;
  timerTaskTitle: string;
  timerNoteId: string | null;
  timerProjectId: string;
  idleTimeoutSec: number;
  onChangeTaskTitle: (title: string) => void;
  onSelectNoteToTrack: (noteId: string | null) => void;
  onStartTimer: (options?: {
    taskTitle?: string;
    noteId?: string | null;
    projectId?: string;
  }) => void;
  onPauseTimer: () => void;
  onResumeTimer: (keepIdleTime?: boolean) => void;
  onStopAndSaveTimer: () => void;
  onSimulateIdle: () => void;
  onChangeIdleTimeout: (seconds: number) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenNote: (noteId: string) => void;
}

export const WorkTimerTimelineView: React.FC<WorkTimerTimelineViewProps> = ({
  notes,
  projects,
  workSessions,
  timerRunning,
  timerPaused,
  timerIdlePaused,
  timerElapsedSec,
  timerIdleElapsedSec,
  timerTaskTitle,
  timerNoteId,
  timerProjectId,
  idleTimeoutSec,
  onChangeTaskTitle,
  onSelectNoteToTrack,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onStopAndSaveTimer,
  onSimulateIdle,
  onChangeIdleTimeout,
  onDeleteSession,
  onOpenNote,
}) => {
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Aggregate total time worked per particular work item / note
  const workBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        title: string;
        noteId: string | null;
        projectId: string;
        totalSec: number;
        idleExcludedSec: number;
        sessionsCount: number;
        lastWorkedAt: string;
      }
    >();

    workSessions.forEach((s) => {
      const linkedNote = s.noteId ? notes.find((n) => n.id === s.noteId) : null;
      const displayTitle = s.taskTitle || linkedNote?.title || 'Untitled Work';
      const key = `work:${displayTitle.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalSec += s.durationSec;
        existing.idleExcludedSec += s.idleExcludedSec || 0;
        existing.sessionsCount += 1;
        if (s.endedAt > existing.lastWorkedAt) {
          existing.lastWorkedAt = s.endedAt;
        }
      } else {
        map.set(key, {
          key,
          title: displayTitle,
          noteId: s.noteId,
          projectId: linkedNote ? linkedNote.projectId : s.projectId,
          totalSec: s.durationSec,
          idleExcludedSec: s.idleExcludedSec || 0,
          sessionsCount: 1,
          lastWorkedAt: s.endedAt,
        });
      }
    });

    // Also include live active timer seconds in the breakdown preview
    if ((timerRunning || timerPaused || timerIdlePaused) && timerElapsedSec > 0) {
      const linkedNote = timerNoteId ? notes.find((n) => n.id === timerNoteId) : null;
      const displayTitle =
        timerTaskTitle || linkedNote?.title || 'Active Work';
      const key = `work:${displayTitle.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.totalSec += timerElapsedSec;
      } else {
        map.set(key, {
          key,
          title: displayTitle,
          noteId: timerNoteId,
          projectId: timerProjectId,
          totalSec: timerElapsedSec,
          idleExcludedSec: 0,
          sessionsCount: 1,
          lastWorkedAt: new Date().toISOString(),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSec - a.totalSec);
  }, [
    workSessions,
    notes,
    timerRunning,
    timerPaused,
    timerIdlePaused,
    timerElapsedSec,
    timerNoteId,
    timerTaskTitle,
    timerProjectId,
  ]);

  const totalActiveSec = useMemo(() => {
    const saved = workSessions.reduce((acc, s) => acc + s.durationSec, 0);
    return saved + (timerRunning || timerPaused || timerIdlePaused ? timerElapsedSec : 0);
  }, [workSessions, timerRunning, timerPaused, timerIdlePaused, timerElapsedSec]);

  const totalIdleExcludedSec = useMemo(() => {
    const saved = workSessions.reduce((acc, s) => acc + (s.idleExcludedSec || 0), 0);
    return saved + (timerIdlePaused ? timerIdleElapsedSec : 0);
  }, [workSessions, timerIdlePaused, timerIdleElapsedSec]);

  const projectBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { projectId: string; name: string; color: string; totalSec: number }
    >();
    workBreakdown.forEach((item) => {
      const proj = projects.find((p) => p.id === item.projectId);
      const id = proj ? proj.id : 'general';
      const name = proj ? proj.name : 'General Notes';
      const color = proj ? proj.color : '#6366f1';
      const existing = map.get(id);
      if (existing) {
        existing.totalSec += item.totalSec;
      } else {
        map.set(id, { projectId: id, name, color, totalSec: item.totalSec });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalSec - a.totalSec);
  }, [workBreakdown, projects]);

  return (
    <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Smart Work Timer &amp; Automatic Idle Detection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Work Timeline &amp; Time Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track exactly how much time you spend on each particular note or task. Automatically pauses when your system goes idle.
            </p>
          </div>

          {/* Idle Detection Configuration + Simulate Idle Button */}
          <div className="flex flex-wrap items-center gap-2 bg-[#111827] border border-slate-800 rounded-2xl p-2.5">
            <div className="flex items-center gap-2 px-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">
                Auto-Idle Pause After:
              </span>
              <select
                value={idleTimeoutSec}
                onChange={(e) => onChangeIdleTimeout(Number(e.target.value))}
                aria-label="Auto-Idle Pause Threshold"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-indigo-300 focus:outline-none"
              >
                <option value={15}>15 sec (Fast Test)</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
            </div>

            {timerRunning && !timerIdlePaused && (
              <button
                type="button"
                onClick={onSimulateIdle}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Simulate system inactivity to test automatic idle pause"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simulate System Idle</span>
              </button>
            )}
          </div>
        </div>

        {/* SYSTEM IDLE AUTO-PAUSE ALERT BANNER */}
        {timerIdlePaused && (
          <div className="rounded-2xl bg-amber-500/15 border-2 border-amber-500/60 p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/25 text-amber-300 shrink-0 mt-0.5">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <span>System Idle Detected — Timer Automatically Paused!</span>
                </div>
                <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                  No keyboard or mouse activity was detected while working on{' '}
                  <strong className="text-white">
                    &ldquo;{timerTaskTitle || 'Current Work'}&rdquo;
                  </strong>
                  . Idle time excluded so far:{' '}
                  <span className="font-mono font-bold text-amber-300">
                    {formatDurationHuman(timerIdleElapsedSec)}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onResumeTimer(false)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume (Discard Idle Time)</span>
              </button>
              <button
                type="button"
                onClick={() => onResumeTimer(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
              >
                Keep Idle Time &amp; Resume
              </button>
              <button
                type="button"
                onClick={onStopAndSaveTimer}
                className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40"
              >
                Stop &amp; Save Session
              </button>
            </div>
          </div>
        )}

        {/* LIVE WORK TIMER CONTROL DECK */}
        <div className="rounded-3xl bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#1e1b4b]/40 border border-indigo-500/30 p-6 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left: Work Item Input & Linked Note Selector */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Particular Work / Note Being Tracked
                </label>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    timerIdlePaused
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : timerRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : timerPaused
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      timerIdlePaused
                        ? 'bg-amber-400 animate-ping'
                        : timerRunning
                        ? 'bg-emerald-400 animate-pulse'
                        : timerPaused
                        ? 'bg-indigo-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  {timerIdlePaused
                    ? 'SYSTEM IDLE — AUTO-PAUSED'
                    : timerRunning
                    ? 'ACTIVE WORK SESSION'
                    : timerPaused
                    ? 'PAUSED'
                    : 'READY TO TRACK'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={timerTaskTitle}
                  onChange={(e) => onChangeTaskTitle(e.target.value)}
                  placeholder="What particular work are you focusing on? (e.g. API Design, Bug Fix)..."
                  className="flex-1 bg-slate-950/90 border border-slate-700/90 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none"
                />

                <select
                  value={timerNoteId || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    onSelectNoteToTrack(val);
                  }}
                  aria-label="Link timer to a specific note"
                  className="bg-slate-900 border border-slate-700/90 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 sm:max-w-[220px] truncate"
                >
                  <option value="">Standalone Work Task</option>
                  {notes.map((n) => (
                    <option key={n.id} value={n.id}>
                      📄 {n.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Digital Clock Readout & Controls */}
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-between lg:justify-end gap-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
              <div className="text-center sm:text-left">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Session Elapsed
                </div>
                <div
                  data-testid="live-timer-readout"
                  className={`text-3xl sm:text-4xl font-mono font-extrabold tracking-wider ${
                    timerIdlePaused
                      ? 'text-amber-400'
                      : timerRunning
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {formatDurationHMS(timerElapsedSec)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!timerRunning && !timerPaused && !timerIdlePaused && (
                  <button
                    type="button"
                    onClick={() => onStartTimer()}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Timer</span>
                  </button>
                )}

                {timerRunning && !timerIdlePaused && (
                  <button
                    type="button"
                    onClick={onPauseTimer}
                    className="px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                )}

                {(timerPaused || timerIdlePaused) && (
                  <button
                    type="button"
                    onClick={() => onResumeTimer(false)}
                    className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                {(timerRunning || timerPaused || timerIdlePaused) && (
                  <button
                    type="button"
                    onClick={onStopAndSaveTimer}
                    className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition"
                    title="Stop timer and log session to Work Timeline"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop &amp; Log</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-4">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Total Active Work Time</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2 font-mono">
              {formatDurationHMS(totalActiveSec)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {formatDurationHuman(totalActiveSec)} focused work
            </div>
          </div>

          <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-4">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Logged Work Sessions</span>
              <History className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2 font-mono">
              {workSessions.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Across {workBreakdown.length} distinct work items
            </div>
          </div>

          <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-4">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Top Focused Work</span>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-base font-bold text-white mt-2 truncate">
              {workBreakdown[0]?.title || 'No sessions yet'}
            </div>
            <div className="text-[11px] text-purple-400 mt-1 font-mono">
              {workBreakdown[0]
                ? `${formatDurationHuman(workBreakdown[0].totalSec)} spent`
                : 'Start timer to track'}
            </div>
          </div>

          <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-4">
            <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
              <span>Idle Time Auto-Excluded</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-300 mt-2 font-mono">
              {formatDurationHuman(totalIdleExcludedSec)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              System idle threshold: {idleTimeoutSec}s
            </div>
          </div>
        </div>

        {/* TWO-COLUMN BREAKDOWN: TIME PER PARTICULAR WORK/NOTE & PROJECT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* How Much You Worked on Each Particular Work / Note */}
          <div className="lg:col-span-8 rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Time Worked per Particular Work / Note</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cumulative active time spent on each specific note or task
                </p>
              </div>
            </div>

            {workBreakdown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                No work tracked yet. Click <strong>Start Timer</strong> above or inside any note to track your work!
              </div>
            ) : (
              <div className="space-y-3">
                {workBreakdown.map((item) => {
                  const pct =
                    totalActiveSec > 0
                      ? Math.min(100, Math.round((item.totalSec / totalActiveSec) * 100))
                      : 0;
                  const proj = projects.find((p) => p.id === item.projectId);
                  return (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-sm font-bold text-white truncate">
                            {item.title}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${proj?.color || '#6366f1'}20`,
                              color: proj?.color || '#818cf8',
                            }}
                          >
                            {proj?.name || 'General Notes'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {formatDurationHMS(item.totalSec)} ({pct}%)
                          </span>

                          {item.noteId && (
                            <button
                              type="button"
                              onClick={() => onOpenNote(item.noteId!)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1"
                              title="Open this Note in Editor"
                            >
                              <span>Open</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              onStartTimer({
                                taskTitle: item.title,
                                noteId: item.noteId,
                                projectId: item.projectId,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/25 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Track</span>
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{item.sessionsCount} session(s)</span>
                        {item.idleExcludedSec > 0 && (
                          <span className="text-amber-400">
                            {formatDurationHuman(item.idleExcludedSec)} idle time auto-excluded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time Breakdown by Project */}
          <div className="lg:col-span-4 rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Time by Project</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribution across workspaces
              </p>
            </div>

            {projectBreakdown.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                No project hours logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {projectBreakdown.map((proj) => {
                  const pct =
                    totalActiveSec > 0
                      ? Math.min(100, Math.round((proj.totalSec / totalActiveSec) * 100))
                      : 0;
                  return (
                    <div
                      key={proj.projectId}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: proj.color }}
                          />
                          {proj.name}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatDurationHuman(proj.totalSec)} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, pct)}%`,
                            backgroundColor: proj.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CHRONOLOGICAL WORK TIMELINE LOG */}
        <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Chronological Work Timeline</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed session-by-session timeline showing start time, end time, active work, and auto-excluded idle time
              </p>
            </div>
          </div>

          {workSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
              Your chronological work timeline is empty. Start the timer on any note or task and click <strong>Stop &amp; Log</strong> to record your first session.
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-indigo-500/30 space-y-3">
              {workSessions.map((session) => {
                const startStr = new Date(session.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const endStr = new Date(session.endedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const dateStr = new Date(session.startedAt).toLocaleDateString();
                const proj = projects.find((p) => p.id === session.projectId);

                return (
                  <div
                    key={session.id}
                    className="relative p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 hover:border-indigo-500/40 transition"
                  >
                    {/* Timeline Node Dot */}
                    <span className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-[#111827] absolute -left-[31px] top-5" />

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {startStr} → {endStr}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {dateStr}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${proj?.color || '#6366f1'}20`,
                            color: proj?.color || '#818cf8',
                          }}
                        >
                          {proj?.name || 'General Notes'}
                        </span>
                        {session.idleExcludedSec > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                            ⚡ {formatDurationHuman(session.idleExcludedSec)} idle excluded
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-white truncate">
                        {session.taskTitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                        +{formatDurationHMS(session.durationSec)}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onStartTimer({
                            taskTitle: session.taskTitle,
                            noteId: session.noteId,
                            projectId: session.projectId,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                        title="Resume working on this item"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Session Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
