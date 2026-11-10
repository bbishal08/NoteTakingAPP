import { WorkspaceData } from './types';

export const DEFAULT_WORKSPACE: WorkspaceData = {
  theme: 'dark',
  scratchpad: `Quick thoughts & fleeting ideas:\n- Try pressing Cmd+K to open the instant Command Palette\n- Type / inside any note to insert blocks, drawings, or voice notes\n- Use [[Note Title]] to connect notes in the Knowledge Graph`,
  projects: [
    {
      id: 'proj-product',
      name: 'Product & Engineering',
      color: '#6366f1',
      icon: 'Rocket',
      description: 'Architecture, specs, and sprint notes',
    },
    {
      id: 'proj-research',
      name: 'Knowledge Vault',
      color: '#10b981',
      icon: 'Brain',
      description: 'Evergreen notes, ideas, and literature links',
    },
    {
      id: 'proj-personal',
      name: 'Personal & Journal',
      color: '#f59e0b',
      icon: 'Sparkles',
      description: 'Daily logs, goals, and life planning',
    },
  ],
  folders: [
    {
      id: 'fold-architecture',
      name: 'Architecture & Specs',
      projectId: 'proj-product',
      parentId: null,
    },
    {
      id: 'fold-frontend',
      name: 'Frontend Systems',
      projectId: 'proj-product',
      parentId: 'fold-architecture',
    },
    {
      id: 'fold-meetings',
      name: 'Sprint & Meetings',
      projectId: 'proj-product',
      parentId: null,
    },
    {
      id: 'fold-concepts',
      name: 'Core Mental Models',
      projectId: 'proj-research',
      parentId: null,
    },
    {
      id: 'fold-daily',
      name: 'Daily Journals',
      projectId: 'proj-personal',
      parentId: null,
    },
  ],
  tags: [
    { name: 'architecture', color: '#6366f1' },
    { name: 'ux-design', color: '#ec4899' },
    { name: 'roadmap', color: '#10b981' },
    { name: 'urgent', color: '#ef4444' },
    { name: 'evergreen', color: '#14b8a6' },
    { name: 'journal', color: '#f59e0b' },
  ],
  notes: [
    {
      id: 'note-welcome',
      title: 'Welcome to NoteFlow Studio',
      projectId: 'proj-product',
      folderId: 'fold-architecture',
      tags: ['architecture', 'ux-design', 'roadmap'],
      status: 'in-progress',
      format: 'txt',
      pinned: true,
      style: 'document',
      font: 'sans',
      icon: 'Compass',
      coverGradient: 'from-indigo-600/30 via-purple-600/20 to-transparent',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      content: `Welcome to NoteFlow Studio — Plain Text (.txt) & Markdown Workspace!

You can write naturally in pure Plain Text just like Notepad++ (with line numbers, Tab indentation, Word Wrap, and Find & Replace), or switch any note to Markdown (.md) with 1 click in the toolbar above.

Key Workflows in Your Vault:
1. Tri-Layer Organization: Assign any note to a Project, place it in a Nested Folder, and attach multiple #tags (like #architecture or #ux-design).
2. Connected Knowledge: Check out [[Design System & UI Philosophy]] and [[Q4 Product Roadmap]] to see bi-directional Backlinks and the Knowledge Graph in action.
3. Local Folder Ownership: Click the Local Vault button in the bottom-left sidebar to choose any folder on your Mac where your .txt and .md notes are saved.

Action Items (Synced with Kanban Board):
- [x] Configure local vault directory on Mac
- [x] Design tri-layer Project + Folder + Tag navigation
- [ ] Add a freehand sketch using the Sketch Canvas tool below
- [ ] Record a quick audio thought with the Voice Memo recorder
- [ ] Test Split-Pane view by opening [[Design System & UI Philosophy]] alongside this note
`,
    },
    {
      id: 'note-design',
      title: 'Design System & UI Philosophy',
      projectId: 'proj-product',
      folderId: 'fold-frontend',
      tags: ['ux-design', 'architecture'],
      status: 'review',
      pinned: true,
      style: 'wide',
      font: 'sans',
      icon: 'Palette',
      coverGradient: 'from-pink-600/30 via-rose-500/20 to-transparent',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      content: `# Design System & UI Philosophy

This note links back to [[Welcome to NoteFlow Studio]] and informs our [[Q4 Product Roadmap]].

## Why Flexible Note Styles Matter
Sometimes you want a crisp **Standard Document** in Serif typography for deep essays; other times you want a **Wide Canvas** for architecture tables, freehand sketches, and voice notes.

> [!NOTE] You can switch this note's layout between **Document**, **Wide**, and **Card** mode, or switch fonts (**Sans**, **Serif**, **Mono**) in the top-right note bar.

## UI Checklist
- [x] Support Light, Midnight Dark, and Warm Sepia themes
- [x] Keyboard-first Command Palette (\`Cmd + K\`)
- [ ] Review typography contrast ratios across Sepia theme
- [ ] Finalize icon set for nested folders
`,
    },
    {
      id: 'note-roadmap',
      title: 'Q4 Product Roadmap',
      projectId: 'proj-product',
      folderId: 'fold-meetings',
      tags: ['roadmap', 'urgent'],
      status: 'todo',
      pinned: false,
      style: 'document',
      font: 'sans',
      icon: 'Flag',
      coverGradient: 'from-emerald-600/30 via-teal-600/20 to-transparent',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      content: `# Q4 Product Roadmap

Strategic milestones connecting [[Welcome to NoteFlow Studio]] and [[Zettelkasten & Evergreen Notes]].

| Milestone | Owner | Target | Status |
| :--- | :--- | :--- | :--- |
| Local Vault Sync | Core Team | Week 1 | Completed |
| Inline Canvas & Voice | UX Team | Week 2 | In Progress |
| Knowledge Graph v2 | Research | Week 3 | Planned |

## Next Steps
- [ ] Sync with engineering on [[Design System & UI Philosophy]]
- [ ] Prepare release notes for desktop build
`,
    },
    {
      id: 'note-zettelkasten',
      title: 'Zettelkasten & Evergreen Notes',
      projectId: 'proj-research',
      folderId: 'fold-concepts',
      tags: ['evergreen', 'ux-design'],
      status: 'done',
      pinned: false,
      style: 'document',
      font: 'serif',
      icon: 'BookOpen',
      coverGradient: 'from-amber-500/30 via-orange-500/20 to-transparent',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      content: `# Zettelkasten & Evergreen Notes

An **Evergreen Note** should be atomic, concept-oriented, and densely linked.

By combining structured **Projects & Folders** with fluid **#tags** and **[[Wiki-Links]]**, you never have to choose between top-down hierarchy and bottom-up emergence.

### Related Notes
- [[Welcome to NoteFlow Studio]]
- [[Daily Reflection & Focus Log]]
`,
    },
    {
      id: 'note-journal',
      title: 'Daily Reflection & Focus Log',
      projectId: 'proj-personal',
      folderId: 'fold-daily',
      tags: ['journal', 'evergreen'],
      status: 'in-progress',
      pinned: false,
      style: 'document',
      font: 'serif',
      icon: 'Sun',
      coverGradient: 'from-yellow-500/30 via-amber-500/15 to-transparent',
      drawings: [],
      voiceNotes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      content: `# Daily Reflection & Focus Log

Today's focus is testing the new workflow in [[Welcome to NoteFlow Studio]] and refining ideas from [[Zettelkasten & Evergreen Notes]].

## Top 3 Priorities Today
- [x] Morning review in Zen Mode (\`Cmd + \\\`)
- [ ] Sketch out the system workflow diagram
- [ ] Capture voice memo summary for tomorrow
`,
    },
  ],
};

export const NOTE_TEMPLATES = [
  {
    id: 'tpl-meeting',
    name: 'Meeting Notes',
    icon: 'Users',
    tags: ['roadmap'],
    style: 'document' as const,
    content: `# Meeting Notes — {{date}}

**Attendees:** @team
**Goal:** Align on key deliverables and next actions.

## Discussion Points
- Point 1: 
- Point 2: 

## Decisions Made
> [!IMPORTANT] Document key decisions here so the team stays aligned.

## Action Items
- [ ] Follow up on deliverable timeline
- [ ] Share summary link in [[Welcome to NoteFlow Studio]]
`,
  },
  {
    id: 'tpl-spec',
    name: 'Project Brief / Spec',
    icon: 'FileCode',
    tags: ['architecture', 'roadmap'],
    style: 'wide' as const,
    content: `# Technical Specification — {{date}}

## 1. Overview & Problem Statement
Describe what we are building and why it matters to the user experience.

## 2. Proposed Architecture
| Component | Responsibility | Priority |
| :--- | :--- | :--- |
| Local Vault | Store Markdown files on disk | High |
| Graph Engine | Render bi-directional links | Medium |

## 3. Implementation Checklist
- [ ] Define data model and state
- [ ] Build interactive UI components
- [ ] Verify edge cases and keyboard shortcuts
`,
  },
  {
    id: 'tpl-daily',
    name: 'Daily Journal & Planner',
    icon: 'Calendar',
    tags: ['journal'],
    style: 'document' as const,
    content: `# Daily Log — {{date}}

## Morning Intention
What is the single most impactful thing to finish today?

## Tasks for Today
- [ ] Deep work block (90 mins)
- [ ] Review inbox & scratchpad notes
- [ ] Evening wind-down reflection

## Fleeting Notes & Links
- Connected to [[Daily Reflection & Focus Log]]
`,
  },
];
