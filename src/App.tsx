import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Folder,
  FolderPlus,
  Plus,
  Hash,
  Search,
  Pin,
  Network,
  Kanban,
  FileText,
  ExternalLink,
  Moon,
  Sun,
  BookOpen,
  Trash2,
  ChevronRight,
  ChevronDown,
  Sparkles,
  LayoutTemplate,
  FolderOpen,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Brush,
  Mic,
  Edit3,
  Clock,
  Play,
  Pause,
  Square,
  AlertTriangle,
} from 'lucide-react';
import {
  FolderItem,
  MainViewMode,
  NoteItem,
  NoteStatus,
  ProjectItem,
  TagMeta,
  WorkSessionLog,
  WorkspaceData,
} from './types';
import { DEFAULT_WORKSPACE, NOTE_TEMPLATES } from './defaultData';
import { NoteEditorPane } from './components/NoteEditorPane';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { KanbanBoardView } from './components/KanbanBoardView';
import {
  WorkTimerTimelineView,
  formatDurationHMS,
} from './components/WorkTimerTimelineView';
import { TrashFolderView } from './components/TrashFolderView';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { ScratchpadWidget } from './components/ScratchpadWidget';

const LOCAL_STORAGE_KEY = 'noteflow_studio_workspace_v1';

const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#38bdf8', // Sky
  '#a855f7', // Purple
];

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading local workspace:', e);
    }
    return DEFAULT_WORKSPACE;
  });

  const [vaultPath, setVaultPath] = useState<string>('~/Documents/NoteFlowVault');
  const [isElectronEnv, setIsElectronEnv] = useState<boolean>(false);
  const [syncIndicator, setSyncIndicator] = useState<'saved' | 'saving'>('saved');

  // Navigation & Filtering State
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all' | 'trash'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active Note & Split-Pane State
  const [activeNoteId, setActiveNoteId] = useState<string>(
    workspace.notes[0]?.id || 'note-welcome'
  );
  const [splitNoteId, setSplitNoteId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainViewMode>('editor');
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState<boolean>(false);

  // Modals / Inline Creation Inputs
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewFolderInputForProject, setShowNewFolderInputForProject] = useState<string | null>(
    null
  );
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({
    'proj-product': true,
    'proj-research': true,
    'proj-personal': true,
  });
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);

  // Load Vault info from Electron on startup
  useEffect(() => {
    if (window.electronAPI?.isElectron) {
      setIsElectronEnv(true);
      window.electronAPI.getVaultInfo().then((info) => {
        if (info.vaultPath) setVaultPath(info.vaultPath);
        if (info.workspace && info.workspace.notes?.length > 0) {
          setWorkspace(info.workspace);
          setActiveNoteId(info.workspace.notes[0].id);
        } else {
          window.electronAPI?.saveWorkspace(workspace);
        }
      });
    }
  }, []);

  // Auto-save to LocalStorage + Electron User Vault Folder on every change
  useEffect(() => {
    setSyncIndicator('saving');
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(workspace));
    } catch (e) {
      console.error('Failed saving to localStorage:', e);
    }

    const timer = window.setTimeout(async () => {
      if (window.electronAPI?.isElectron) {
        await window.electronAPI.saveWorkspace(workspace);
      }
      setSyncIndicator('saved');
    }, 350);

    return () => window.clearTimeout(timer);
  }, [workspace]);

  // Global Keyboard Shortcuts (Cmd+K, Cmd+\, Cmd+N)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCmdPaletteOpen((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setZenMode((v) => !v);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProjectId, selectedFolderId, selectedTag, workspace]);

  const activeProjects = useMemo(
    () => workspace.projects.filter((p) => !p.trashed),
    [workspace.projects]
  );

  const trashedProjects = useMemo(
    () => workspace.projects.filter((p) => Boolean(p.trashed)),
    [workspace.projects]
  );

  const activeNotes = useMemo(() => {
    const trashedProjIds = new Set(trashedProjects.map((p) => p.id));
    return workspace.notes.filter(
      (n) => !n.trashed && !trashedProjIds.has(n.projectId)
    );
  }, [workspace.notes, trashedProjects]);

  const trashedNotes = useMemo(() => {
    const trashedProjIds = new Set(trashedProjects.map((p) => p.id));
    return workspace.notes.filter(
      (n) => Boolean(n.trashed) || trashedProjIds.has(n.projectId)
    );
  }, [workspace.notes, trashedProjects]);

  // Filtered Notes when searching or filtering by #tag
  const filteredSidebarNotes = useMemo(() => {
    return activeNotes
      .filter((n) => {
        if (selectedTag && !n.tags.includes(selectedTag)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [activeNotes, selectedTag, searchQuery]);

  const activeNote = useMemo(() => {
    const candidate = activeNotes.find((n) => n.id === activeNoteId);
    if (candidate) return candidate;
    return filteredSidebarNotes[0] || activeNotes[0] || null;
  }, [activeNotes, activeNoteId, filteredSidebarNotes]);

  const splitNote = useMemo(
    () =>
      splitNoteId ? activeNotes.find((n) => n.id === splitNoteId) || null : null,
    [activeNotes, splitNoteId]
  );

  // =========================================================================
  // WORK TIMER & AUTOMATIC SYSTEM IDLE DETECTION ENGINE
  // =========================================================================
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerIdlePaused, setTimerIdlePaused] = useState(false);
  const [timerElapsedSec, setTimerElapsedSec] = useState(0);
  const [timerIdleElapsedSec, setTimerIdleElapsedSec] = useState(0);
  const [timerSessionIdleExcludedSec, setTimerSessionIdleExcludedSec] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null);
  const [timerTaskTitle, setTimerTaskTitle] = useState<string>(
    activeNote?.title || 'Focused Work Session'
  );
  const [timerNoteId, setTimerNoteId] = useState<string | null>(
    activeNote?.id || null
  );
  const [timerProjectId, setTimerProjectId] = useState<string>(
    activeNote?.projectId || 'general'
  );

  const lastActivityRef = useRef<number>(Date.now());
  const idleTimeoutSec = workspace.idleTimeoutSec || 120;
  const workSessions = workspace.workSessions || [];

  // Keep default timer task synced to activeNote when timer is idle/stopped
  useEffect(() => {
    if (!timerRunning && !timerPaused && !timerIdlePaused && activeNote) {
      setTimerTaskTitle(activeNote.title);
      setTimerNoteId(activeNote.id);
      setTimerProjectId(activeNote.projectId);
    }
  }, [activeNote, timerRunning, timerPaused, timerIdlePaused]);

  // Listen for user mouse/keyboard/scroll activity across the app
  useEffect(() => {
    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((ev) =>
      window.addEventListener(ev, recordActivity, { passive: true })
    );
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
    };
  }, []);

  // 1-second tick loop + Automatic System Idle Detection
  useEffect(() => {
    if (!timerRunning && !timerIdlePaused) return;

    const interval = window.setInterval(async () => {
      if (timerRunning && !timerIdlePaused) {
        let idleSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        if (window.electronAPI?.getSystemIdleTime) {
          try {
            const osIdle = await window.electronAPI.getSystemIdleTime();
            if (typeof osIdle === 'number' && osIdle > idleSec) {
              idleSec = osIdle;
            }
          } catch (_e) {
            // Ignore IPC errors
          }
        }

        if (idleSec >= idleTimeoutSec) {
          // Automatically pause timer due to system inactivity!
          setTimerRunning(false);
          setTimerIdlePaused(true);
          setTimerIdleElapsedSec(idleSec);
          setTimerElapsedSec((prev) => Math.max(1, prev - Math.min(prev - 1, idleSec - 1)));
        } else {
          setTimerElapsedSec((prev) => prev + 1);
        }
      } else if (timerIdlePaused) {
        setTimerIdleElapsedSec((prev) => prev + 1);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning, timerIdlePaused, idleTimeoutSec]);

  const handleStartTimer = (options?: {
    taskTitle?: string;
    noteId?: string | null;
    projectId?: string;
  }) => {
    // If another session was already running with elapsed time and user switches tasks, save previous first
    if (
      (timerRunning || timerPaused || timerIdlePaused) &&
      timerElapsedSec > 0 &&
      options?.taskTitle &&
      options.taskTitle !== timerTaskTitle
    ) {
      const prevSession: WorkSessionLog = {
        id: `work-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        taskTitle: timerTaskTitle || 'Focused Work',
        noteId: timerNoteId,
        projectId: timerProjectId || 'general',
        startedAt:
          timerStartedAt ||
          new Date(Date.now() - timerElapsedSec * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSec: timerElapsedSec,
        idleExcludedSec: timerSessionIdleExcludedSec + (timerIdlePaused ? timerIdleElapsedSec : 0),
        autoPausedByIdle: timerIdlePaused,
      };
      setWorkspace((prev) => ({
        ...prev,
        workSessions: [prevSession, ...(prev.workSessions || [])],
      }));
      setTimerElapsedSec(0);
      setTimerIdleElapsedSec(0);
      setTimerSessionIdleExcludedSec(0);
    }

    const nextTitle =
      options?.taskTitle ||
      timerTaskTitle ||
      activeNote?.title ||
      'Focused Work Session';
    const nextNoteId =
      options?.noteId !== undefined
        ? options.noteId
        : timerNoteId ?? activeNote?.id ?? null;
    const nextProjId =
      options?.projectId ||
      timerProjectId ||
      activeNote?.projectId ||
      'general';

    lastActivityRef.current = Date.now();
    setTimerTaskTitle(nextTitle);
    setTimerNoteId(nextNoteId);
    setTimerProjectId(nextProjId);
    if (!timerStartedAt || timerElapsedSec === 0) {
      setTimerStartedAt(new Date().toISOString());
    }
    setTimerPaused(false);
    setTimerIdlePaused(false);
    setTimerIdleElapsedSec(0);
    setTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
    setTimerPaused(true);
  };

  const handleResumeTimer = (keepIdleTime = false) => {
    lastActivityRef.current = Date.now();
    if (timerIdlePaused) {
      if (keepIdleTime) {
        setTimerElapsedSec((prev) => prev + timerIdleElapsedSec);
      } else {
        setTimerSessionIdleExcludedSec((prev) => prev + timerIdleElapsedSec);
      }
      setTimerIdleElapsedSec(0);
      setTimerIdlePaused(false);
    }
    setTimerPaused(false);
    setTimerRunning(true);
  };

  const handleStopAndSaveTimer = () => {
    const finalDuration = Math.max(1, timerElapsedSec);
    const totalIdleExcluded =
      timerSessionIdleExcludedSec + (timerIdlePaused ? timerIdleElapsedSec : 0);
    const newSession: WorkSessionLog = {
      id: `work-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      taskTitle: timerTaskTitle || activeNote?.title || 'Focused Work Session',
      noteId: timerNoteId,
      projectId: timerProjectId || activeNote?.projectId || 'general',
      startedAt:
        timerStartedAt ||
        new Date(Date.now() - finalDuration * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: finalDuration,
      idleExcludedSec: totalIdleExcluded,
      autoPausedByIdle: timerIdlePaused,
    };

    setWorkspace((prev) => ({
      ...prev,
      workSessions: [newSession, ...(prev.workSessions || [])],
    }));

    setTimerRunning(false);
    setTimerPaused(false);
    setTimerIdlePaused(false);
    setTimerElapsedSec(0);
    setTimerIdleElapsedSec(0);
    setTimerSessionIdleExcludedSec(0);
    setTimerStartedAt(null);
  };

  const handleSimulateIdle = () => {
    if (!timerRunning) return;
    setTimerRunning(false);
    setTimerIdlePaused(true);
    setTimerIdleElapsedSec(idleTimeoutSec);
  };

  const getWorkedSecondsForNote = (noteId: string): number => {
    const saved = workSessions
      .filter((s) => s.noteId === noteId)
      .reduce((acc, s) => acc + s.durationSec, 0);
    const live =
      (timerRunning || timerPaused || timerIdlePaused) && timerNoteId === noteId
        ? timerElapsedSec
        : 0;
    return saved + live;
  };

  // Handlers
  const handleUpdateNote = (updated: NoteItem) => {
    setWorkspace((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === updated.id ? updated : n)),
    }));
  };

  const handleCreateNote = (options?: {
    title?: string;
    content?: string;
    projectId?: string;
    folderId?: string | null;
    status?: NoteStatus;
    tags?: string[];
    style?: 'document' | 'wide' | 'cards';
    clearScratchpad?: boolean;
  }) => {
    const rawProjId =
      options?.projectId ||
      (selectedProjectId !== 'all' && selectedProjectId !== 'trash'
        ? selectedProjectId
        : activeProjects[0]?.id || 'general');

    const targetProjId = activeProjects.some((p) => p.id === rawProjId)
      ? rawProjId
      : activeProjects[0]?.id || 'general';

    const rawFolderId =
      options?.folderId !== undefined ? options.folderId : selectedFolderId;
    const targetFolderId = workspace.folders.some(
      (f) => f.id === rawFolderId && f.projectId === targetProjId && !f.trashed
    )
      ? rawFolderId
      : null;

    const newNote: NoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: options?.title || 'Untitled Note',
      content:
        options?.content ??
        `Write plain text here just like Notepad++ (press Tab to indent, Cmd+F for Find & Replace, or type / to insert blocks)...\n`,
      projectId: targetProjId,
      folderId: targetFolderId,
      tags: options?.tags || (selectedTag ? [selectedTag] : []),
      status: options?.status || 'todo',
      format: 'txt',
      pinned: false,
      style: options?.style || 'document',
      font: 'sans',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWorkspace((prev) => ({
      ...prev,
      scratchpad: options?.clearScratchpad ? '' : prev.scratchpad,
      notes: [newNote, ...prev.notes],
    }));
    setExpandedProjects((prev) => ({ ...prev, [targetProjId]: true }));
    if (targetFolderId) {
      setExpandedFolders((prev) => ({ ...prev, [targetFolderId]: true }));
    }
    setSearchQuery('');
    setSelectedTag(null);
    setActiveNoteId(newNote.id);
    setMainView('editor');
  };

  // Delete Note -> Stored in Trash Folder
  const handleDeleteNote = (noteId: string) => {
    setWorkspace((prev) => {
      const updatedNotes = prev.notes.map((n) =>
        n.id === noteId ? { ...n, trashed: true, pinned: false } : n
      );
      if (activeNoteId === noteId) {
        const nextActive = updatedNotes.find((n) => !n.trashed && n.id !== noteId);
        if (nextActive) setActiveNoteId(nextActive.id);
      }
      return {
        ...prev,
        notes: updatedNotes,
      };
    });
    if (splitNoteId === noteId) {
      setSplitNoteId(null);
    }
  };

  const handleRestoreNote = (noteId: string) => {
    setWorkspace((prev) => {
      const targetNote = prev.notes.find((n) => n.id === noteId);
      const updatedProjects = targetNote
        ? prev.projects.map((p) =>
            p.id === targetNote.projectId ? { ...p, trashed: false } : p
          )
        : prev.projects;
      return {
        ...prev,
        projects: updatedProjects,
        notes: prev.notes.map((n) => (n.id === noteId ? { ...n, trashed: false } : n)),
      };
    });
  };

  const handlePermanentDeleteNote = (noteId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.id !== noteId),
    }));
  };

  // Delete Project -> Stored in Trash Folder along with its notes
  const handleDeleteProject = (projectId: string) => {
    setWorkspace((prev) => {
      const updatedProjects = prev.projects.map((p) =>
        p.id === projectId ? { ...p, trashed: true } : p
      );
      const updatedNotes = prev.notes.map((n) =>
        n.projectId === projectId ? { ...n, trashed: true, pinned: false } : n
      );
      const nextActive = updatedNotes.find((n) => !n.trashed);
      if (nextActive) setActiveNoteId(nextActive.id);

      return {
        ...prev,
        projects: updatedProjects,
        notes: updatedNotes,
      };
    });
    if (selectedProjectId === projectId) {
      setSelectedProjectId('all');
    }
  };

  const handleRestoreProject = (projectId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, trashed: false } : p
      ),
      notes: prev.notes.map((n) =>
        n.projectId === projectId ? { ...n, trashed: false } : n
      ),
    }));
  };

  const handlePermanentDeleteProject = (projectId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== projectId),
      folders: prev.folders.filter((f) => f.projectId !== projectId),
      notes: prev.notes.filter((n) => n.projectId !== projectId),
    }));
  };

  const handleEmptyTrash = () => {
    const trashedProjIds = new Set(
      workspace.projects.filter((p) => p.trashed).map((p) => p.id)
    );
    setWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => !p.trashed),
      folders: prev.folders.filter((f) => !trashedProjIds.has(f.projectId)),
      notes: prev.notes.filter(
        (n) => !n.trashed && !trashedProjIds.has(n.projectId)
      ),
    }));
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      color: PROJECT_COLORS[workspace.projects.length % PROJECT_COLORS.length],
      icon: 'Folder',
    };
    setWorkspace((prev) => ({
      ...prev,
      projects: [...prev.projects, newProj],
    }));
    setExpandedProjects((prev) => ({ ...prev, [newProj.id]: true }));
    setSelectedProjectId(newProj.id);
    setSelectedFolderId(null);
    setNewProjectName('');
    setShowNewProjectInput(false);
  };

  const handleAddFolder = (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newFold: FolderItem = {
      id: `fold-${Date.now()}`,
      name: newFolderName.trim(),
      projectId,
      parentId: newFolderParentId,
    };
    setWorkspace((prev) => ({
      ...prev,
      folders: [...prev.folders, newFold],
    }));
    setSelectedProjectId(projectId);
    setSelectedFolderId(newFold.id);
    setNewFolderName('');
    setNewFolderParentId(null);
    setShowNewFolderInputForProject(null);
  };

  const handleAddTagMeta = (tagName: string) => {
    const clean = tagName.toLowerCase().trim();
    if (!clean) return;
    if (workspace.tags.some((t) => t.name === clean)) return;
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#38bdf8', '#a855f7'];
    const newTag: TagMeta = {
      name: clean,
      color: colors[workspace.tags.length % colors.length],
    };
    setWorkspace((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }));
  };

  const handleQuickAddDockSketch = () => {
    if (!activeNote) return;
    setMainView('editor');
    handleUpdateNote({
      ...activeNote,
      drawings: [
        ...(activeNote.drawings || []),
        {
          id: `draw-${Date.now()}`,
          title: `Sketch ${(activeNote.drawings?.length || 0) + 1}`,
          dataUrl: '',
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleQuickAddDockVoice = () => {
    if (!activeNote) return;
    setMainView('editor');
    handleUpdateNote({
      ...activeNote,
      voiceNotes: [
        ...(activeNote.voiceNotes || []),
        {
          id: `voice-${Date.now()}`,
          title: `Voice Memo ${(activeNote.voiceNotes?.length || 0) + 1}`,
          audioDataUrl: '',
          durationSec: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleChooseVaultFolder = async () => {
    if (window.electronAPI?.isElectron) {
      const res = await window.electronAPI.chooseVaultFolder();
      if (!res.canceled && res.vaultPath) {
        setVaultPath(res.vaultPath);
        if (res.existingWorkspace && res.existingWorkspace.notes?.length) {
          setWorkspace(res.existingWorkspace);
          setActiveNoteId(res.existingWorkspace.notes[0].id);
        } else {
          await window.electronAPI.saveWorkspace(workspace);
        }
      }
    } else {
      const custom = window.prompt(
        'Enter local Vault directory path where notes should be organized:',
        vaultPath
      );
      if (custom && custom.trim()) {
        setVaultPath(custom.trim());
      }
    }
  };

  const handleExportNote = async (
    note: NoteItem,
    format: 'txt' | 'md' | 'html' | 'pdf'
  ) => {
    if (format === 'pdf') {
      window.print();
      return;
    }

    const safeTitle = (note.title || 'note').replace(/[^a-zA-Z0-9_-]/g, '_');
    const content =
      format === 'txt'
        ? note.content
        : format === 'md'
        ? `---\ntitle: "${note.title}"\ntags: [${note.tags.join(', ')}]\nstatus: ${
            note.status
          }\n---\n\n${note.content}`
        : `<!doctype html><html><head><meta charset="utf-8"><title>${
            note.title
          }</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.6;color:#0f172a;}pre{background:#f1f5f9;padding:16px;border-radius:8px;overflow:auto;}</style></head><body><h1>${
            note.title
          }</h1><p><strong>Tags:</strong> ${note.tags
            .map((t) => `#${t}`)
            .join(' ')}</p><hr/><pre style="white-space:pre-wrap;font-family:inherit;">${
            note.content
          }</pre></body></html>`;

    if (window.electronAPI?.isElectron) {
      await window.electronAPI.exportFile({
        defaultName: `${safeTitle}.${format}`,
        content,
        ext: format,
      });
    } else {
      const blob = new Blob([content], {
        type:
          format === 'html'
            ? 'text/html'
            : format === 'txt'
            ? 'text/plain'
            : 'text/markdown',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeTitle}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const vaultFolderDisplayName = useMemo(() => {
    const parts = vaultPath.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || vaultPath;
  }, [vaultPath]);

  const totalTrashCount = trashedProjects.length + trashedNotes.length;

  // Theme wrapper classes
  const themeWrapperClass =
    workspace.theme === 'light'
      ? 'theme-light bg-slate-100 text-slate-900'
      : workspace.theme === 'sepia'
      ? 'theme-sepia bg-[#f4ecd8] text-[#3b3123]'
      : 'theme-dark bg-[#0b0f19] text-slate-100';

  return (
    <div className={`flex h-screen w-screen overflow-hidden select-none ${themeWrapperClass}`}>
      {/* SINGLE COLLAPSIBLE LEFT SIDEBAR (Option 1 Zen Layout — No Middle Column!) */}
      {!zenMode && (
        <aside className="w-[272px] bg-[#0f1626] border-r border-slate-800/80 flex flex-col justify-between shrink-0 relative z-30">
          {/* Top Sidebar Header (macOS traffic-light space + Minimize Sidebar button + New Note CTA) */}
          <div className="p-4 pt-3 border-b border-slate-800/60 relative z-40 shrink-0">
            {/* Window Drag Region + Minimize Sidebar Button */}
            <div
              style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              className="flex items-center justify-end h-7 mb-3"
            >
              <button
                type="button"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                onClick={() => setZenMode(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition"
                title="Minimize Sidebar (Cmd + \)"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Minimize</span>
              </button>
            </div>

            {/* + New Note & Template Button Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCreateNote()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-indigo-500/25 transition"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  New Note
                </span>
                <span className="text-xs opacity-75 font-mono">⌘N</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTemplatesMenu((v) => !v)}
                className={`p-2.5 rounded-xl border transition ${
                  showTemplatesMenu
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
                title="Create Note from Template"
              >
                <LayoutTemplate className="w-4 h-4 text-indigo-400" />
              </button>
            </div>

            {/* Unclipped Full-Width Templates Popover */}
            {showTemplatesMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTemplatesMenu(false)}
                />
                <div className="absolute left-3 right-3 top-24 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl p-2 z-50">
                  <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      1-Click Note Templates
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTemplatesMenu(false)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {NOTE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          const today = new Date().toLocaleDateString();
                          handleCreateNote({
                            title: `${tpl.name} (${today})`,
                            content: tpl.content.replace(/\{\{date\}\}/g, today),
                            tags: tpl.tags,
                            style: tpl.style,
                          });
                          setShowTemplatesMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-indigo-600/20 border border-transparent hover:border-indigo-500/30 transition group flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-semibold text-slate-100 group-hover:text-white truncate">
                            {tpl.name}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            #{tpl.tags.join(' #')}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-indigo-400 shrink-0">
                          + Use
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Quick Sidebar Filter Input */}
            <div className="relative mt-2.5">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter notes by title, text, #tag..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Unified Tree: All Notes, Pinned, Projects & Notes, and Quick Tags */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-5">
            {/* All Notes Button */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId('all');
                  setSelectedFolderId(null);
                  setSelectedTag(null);
                  setMainView('editor');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  selectedProjectId === 'all' && !selectedTag && mainView === 'editor'
                    ? 'bg-indigo-600/15 text-white border border-indigo-500/35'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  All Notes
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {activeNotes.length}
                </span>
              </button>

              {/* If searchQuery or selectedTag is active, show matching notes directly at the top */}
              {(searchQuery.trim() || selectedTag) && (
                <div className="pt-2 space-y-1">
                  <div className="flex items-center justify-between px-2 text-xs font-bold text-indigo-400">
                    <span>
                      {selectedTag ? `Filtered by #${selectedTag}` : 'Search Matches'} (
                      {filteredSidebarNotes.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTag(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  {filteredSidebarNotes.map((n) => (
                    <div
                      key={`filter-${n.id}`}
                      onClick={() => {
                        setActiveNoteId(n.id);
                        setMainView('editor');
                      }}
                      className={`px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition ${
                        activeNote?.id === n.id
                          ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">📄 {n.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pinned Notes */}
              {activeNotes.some((n) => n.pinned) && (
                <div className="pt-2">
                  <div className="px-2.5 pb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Pin className="w-3 h-3 text-amber-400" />
                    <span>Pinned Notes</span>
                  </div>
                  <div className="space-y-0.5">
                    {activeNotes
                      .filter((n) => n.pinned)
                      .map((pinnedNote) => (
                        <button
                          key={pinnedNote.id}
                          type="button"
                          onClick={() => {
                            setActiveNoteId(pinnedNote.id);
                            setMainView('editor');
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 transition ${
                            activeNote?.id === pinnedNote.id && mainView === 'editor'
                              ? 'bg-indigo-600/15 text-white font-semibold border border-indigo-500/35'
                              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="truncate flex-1">{pinnedNote.title}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* PROJECTS & NOTES (Unified Tree matching Option 1!) */}
            <div>
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Projects &amp; Folders
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewProjectInput((v) => !v)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Create New Project Workspace"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {showNewProjectInput && (
                <form
                  onSubmit={handleAddProject}
                  className="mb-3 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New Project name..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-xs text-white focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProjectInput(false);
                        setNewProjectName('');
                      }}
                      className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                    >
                      Create
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5">
                {activeProjects.map((proj) => {
                  const isExpanded = expandedProjects[proj.id] ?? true;
                  const projFolders = workspace.folders.filter(
                    (f) => f.projectId === proj.id && !f.trashed
                  );
                  const rootFolders = projFolders.filter((f) => !f.parentId);
                  const projNotes = activeNotes.filter((n) => n.projectId === proj.id);

                  return (
                    <div key={proj.id} className="space-y-1">
                      {/* Project Row with Hover Actions (+ Note, + Folder, 🗑️ Delete Project) */}
                      <div className="group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800/50 cursor-pointer transition">
                        <div
                          onClick={() =>
                            setExpandedProjects((p) => ({
                              ...p,
                              [proj.id]: !isExpanded,
                            }))
                          }
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <span className="text-slate-500 shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="font-semibold truncate">{proj.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateNote({ projectId: proj.id, folderId: null });
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title={`New Note in ${proj.name}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowNewFolderInputForProject(proj.id);
                              setNewFolderParentId(null);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title={`New Folder in ${proj.name}`}
                          >
                            <FolderPlus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(proj.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                            title={`Delete Project "${proj.name}" to Trash`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono text-slate-500 min-w-[14px] text-right">
                            {projNotes.length}
                          </span>
                        </div>
                      </div>

                      {/* New Folder Input inside Project */}
                      {showNewFolderInputForProject === proj.id && (
                        <form
                          onSubmit={(e) => handleAddFolder(e, proj.id)}
                          className="ml-4 my-1 p-2 rounded-xl bg-slate-900 border border-slate-700/80"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onBlur={() => {
                              if (!newFolderName.trim())
                                setShowNewFolderInputForProject(null);
                            }}
                            placeholder={
                              newFolderParentId
                                ? 'New subfolder name...'
                                : 'New folder name...'
                            }
                            className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 focus:border-indigo-500 text-xs text-white focus:outline-none"
                          />
                        </form>
                      )}

                      {/* Expanded Project Tree: Root Notes + Nested Folders with Their Notes */}
                      {isExpanded && (
                        <div className="ml-4 pl-3 border-l-[1.5px] border-slate-800 space-y-1 py-0.5">
                          {/* Notes at the Root of this Project (not inside a subfolder) */}
                          {projNotes
                            .filter(
                              (n) =>
                                !n.folderId ||
                                !projFolders.some((f) => f.id === n.folderId)
                            )
                            .map((noteItem) => {
                              const isSelected =
                                activeNote?.id === noteItem.id && mainView === 'editor';
                              return (
                                <div
                                  key={noteItem.id}
                                  onClick={() => {
                                    setActiveNoteId(noteItem.id);
                                    setMainView('editor');
                                  }}
                                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40'
                                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {noteItem.title || 'Untitled'}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteNote(noteItem.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 shrink-0 transition"
                                    title={`Move "${noteItem.title}" to Trash`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}

                          {/* Folders & Subfolders inside this Project (with their nested Notes & Minimize/Expand Toggle!) */}
                          {rootFolders.map((folder) => {
                            const isFolderExpanded =
                              expandedFolders[folder.id] ?? true;
                            const childFolders = projFolders.filter(
                              (cf) => cf.parentId === folder.id
                            );
                            const folderNotes = projNotes.filter(
                              (n) => n.folderId === folder.id
                            );
                            return (
                              <div key={folder.id} className="space-y-1 pt-0.5">
                                <div
                                  onClick={() => {
                                    setExpandedFolders((prev) => ({
                                      ...prev,
                                      [folder.id]: !isFolderExpanded,
                                    }));
                                    setSelectedProjectId(proj.id);
                                    setSelectedFolderId(folder.id);
                                    setMainView('editor');
                                  }}
                                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                                    selectedFolderId === folder.id
                                      ? 'bg-slate-800/80 text-indigo-300 font-medium'
                                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white'
                                  }`}
                                  title={
                                    isFolderExpanded
                                      ? `Minimize folder "${folder.name}"`
                                      : `Expand folder "${folder.name}"`
                                  }
                                >
                                  <span className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                    <span className="text-slate-500 shrink-0">
                                      {isFolderExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                    <Folder className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
                                    <span className="truncate font-medium">
                                      {folder.name}
                                    </span>
                                  </span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedFolders((prev) => ({
                                          ...prev,
                                          [folder.id]: true,
                                        }));
                                        handleCreateNote({
                                          projectId: proj.id,
                                          folderId: folder.id,
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                                      title={`New Note in ${folder.name}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedFolders((prev) => ({
                                          ...prev,
                                          [folder.id]: true,
                                        }));
                                        setShowNewFolderInputForProject(proj.id);
                                        setNewFolderParentId(folder.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                                      title="Add Nested Subfolder"
                                    >
                                      <FolderPlus className="w-3 h-3" />
                                    </button>
                                    {folderNotes.length > 0 && (
                                      <span className="text-[11px] font-mono text-slate-500 min-w-[12px] text-right">
                                        {folderNotes.length}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Notes & Subfolders inside this Folder (hidden when Folder is minimized!) */}
                                {isFolderExpanded && (
                                  <>
                                    {folderNotes.length > 0 && (
                                      <div className="ml-4 pl-2.5 border-l border-slate-800/80 space-y-1">
                                        {folderNotes.map((noteItem) => {
                                          const isSelected =
                                            activeNote?.id === noteItem.id &&
                                            mainView === 'editor';
                                          return (
                                            <div
                                              key={noteItem.id}
                                              onClick={() => {
                                                setActiveNoteId(noteItem.id);
                                                setSelectedFolderId(folder.id);
                                                setMainView('editor');
                                              }}
                                              className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                                                isSelected
                                                  ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40'
                                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                              }`}
                                            >
                                              <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                                                <FileText className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                                                <span className="truncate">
                                                  {noteItem.title || 'Untitled'}
                                                </span>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteNote(noteItem.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 shrink-0 transition"
                                                title={`Move "${noteItem.title}" to Trash`}
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Nested Subfolders & Their Notes */}
                                    {childFolders.map((sub) => {
                                      const isSubExpanded =
                                        expandedFolders[sub.id] ?? true;
                                      const subNotes = projNotes.filter(
                                        (n) => n.folderId === sub.id
                                      );
                                      return (
                                        <div
                                          key={sub.id}
                                          className="ml-3 pl-2.5 border-l border-slate-800/70 space-y-1"
                                        >
                                          <div
                                            onClick={() => {
                                              setExpandedFolders((prev) => ({
                                                ...prev,
                                                [sub.id]: !isSubExpanded,
                                              }));
                                              setSelectedProjectId(proj.id);
                                              setSelectedFolderId(sub.id);
                                              setMainView('editor');
                                            }}
                                            className={`group px-2.5 py-1.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition ${
                                              selectedFolderId === sub.id
                                                ? 'bg-slate-800/80 text-indigo-300 font-medium'
                                                : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                                            }`}
                                            title={
                                              isSubExpanded
                                                ? `Minimize subfolder "${sub.name}"`
                                                : `Expand subfolder "${sub.name}"`
                                            }
                                          >
                                            <span className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                                              <span className="text-slate-500 shrink-0">
                                                {isSubExpanded ? (
                                                  <ChevronDown className="w-3 h-3" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3" />
                                                )}
                                              </span>
                                              <Folder className="w-3 h-3 text-amber-400/80 shrink-0" />
                                              <span className="truncate">{sub.name}</span>
                                            </span>
                                            {subNotes.length > 0 && (
                                              <span className="text-[11px] font-mono text-slate-500">
                                                {subNotes.length}
                                              </span>
                                            )}
                                          </div>

                                          {isSubExpanded && subNotes.length > 0 && (
                                            <div className="ml-3 pl-2.5 border-l border-slate-800/70 space-y-1">
                                              {subNotes.map((noteItem) => {
                                                const isSelected =
                                                  activeNote?.id === noteItem.id &&
                                                  mainView === 'editor';
                                                return (
                                                  <div
                                                    key={noteItem.id}
                                                    onClick={() => {
                                                      setActiveNoteId(noteItem.id);
                                                      setSelectedFolderId(sub.id);
                                                      setMainView('editor');
                                                    }}
                                                    className={`group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer transition ${
                                                      isSelected
                                                        ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40'
                                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                                    }`}
                                                  >
                                                    <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                                                      <FileText className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
                                                      <span className="truncate">
                                                        {noteItem.title || 'Untitled'}
                                                      </span>
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteNote(noteItem.id);
                                                      }}
                                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 shrink-0 transition"
                                                      title={`Move "${noteItem.title}" to Trash`}
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned / General Notes (when a note's project was deleted or no projects exist) */}
                {(() => {
                  const unassignedNotes = activeNotes.filter(
                    (n) => !activeProjects.some((p) => p.id === n.projectId)
                  );
                  if (unassignedNotes.length === 0) return null;
                  return (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                          <span>General Notes</span>
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          {unassignedNotes.length}
                        </span>
                      </div>
                      <div className="ml-4 pl-3 border-l-[1.5px] border-slate-800 space-y-1 py-0.5">
                        {unassignedNotes.map((noteItem) => {
                          const isSelected =
                            activeNote?.id === noteItem.id && mainView === 'editor';
                          return (
                            <div
                              key={noteItem.id}
                              onClick={() => {
                                setActiveNoteId(noteItem.id);
                                setMainView('editor');
                              }}
                              className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                                isSelected
                                  ? 'bg-indigo-600/20 text-white font-semibold border border-indigo-500/40'
                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate min-w-0 flex-1">
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {noteItem.title || 'Untitled'}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(noteItem.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 shrink-0 transition"
                                title={`Move "${noteItem.title}" to Trash`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* QUICK TAGS */}
            <div>
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick Tags
                </span>
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="text-xs text-indigo-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {workspace.tags.map((tag) => {
                  const isSelected = selectedTag === tag.name;
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Hash
                        className="w-3 h-3"
                        style={{ color: isSelected ? '#fff' : tag.color }}
                      />
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Bottom: Trash Folder & Local Vault Status Card */}
          <div className="p-3.5 border-t border-slate-800/80 space-y-2 bg-[#0b0f19]/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedProjectId('trash');
                setMainView('trash');
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                mainView === 'trash'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Trash Bin
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
                {totalTrashCount}
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#090d16] border border-slate-800/90 text-xs">
              <button
                type="button"
                onClick={handleChooseVaultFolder}
                className="flex items-center gap-2 min-w-0 flex-1 text-left group"
                title={`Local Vault: ${vaultPath} — Click to change folder`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    syncIndicator === 'saving'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-slate-400 truncate">
                  Local Vault:{' '}
                  <strong className="text-slate-200 group-hover:text-indigo-300">
                    {vaultFolderDisplayName}
                  </strong>
                </span>
              </button>

              {isElectronEnv && (
                <button
                  type="button"
                  onClick={() => window.electronAPI?.revealInFinder()}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                  title="Open Vault Folder in macOS Finder"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* RIGHT: MAIN ZEN WORKSPACE WITH FLOATING TOP DOCK */}
      <main
        className="flex-1 flex flex-col h-full overflow-hidden relative"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12), transparent 55%)',
        }}
      >
        {/* TOP FLOATING DOCK BAR (Draggable Window Area + Floating Centered Dock) */}
        <header
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          className={`flex items-center justify-between px-6 pt-3 pb-2 shrink-0 z-30 ${
            zenMode ? 'pl-24' : ''
          }`}
        >
          {/* Left: Expand Sidebar Button (when minimized) or Subtle Brand */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-2 min-w-[130px]"
          >
            {zenMode ? (
              <button
                type="button"
                onClick={() => setZenMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs font-semibold text-slate-200 shadow-lg transition"
                title="Expand Sidebar (Cmd + \)"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Show Sidebar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>NoteFlow Studio</span>
              </div>
            )}
          </div>

          {/* CENTER: FLOATING TOP DOCK (Option 1 Dock Moved to the Top!) */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setMainView('editor')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mainView === 'editor'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/35'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Workspace Editor</span>
            </button>

            <button
              type="button"
              onClick={handleQuickAddDockSketch}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition"
              title="Add Freehand Sketch Canvas to Note"
            >
              <Brush className="w-3.5 h-3.5 text-rose-400" />
              <span>Sketch</span>
            </button>

            <button
              type="button"
              onClick={handleQuickAddDockVoice}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition"
              title="Add Voice Memo Recorder to Note"
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Voice</span>
            </button>

            <div className="h-4 w-px bg-slate-700/80 mx-1" />

            <button
              type="button"
              onClick={() => setMainView('graph')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mainView === 'graph'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/35'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>Knowledge Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('kanban')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mainView === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/35'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kanban &amp; Tasks</span>
            </button>

            <button
              type="button"
              onClick={() => setMainView('timeline')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                mainView === 'timeline'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/35'
                  : timerIdlePaused
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                  : timerRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title="Open Work Timer & Timeline Tracker"
            >
              <Clock
                className={`w-3.5 h-3.5 ${
                  timerIdlePaused
                    ? 'text-amber-400'
                    : timerRunning
                    ? 'text-emerald-400 animate-pulse'
                    : 'text-sky-400'
                }`}
              />
              <span>
                {timerRunning || timerPaused || timerIdlePaused
                  ? `Work Timer (${formatDurationHMS(timerElapsedSec)})`
                  : 'Work Timer'}
              </span>
            </button>

            {/* Quick Start / Stop Button right in the Top Dock */}
            {!timerRunning && !timerPaused && !timerIdlePaused ? (
              <button
                type="button"
                onClick={() =>
                  handleStartTimer({
                    taskTitle: activeNote?.title || 'Focused Work Session',
                    noteId: activeNote?.id || null,
                    projectId: activeNote?.projectId || 'general',
                  })
                }
                className="p-1.5 rounded-full bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white transition"
                title="Quick Start Work Timer for Current Note"
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopAndSaveTimer}
                className="p-1.5 rounded-full bg-rose-500/25 hover:bg-rose-600 text-rose-300 hover:text-white transition"
                title="Stop & Log Current Work Session"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            )}

            <div className="h-4 w-px bg-slate-700/80 mx-1" />

            <button
              type="button"
              onClick={() => setIsCmdPaletteOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-1.5 transition"
              title="Open Instant Command Palette (Cmd + K)"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Search ⌘K</span>
            </button>
          </div>

          {/* Right: Theme Switcher & Zen Toggle */}
          <div
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="flex items-center justify-end gap-2 min-w-[130px]"
          >
            <div className="flex items-center bg-slate-900/90 p-1 rounded-full border border-slate-800">
              <button
                type="button"
                onClick={() => setWorkspace((p) => ({ ...p, theme: 'dark' }))}
                className={`p-1.5 rounded-full transition ${
                  workspace.theme === 'dark'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Midnight Dark Theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWorkspace((p) => ({ ...p, theme: 'light' }))}
                className={`p-1.5 rounded-full transition ${
                  workspace.theme === 'light'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Clean Daylight Theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setWorkspace((p) => ({ ...p, theme: 'sepia' }))}
                className={`p-1.5 rounded-full transition ${
                  workspace.theme === 'sepia'
                    ? 'bg-amber-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Warm Sepia Paper Theme"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setZenMode((v) => !v)}
              className="hidden sm:inline-flex p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
              title="Toggle Focus / Zen Mode (Cmd + \)"
            >
              {zenMode ? (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftClose className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </header>

        {/* GLOBAL SYSTEM IDLE AUTO-PAUSE BANNER (Shown when outside Timeline view) */}
        {timerIdlePaused && mainView !== 'timeline' && (
          <div className="mx-6 mt-2 px-4 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/50 flex flex-wrap items-center justify-between gap-3 z-30">
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>System Idle Detected:</strong> Work timer auto-paused on{' '}
                <strong className="text-white">&ldquo;{timerTaskTitle}&rdquo;</strong> (Idle:{' '}
                <span className="font-mono font-bold">{timerIdleElapsedSec}s</span>)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResumeTimer(false)}
                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Resume (Discard Idle)
              </button>
              <button
                type="button"
                onClick={() => handleResumeTimer(true)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Keep Idle &amp; Resume
              </button>
              <button
                type="button"
                onClick={handleStopAndSaveTimer}
                className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
              >
                Stop &amp; Save
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE VIEW BODY */}
        <div className="flex-1 flex overflow-hidden">
          {mainView === 'timeline' && (
            <WorkTimerTimelineView
              notes={activeNotes}
              projects={activeProjects}
              workSessions={workSessions}
              activeNoteId={activeNote?.id || ''}
              timerRunning={timerRunning}
              timerPaused={timerPaused}
              timerIdlePaused={timerIdlePaused}
              timerElapsedSec={timerElapsedSec}
              timerIdleElapsedSec={timerIdleElapsedSec}
              timerTaskTitle={timerTaskTitle}
              timerNoteId={timerNoteId}
              timerProjectId={timerProjectId}
              idleTimeoutSec={idleTimeoutSec}
              onChangeTaskTitle={setTimerTaskTitle}
              onSelectNoteToTrack={(noteId) => {
                setTimerNoteId(noteId);
                if (noteId) {
                  const found = activeNotes.find((n) => n.id === noteId);
                  if (found) {
                    setTimerTaskTitle(found.title);
                    setTimerProjectId(found.projectId);
                  }
                }
              }}
              onStartTimer={handleStartTimer}
              onPauseTimer={handlePauseTimer}
              onResumeTimer={handleResumeTimer}
              onStopAndSaveTimer={handleStopAndSaveTimer}
              onSimulateIdle={handleSimulateIdle}
              onChangeIdleTimeout={(seconds) =>
                setWorkspace((prev) => ({ ...prev, idleTimeoutSec: seconds }))
              }
              onDeleteSession={(sessionId) =>
                setWorkspace((prev) => ({
                  ...prev,
                  workSessions: (prev.workSessions || []).filter(
                    (s) => s.id !== sessionId
                  ),
                }))
              }
              onOpenNote={(noteId) => {
                setActiveNoteId(noteId);
                setMainView('editor');
              }}
            />
          )}

          {mainView === 'graph' && (
            <div className="flex-1 h-full overflow-hidden">
              <KnowledgeGraphView
                notes={activeNotes}
                projects={activeProjects}
                tags={workspace.tags}
                activeNoteId={activeNote?.id || ''}
                onSelectNote={(noteId, inSplit) => {
                  if (inSplit) {
                    setSplitNoteId(noteId);
                  } else {
                    setActiveNoteId(noteId);
                  }
                  setMainView('editor');
                }}
              />
            </div>
          )}

          {mainView === 'kanban' && (
            <div className="flex-1 h-full overflow-hidden">
              <KanbanBoardView
                notes={activeNotes}
                projects={activeProjects}
                onUpdateNoteStatus={(noteId, status) => {
                  const found = workspace.notes.find((n) => n.id === noteId);
                  if (found) {
                    handleUpdateNote({
                      ...found,
                      status,
                      updatedAt: new Date().toISOString(),
                    });
                  }
                }}
                onToggleExtractedTask={(noteId, lineIndex) => {
                  const found = workspace.notes.find((n) => n.id === noteId);
                  if (!found) return;
                  const lines = found.content.split('\n');
                  const line = lines[lineIndex];
                  if (!line) return;
                  if (/^- \[ \]/.test(line)) {
                    lines[lineIndex] = line.replace(/^- \[ \]/, '- [x]');
                  } else {
                    lines[lineIndex] = line.replace(/^- \[[xX]\]/, '- [ ]');
                  }
                  handleUpdateNote({
                    ...found,
                    content: lines.join('\n'),
                    updatedAt: new Date().toISOString(),
                  });
                }}
                onSelectNote={(noteId, inSplit) => {
                  if (inSplit) setSplitNoteId(noteId);
                  else setActiveNoteId(noteId);
                  setMainView('editor');
                }}
                onCreateNoteInStatus={(status, projectId) =>
                  handleCreateNote({
                    title: `New ${status.toUpperCase()} Note`,
                    status,
                    projectId,
                  })
                }
              />
            </div>
          )}

          {mainView === 'trash' && (
            <TrashFolderView
              trashedProjects={trashedProjects}
              trashedNotes={trashedNotes}
              allProjects={workspace.projects}
              vaultPath={vaultPath}
              onRestoreProject={handleRestoreProject}
              onPermanentDeleteProject={handlePermanentDeleteProject}
              onRestoreNote={handleRestoreNote}
              onPermanentDeleteNote={handlePermanentDeleteNote}
              onEmptyTrash={handleEmptyTrash}
            />
          )}

          {mainView === 'editor' && (
            <div className="flex-1 flex overflow-hidden divide-x divide-slate-800/80">
              {activeNote ? (
                <>
                  {/* Primary Zen Editor Pane */}
                  <div className="flex-1 h-full overflow-hidden">
                    <NoteEditorPane
                      note={activeNote}
                      allNotes={activeNotes}
                      projects={activeProjects}
                      folders={workspace.folders}
                      tags={workspace.tags}
                      zenMode={zenMode}
                      onToggleZenMode={() => setZenMode((v) => !v)}
                      onUpdateNote={handleUpdateNote}
                      onDeleteNote={handleDeleteNote}
                      onSelectNote={(id, inSplit) => {
                        if (inSplit) setSplitNoteId(id);
                        else setActiveNoteId(id);
                      }}
                      onCreateLinkedNote={(title) => handleCreateNote({ title })}
                      onAddTagMeta={handleAddTagMeta}
                      onExportNote={handleExportNote}
                      onOpenInSplit={(id) => {
                        const alternative =
                          activeNotes.find((n) => n.id !== id) || activeNote;
                        setSplitNoteId(alternative.id);
                      }}
                      noteWorkedSeconds={getWorkedSecondsForNote(activeNote.id)}
                      isTrackingThisNote={
                        (timerRunning || timerPaused || timerIdlePaused) &&
                        timerNoteId === activeNote.id
                      }
                      onToggleTrackNote={() => {
                        if (
                          (timerRunning || timerPaused || timerIdlePaused) &&
                          timerNoteId === activeNote.id
                        ) {
                          handleStopAndSaveTimer();
                        } else {
                          handleStartTimer({
                            taskTitle: activeNote.title,
                            noteId: activeNote.id,
                            projectId: activeNote.projectId,
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Optional Side-by-Side Split Pane */}
                  {splitNote && (
                    <div className="flex-1 h-full overflow-hidden bg-slate-950/30">
                      <NoteEditorPane
                        note={splitNote}
                        allNotes={activeNotes}
                        projects={activeProjects}
                        folders={workspace.folders}
                        tags={workspace.tags}
                        isSecondaryPane
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                        onSelectNote={(id) => setSplitNoteId(id)}
                        onCreateLinkedNote={(title) => handleCreateNote({ title })}
                        onAddTagMeta={handleAddTagMeta}
                        onExportNote={handleExportNote}
                        onCloseSplit={() => setSplitNoteId(null)}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div className="max-w-sm space-y-3">
                    <h3 className="text-lg font-bold text-white">No Active Notes</h3>
                    <p className="text-xs text-slate-400">
                      Create a new note or restore deleted projects/notes from the Trash Bin.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCreateNote()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      + Create New Note
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Quick Capture Scratchpad */}
      <ScratchpadWidget
        scratchpad={workspace.scratchpad}
        projects={activeProjects}
        onChangeScratchpad={(val) =>
          setWorkspace((prev) => ({ ...prev, scratchpad: val }))
        }
        onPromoteToNote={(title, content, projectId) => {
          handleCreateNote({
            title,
            content,
            projectId,
            folderId: null,
            tags: [],
            clearScratchpad: true,
          });
        }}
      />

      {/* Instant Command Palette (Cmd + K) */}
      <CommandPaletteModal
        isOpen={isCmdPaletteOpen}
        onClose={() => setIsCmdPaletteOpen(false)}
        notes={activeNotes}
        projects={activeProjects}
        onSelectNote={(id, inSplit) => {
          if (inSplit) setSplitNoteId(id);
          else setActiveNoteId(id);
          setMainView('editor');
        }}
        onCreateNote={() => handleCreateNote()}
        onSwitchView={(v) => setMainView(v)}
        onToggleZen={() => setZenMode((v) => !v)}
        onSwitchTheme={(theme) => setWorkspace((prev) => ({ ...prev, theme }))}
        onChooseVaultFolder={handleChooseVaultFolder}
      />
    </div>
  );
}
export default App;
