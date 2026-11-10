export type NoteStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export type NoteFormat = 'txt' | 'md';

export type NoteStyle = 'document' | 'wide' | 'cards';

export type FontFamily = 'sans' | 'serif' | 'mono';

export type ThemeMode = 'dark' | 'light' | 'sepia';

export type MainViewMode = 'editor' | 'graph' | 'kanban' | 'timeline' | 'trash';

export interface WorkSessionLog {
  id: string;
  taskTitle: string;
  noteId: string | null;
  projectId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  idleExcludedSec: number;
  autoPausedByIdle?: boolean;
}

export interface DrawingBlockData {
  id: string;
  title: string;
  dataUrl: string; // PNG base64 of the canvas
  createdAt: string;
}

export interface VoiceBlockData {
  id: string;
  title: string;
  audioDataUrl: string; // base64 audio/webm or wav
  durationSec: number;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Rich markdown & [[Wiki-Links]] & - [ ] task items
  projectId: string;
  folderId: string | null;
  tags: string[];
  status: NoteStatus;
  format?: NoteFormat;
  pinned: boolean;
  trashed?: boolean;
  style: NoteStyle;
  font: FontFamily;
  coverGradient?: string;
  icon?: string;
  drawings: DrawingBlockData[];
  voiceNotes: VoiceBlockData[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  color: string; // hex or tailwind token
  icon: string;
  description?: string;
  trashed?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  projectId: string;
  parentId: string | null; // Supports nested folders
  icon?: string;
  trashed?: boolean;
}

export interface TagMeta {
  name: string;
  color: string;
}

export interface WorkspaceData {
  projects: ProjectItem[];
  folders: FolderItem[];
  notes: NoteItem[];
  tags: TagMeta[];
  scratchpad: string;
  theme: ThemeMode;
  workSessions?: WorkSessionLog[];
  idleTimeoutSec?: number;
}

export interface ExtractedTask {
  noteId: string;
  noteTitle: string;
  projectId: string;
  lineIndex: number;
  text: string;
  completed: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getVaultInfo: () => Promise<{
        vaultPath: string;
        workspace: WorkspaceData | null;
        isElectron: boolean;
      }>;
      chooseVaultFolder: () => Promise<{
        canceled: boolean;
        vaultPath?: string;
        existingWorkspace?: WorkspaceData | null;
      }>;
      saveWorkspace: (data: WorkspaceData) => Promise<{ ok: boolean; vaultPath?: string; error?: string }>;
      revealInFinder: () => Promise<{ ok: boolean }>;
      exportFile: (payload: {
        defaultName: string;
        content: string;
        ext: 'txt' | 'md' | 'html';
      }) => Promise<{ canceled: boolean; filePath?: string }>;
      getSystemIdleTime?: () => Promise<number>;
    };
  }
}
