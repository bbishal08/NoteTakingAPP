import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heading1,
  Heading2,
  CheckSquare,
  Code,
  Table,
  Link2,
  Brush,
  Mic,
  Eye,
  Edit3,
  Columns,
  Pin,
  Download,
  Folder,
  Plus,
  X,
  ArrowUpRight,
  Sparkles,
  Trash2,
  Type,
  Layout,
  CheckCircle2,
  Circle,
  AlertCircle,
  Lightbulb,
  Search,
  Replace,
  WrapText,
  Hash,
  FileText,
  Clock,
  Play,
  Square,
} from 'lucide-react';
import {
  DrawingBlockData,
  FolderItem,
  FontFamily,
  NoteFormat,
  NoteItem,
  NoteStatus,
  NoteStyle,
  ProjectItem,
  TagMeta,
  VoiceBlockData,
} from '../types';
import { DrawingCanvasBlock } from './DrawingCanvasBlock';
import { VoiceRecorderBlock } from './VoiceRecorderBlock';

interface NoteEditorPaneProps {
  note: NoteItem;
  allNotes: NoteItem[];
  projects: ProjectItem[];
  folders: FolderItem[];
  tags: TagMeta[];
  isSecondaryPane?: boolean;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
  onUpdateNote: (updated: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onSelectNote: (noteId: string, openInSplit?: boolean) => void;
  onCreateLinkedNote: (title: string) => void;
  onAddTagMeta: (name: string) => void;
  onExportNote: (note: NoteItem, format: 'txt' | 'md' | 'html' | 'pdf') => void;
  onOpenInSplit?: (noteId: string) => void;
  onCloseSplit?: () => void;
  noteWorkedSeconds?: number;
  isTrackingThisNote?: boolean;
  onToggleTrackNote?: () => void;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

const STATUS_OPTIONS: { value: NoteStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

export const NoteEditorPane: React.FC<NoteEditorPaneProps> = ({
  note,
  allNotes,
  projects,
  folders,
  tags,
  isSecondaryPane = false,
  onUpdateNote,
  onDeleteNote,
  onSelectNote,
  onCreateLinkedNote,
  onAddTagMeta,
  onExportNote,
  onOpenInSplit,
  onCloseSplit,
  noteWorkedSeconds = 0,
  isTrackingThisNote = false,
  onToggleTrackNote,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const dismissedSlashIndexRef = useRef<number | null>(null);
  const dismissedWikiIndexRef = useRef<number | null>(null);

  const [isReaderMode, setIsReaderMode] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [showWikiMenu, setShowWikiMenu] = useState(false);
  const [wikiFilter, setWikiFilter] = useState('');
  const [wikiSelectedIndex, setWikiSelectedIndex] = useState(0);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [newQuickTaskText, setNewQuickTaskText] = useState('');

  // Notepad++ Style Editor State
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [cursorLineCol, setCursorLineCol] = useState<{ line: number; col: number }>({
    line: 1,
    col: 1,
  });

  // Notepad++ Find & Replace Bar State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [lastMatchIndex, setLastMatchIndex] = useState(-1);

  const currentFormat: NoteFormat = note.format || 'txt';

  // Listen for Cmd+F / Ctrl+F to toggle Notepad++ Find & Replace bar, and Escape to dismiss open menus
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
        setIsReaderMode(false);
        setTimeout(() => findInputRef.current?.focus(), 20);
      } else if (e.key === 'Escape') {
        if (showSlashMenu) {
          e.preventDefault();
          const ta = textareaRef.current;
          if (ta) {
            const textBefore = note.content.slice(0, ta.selectionStart);
            dismissedSlashIndexRef.current = textBefore.lastIndexOf('/');
          }
          setShowSlashMenu(false);
        } else if (showWikiMenu) {
          e.preventDefault();
          const ta = textareaRef.current;
          if (ta) {
            const textBefore = note.content.slice(0, ta.selectionStart);
            dismissedWikiIndexRef.current = textBefore.lastIndexOf('[[');
          }
          setShowWikiMenu(false);
        } else if (showFindReplace) {
          e.preventDefault();
          setShowFindReplace(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSlashMenu, showWikiMenu, showFindReplace, note.content]);

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.trashed),
    [projects]
  );

  const projectFolders = useMemo(
    () => folders.filter((f) => f.projectId === note.projectId && !f.trashed),
    [folders, note.projectId]
  );

  // Extract interactive tasks from the note
  const noteTasks = useMemo(() => {
    const lines = note.content.split('\n');
    const items: { lineIndex: number; text: string; completed: boolean }[] = [];
    lines.forEach((line, idx) => {
      const match = line.match(/^- \[([ xX])\]\s*(.+)$/);
      if (match) {
        items.push({
          lineIndex: idx,
          text: match[2].trim(),
          completed: match[1].toLowerCase() === 'x',
        });
      }
    });
    return items;
  }, [note.content]);

  // Line count, word count, character count & reading time
  const stats = useMemo(() => {
    const raw = note.content || '';
    const linesCount = raw.split('\n').length;
    const text = raw.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = raw.length;
    const tasksTotal = noteTasks.length;
    const tasksDone = noteTasks.filter((t) => t.completed).length;
    const readMin = Math.max(1, Math.ceil(words / 200));
    return { linesCount, words, chars, tasksTotal, tasksDone, readMin };
  }, [note.content, noteTasks]);

  // Count matches for Find & Replace
  const findMatchesCount = useMemo(() => {
    if (!findText) return 0;
    const flags = matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = note.content.match(new RegExp(escaped, flags));
    return matches ? matches.length : 0;
  }, [note.content, findText, matchCase]);

  // Bi-directional Backlinks
  const backlinks = useMemo(() => {
    const target = `[[${note.title.toLowerCase()}]]`;
    return allNotes.filter(
      (n) =>
        n.id !== note.id &&
        !n.trashed &&
        n.content.toLowerCase().includes(target)
    );
  }, [allNotes, note.id, note.title]);

  // Outgoing [[Wiki-Links]]
  const outgoingLinks = useMemo(() => {
    const matches = Array.from(note.content.matchAll(/\[\[([^\][\n]+)\]\]/g));
    const titles = Array.from(new Set(matches.map((m) => m[1].trim())));
    return titles.map((t) => {
      const found = allNotes.find(
        (n) => !n.trashed && n.title.toLowerCase() === t.toLowerCase()
      );
      return { title: t, targetNote: found || null };
    });
  }, [note.content, allNotes]);

  const updateCursorLineCol = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart || 0;
    const upToCursor = note.content.slice(0, pos);
    const linesBefore = upToCursor.split('\n');
    const line = linesBefore.length;
    const col = linesBefore[linesBefore.length - 1].length + 1;
    setCursorLineCol({ line, col });
  };

  // Synchronously restore cursor selection after React updates note.content
  useEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
      pendingSelectionRef.current = null;
      updateCursorLineCol();
    }
  }, [note.content]);

  const applyContentWithCursor = (nextVal: string, selStart: number, selEnd: number) => {
    pendingSelectionRef.current = { start: selStart, end: selEnd };
    if (textareaRef.current) {
      textareaRef.current.value = nextVal;
      textareaRef.current.setSelectionRange(selStart, selEnd);
    }
    onUpdateNote({
      ...note,
      content: nextVal,
      updatedAt: new Date().toISOString(),
    });
  };

  // Notepad++ Find Next / Replace / Replace All Handlers
  const handleFindNext = () => {
    if (!findText) return;
    const haystack = matchCase ? note.content : note.content.toLowerCase();
    const needle = matchCase ? findText : findText.toLowerCase();
    let idx = haystack.indexOf(needle, lastMatchIndex + 1);
    if (idx === -1) {
      idx = haystack.indexOf(needle, 0);
    }
    if (idx !== -1) {
      setLastMatchIndex(idx);
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(idx, idx + findText.length);
        updateCursorLineCol();
      }
    }
  };

  const handleReplaceSingle = () => {
    if (!findText) return;
    const flags = matchCase ? '' : 'i';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextContent = note.content.replace(new RegExp(escaped, flags), replaceText);
    if (nextContent !== note.content) {
      onUpdateNote({
        ...note,
        content: nextContent,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const flags = matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nextContent = note.content.replace(new RegExp(escaped, flags), replaceText);
    if (nextContent !== note.content) {
      onUpdateNote({
        ...note,
        content: nextContent,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const insertSnippet = (snippet: string, replaceTrigger?: '/' | '[[') => {
    const ta = textareaRef.current;
    if (!ta) {
      onUpdateNote({
        ...note,
        content: note.content + '\n' + snippet,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let before = note.content.slice(0, start);
    const after = note.content.slice(end);

    if (replaceTrigger === '/') {
      const slashIdx = before.lastIndexOf('/');
      if (slashIdx !== -1) {
        before = before.slice(0, slashIdx);
      }
    } else if (replaceTrigger === '[[') {
      const wikiIdx = before.lastIndexOf('[[');
      if (wikiIdx !== -1) {
        before = before.slice(0, wikiIdx);
      }
    }

    const updatedContent = `${before}${snippet}${after}`;
    const pos = before.length + snippet.length;
    setShowSlashMenu(false);
    setShowWikiMenu(false);
    applyContentWithCursor(updatedContent, pos, pos);
  };

  const stripCurrentSlashTrigger = (): string => {
    const ta = textareaRef.current;
    if (!ta) return note.content;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let before = note.content.slice(0, start);
    const after = note.content.slice(end);
    const slashIdx = before.lastIndexOf('/');
    if (slashIdx !== -1) {
      before = before.slice(0, slashIdx);
    }
    return `${before}${after}`;
  };

  const addDrawingBlock = (fromSlash = false) => {
    const cleanedContent = fromSlash ? stripCurrentSlashTrigger() : note.content;
    const newDrawing: DrawingBlockData = {
      id: `draw-${Date.now()}`,
      title: `Sketch ${(note.drawings?.length || 0) + 1}`,
      dataUrl: '',
      createdAt: new Date().toISOString(),
    };
    onUpdateNote({
      ...note,
      content: cleanedContent,
      drawings: [...(note.drawings || []), newDrawing],
      updatedAt: new Date().toISOString(),
    });
    setShowSlashMenu(false);
  };

  const addVoiceBlock = (fromSlash = false) => {
    const cleanedContent = fromSlash ? stripCurrentSlashTrigger() : note.content;
    const newVoice: VoiceBlockData = {
      id: `voice-${Date.now()}`,
      title: `Voice Memo ${(note.voiceNotes?.length || 0) + 1}`,
      audioDataUrl: '',
      durationSec: 0,
      createdAt: new Date().toISOString(),
    };
    onUpdateNote({
      ...note,
      content: cleanedContent,
      voiceNotes: [...(note.voiceNotes || []), newVoice],
      updatedAt: new Date().toISOString(),
    });
    setShowSlashMenu(false);
  };

  const slashCommands: SlashCommandItem[] = [
    {
      id: 'todo',
      label: 'To-Do Checklist',
      description: 'Interactive task item synced with Kanban board',
      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
      action: () => insertSnippet('- [ ] ', '/'),
    },
    {
      id: 'h1',
      label: 'Heading 1',
      description: 'Large section heading',
      icon: <Heading1 className="w-4 h-4 text-indigo-400" />,
      action: () => insertSnippet('# ', '/'),
    },
    {
      id: 'h2',
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="w-4 h-4 text-indigo-400" />,
      action: () => insertSnippet('## ', '/'),
    },
    {
      id: 'callout',
      label: 'Callout / Highlight Box',
      description: 'Emphasize key notes or warnings',
      icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
      action: () => insertSnippet('> [!TIP] Key insight or reminder here\n', '/'),
    },
    {
      id: 'table',
      label: 'Markdown Table',
      description: 'Insert a structured 3-column table',
      icon: <Table className="w-4 h-4 text-sky-400" />,
      action: () =>
        insertSnippet(
          '\n| Column 1 | Column 2 | Status |\n| :--- | :--- | :--- |\n| Item A | Details | Active |\n',
          '/'
        ),
    },
    {
      id: 'code',
      label: 'Code Block',
      description: 'Syntax-highlighted code snippet',
      icon: <Code className="w-4 h-4 text-pink-400" />,
      action: () => insertSnippet('\n```typescript\n// Write code here\n```\n', '/'),
    },
    {
      id: 'wikilink',
      label: 'Link to Note [[Wiki-Link]]',
      description: 'Create bi-directional connection in Knowledge Graph',
      icon: <Link2 className="w-4 h-4 text-purple-400" />,
      action: () => {
        insertSnippet('[[', '/');
        setShowSlashMenu(false);
        setShowWikiMenu(true);
        setWikiFilter('');
        setWikiSelectedIndex(0);
      },
    },
    {
      id: 'draw',
      label: 'Sketch / Drawing Canvas',
      description: 'Embed interactive freehand drawing canvas inside note',
      icon: <Brush className="w-4 h-4 text-rose-400" />,
      action: () => addDrawingBlock(true),
    },
    {
      id: 'voice',
      label: 'Voice Memo Recorder',
      description: 'Record audio directly into this note',
      icon: <Mic className="w-4 h-4 text-red-400" />,
      action: () => addVoiceBlock(true),
    },
  ];

  const filteredSlashCommands = slashCommands.filter(
    (c) =>
      c.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
      c.id.toLowerCase().includes(slashFilter.toLowerCase())
  );

  const filteredWikiNotes = useMemo(
    () =>
      allNotes.filter(
        (n) =>
          !n.trashed &&
          n.id !== note.id &&
          n.title.toLowerCase().includes(wikiFilter.toLowerCase())
      ),
    [allNotes, note.id, wikiFilter]
  );

  // Keyboard Handler: Slash (/) Menu Navigation & Esc, Smart Checklist Continuation/Double-Enter Exit, and Tab Indentation
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const val = note.content;

    // 1. When Slash (/) Command Menu is open: support Escape, Arrow Keys, and Enter/Tab
    if (showSlashMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismissedSlashIndexRef.current = val.slice(0, start).lastIndexOf('/');
        setShowSlashMenu(false);
        return;
      }
      if (filteredSlashCommands.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setSlashSelectedIndex(
            (prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const chosen =
            filteredSlashCommands[slashSelectedIndex] || filteredSlashCommands[0];
          if (chosen) chosen.action();
          return;
        }
      }
    }

    // 2. When [[Wiki-Link]] Menu is open: support Escape, Arrow Keys, and Enter/Tab
    if (showWikiMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        dismissedWikiIndexRef.current = val.slice(0, start).lastIndexOf('[[');
        setShowWikiMenu(false);
        return;
      }
      if (filteredWikiNotes.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setWikiSelectedIndex((prev) => (prev + 1) % filteredWikiNotes.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setWikiSelectedIndex(
            (prev) => (prev - 1 + filteredWikiNotes.length) % filteredWikiNotes.length
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          const chosenNote =
            filteredWikiNotes[wikiSelectedIndex] || filteredWikiNotes[0];
          if (chosenNote) insertSnippet(`[[${chosenNote.title}]]`, '[[');
          return;
        }
      }
    }

    // 3. Smart Checklist & List Continuation on Enter (1st Enter continues; 2nd Enter on empty item exits!)
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      start === end
    ) {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const lineEndIdx = val.indexOf('\n', start);
      const lineEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
      const currentLineBeforeCursor = val.slice(lineStart, start);
      const currentLineAfterCursor = val.slice(start, lineEnd);

      // 3a. Checklist item: "- [ ] " or "- [x] "
      const checklistMatch = currentLineBeforeCursor.match(/^(\s*)-\s\[[ xX]\]\s?(.*)$/);
      if (checklistMatch) {
        e.preventDefault();
        const indent = checklistMatch[1] || '';
        const itemText = (checklistMatch[2] || '') + currentLineAfterCursor;

        if (itemText.trim() === '') {
          // 2nd Enter on an empty checklist item -> Exit checklist mode by clearing "- [ ] " from current line
          const nextVal = val.slice(0, lineStart) + indent + val.slice(lineEnd);
          const newCursor = lineStart + indent.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        } else {
          // 1st Enter on a checklist item with text -> Continue with a new "- [ ] " on the next line
          const nextPrefix = `\n${indent}- [ ] `;
          const nextVal = val.slice(0, start) + nextPrefix + val.slice(end);
          const newCursor = start + nextPrefix.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        }
        return;
      }

      // 3b. Bullet list item: "- " or "* "
      const bulletMatch = currentLineBeforeCursor.match(/^(\s*)([-*])\s+(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1] || '';
        const bulletChar = bulletMatch[2];
        const itemText = (bulletMatch[3] || '') + currentLineAfterCursor;

        if (itemText.trim() === '') {
          // 2nd Enter on an empty bullet item -> Exit bullet list mode
          const nextVal = val.slice(0, lineStart) + indent + val.slice(lineEnd);
          const newCursor = lineStart + indent.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        } else {
          // 1st Enter on a bullet item with text -> Continue bullet list on next line
          const nextPrefix = `\n${indent}${bulletChar} `;
          const nextVal = val.slice(0, start) + nextPrefix + val.slice(end);
          const newCursor = start + nextPrefix.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        }
        return;
      }

      // 3c. Numbered list item: "1. ", "2. ", etc.
      const numberedMatch = currentLineBeforeCursor.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        e.preventDefault();
        const indent = numberedMatch[1] || '';
        const currentNum = parseInt(numberedMatch[2], 10);
        const itemText = (numberedMatch[3] || '') + currentLineAfterCursor;

        if (itemText.trim() === '') {
          // 2nd Enter on an empty numbered item -> Exit numbered list mode
          const nextVal = val.slice(0, lineStart) + indent + val.slice(lineEnd);
          const newCursor = lineStart + indent.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        } else {
          // 1st Enter on a numbered item with text -> Continue with next number on next line
          const nextPrefix = `\n${indent}${currentNum + 1}. `;
          const nextVal = val.slice(0, start) + nextPrefix + val.slice(end);
          const newCursor = start + nextPrefix.length;
          applyContentWithCursor(nextVal, newCursor, newCursor);
        }
        return;
      }
    }

    // 4. Notepad++ Real Tab & Shift+Tab Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        if (start === end) {
          const nextVal = val.slice(0, start) + '    ' + val.slice(end);
          applyContentWithCursor(nextVal, start + 4, start + 4);
        } else {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const selectedBlock = val.slice(lineStart, end);
          const indented = selectedBlock
            .split('\n')
            .map((l) => '    ' + l)
            .join('\n');
          const nextVal = val.slice(0, lineStart) + indented + val.slice(end);
          applyContentWithCursor(nextVal, lineStart, lineStart + indented.length);
        }
      } else {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const lineEndIdx = val.indexOf('\n', end);
        const blockEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
        const selectedBlock = val.slice(lineStart, blockEnd);
        const unindented = selectedBlock
          .split('\n')
          .map((l) => l.replace(/^ {1,4}|\t/, ''))
          .join('\n');
        const nextVal = val.slice(0, lineStart) + unindented + val.slice(blockEnd);
        applyContentWithCursor(nextVal, lineStart, lineStart + unindented.length);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);

    // Update Ln / Col status
    const linesBefore = textBefore.split('\n');
    setCursorLineCol({
      line: linesBefore.length,
      col: linesBefore[linesBefore.length - 1].length + 1,
    });

    const slashMatch = textBefore.match(/(?:^|\n|\s)\/([a-zA-Z0-9]*)$/);
    const currentSlashIdx = textBefore.lastIndexOf('/');
    if (slashMatch && currentSlashIdx !== dismissedSlashIndexRef.current) {
      setShowSlashMenu(true);
      const nextFilter = slashMatch[1] || '';
      if (nextFilter !== slashFilter) {
        setSlashSelectedIndex(0);
      }
      setSlashFilter(nextFilter);
    } else {
      if (!slashMatch) {
        dismissedSlashIndexRef.current = null;
      }
      setShowSlashMenu(false);
    }

    const wikiMatch = textBefore.match(/\[\[([^\][\n]*)$/);
    const currentWikiIdx = textBefore.lastIndexOf('[[');
    if (wikiMatch && currentWikiIdx !== dismissedWikiIndexRef.current) {
      setShowWikiMenu(true);
      const nextWikiFilter = wikiMatch[1] || '';
      if (nextWikiFilter !== wikiFilter) {
        setWikiSelectedIndex(0);
      }
      setWikiFilter(nextWikiFilter);
    } else {
      if (!wikiMatch) {
        dismissedWikiIndexRef.current = null;
      }
      setShowWikiMenu(false);
    }

    const inlineTagMatch = textBefore.match(/(?:^|\s)#([a-zA-Z0-9_-]{2,24})\s$/);
    let updatedTags = note.tags;
    if (inlineTagMatch) {
      const detectedTag = inlineTagMatch[1].toLowerCase();
      if (!note.tags.includes(detectedTag)) {
        updatedTags = [...note.tags, detectedTag];
        onAddTagMeta(detectedTag);
      }
    }

    onUpdateNote({
      ...note,
      content: val,
      tags: updatedTags,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleTaskLine = (lineIdx: number) => {
    const lines = note.content.split('\n');
    const line = lines[lineIdx];
    if (!line) return;
    if (/^- \[ \]/.test(line)) {
      lines[lineIdx] = line.replace(/^- \[ \]/, '- [x]');
    } else if (/^- \[[xX]\]/.test(line)) {
      lines[lineIdx] = line.replace(/^- \[[xX]\]/, '- [ ]');
    }
    onUpdateNote({
      ...note,
      content: lines.join('\n'),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickTaskText.trim()) return;
    const appended = `${note.content.trimEnd()}\n- [ ] ${newQuickTaskText.trim()}\n`;
    onUpdateNote({
      ...note,
      content: appended,
      updatedAt: new Date().toISOString(),
    });
    setNewQuickTaskText('');
  };

  const handleAddTag = (tagName: string) => {
    const cleaned = tagName.replace(/^#/, '').trim().toLowerCase();
    if (!cleaned) return;
    if (!note.tags.includes(cleaned)) {
      onUpdateNote({
        ...note,
        tags: [...note.tags, cleaned],
        updatedAt: new Date().toISOString(),
      });
      onAddTagMeta(cleaned);
    }
    setNewTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({
      ...note,
      tags: note.tags.filter((t) => t !== tagToRemove),
      updatedAt: new Date().toISOString(),
    });
  };

  const renderFormattedInline = (text: string) => {
    const parts = text.split(/(\[\[[^\][\n]+\]\]|`[^`\n]+`|\*\*[^*\n]+\*\*|#[a-zA-Z0-9_-]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const linkTitle = part.slice(2, -2).trim();
        const existing = allNotes.find(
          (n) => !n.trashed && n.title.toLowerCase() === linkTitle.toLowerCase()
        );
        return (
          <button
            key={idx}
            type="button"
            onClick={() => {
              if (existing) {
                onSelectNote(existing.id);
              } else {
                onCreateLinkedNote(linkTitle);
              }
            }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md text-xs font-medium transition ${
              existing
                ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/35 border border-indigo-500/30'
                : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-dashed border-amber-500/40'
            }`}
            title={
              existing
                ? `Open linked note: ${existing.title}`
                : `Click to create note: "${linkTitle}"`
            }
          >
            <Link2 className="w-3 h-3" />
            {linkTitle}
          </button>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-pink-300 font-mono text-[0.88em]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^#[a-zA-Z0-9_-]+$/.test(part)) {
        return (
          <span
            key={idx}
            className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-medium"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const renderRichPreview = () => {
    const lines = note.content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3) || 'code';
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        elements.push(
          <div
            key={`code-${i}`}
            className="my-4 rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden"
          >
            <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase">
              {lang}
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        i++;
        continue;
      }

      if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
        const headers = line
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        i += 2;
        const rows: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          rows.push(
            lines[i]
              .split('|')
              .map((c) => c.trim())
              .filter(Boolean)
          );
          i++;
        }
        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase">
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-2.5 border-b border-slate-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {rows.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-800/40">
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5 text-slate-300">
                        {renderFormattedInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (line.startsWith('>')) {
        const raw = line.replace(/^>\s*/, '');
        const isTip = raw.startsWith('[!TIP]');
        const isImportant = raw.startsWith('[!IMPORTANT]');
        const cleanText = raw.replace(/^\[!(TIP|NOTE|IMPORTANT|WARNING)\]\s*/, '');
        elements.push(
          <div
            key={`callout-${i}`}
            className={`my-3 p-4 rounded-xl border flex items-start gap-3 text-sm ${
              isTip
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                : isImportant
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-slate-800/60 border-slate-700 text-slate-300'
            }`}
          >
            {isTip ? (
              <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-relaxed">{renderFormattedInline(cleanText)}</div>
          </div>
        );
        i++;
        continue;
      }

      const taskMatch = line.match(/^- \[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const checked = taskMatch[1].toLowerCase() === 'x';
        const lineIndex = i;
        elements.push(
          <div
            key={`task-${i}`}
            onClick={() => toggleTaskLine(lineIndex)}
            className="flex items-start gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-800/50 cursor-pointer group transition"
          >
            <button type="button" className="mt-0.5 text-indigo-400">
              {checked ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
              )}
            </button>
            <span
              className={`text-sm leading-relaxed ${
                checked ? 'line-through text-slate-500' : 'text-slate-200'
              }`}
            >
              {renderFormattedInline(taskMatch[2])}
            </span>
          </div>
        );
        i++;
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold text-white mt-5 mb-2 tracking-tight">
            {renderFormattedInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={`h2-${i}`}
            className="text-lg font-semibold text-slate-100 mt-5 mb-2 border-b border-slate-800/80 pb-1.5"
          >
            {renderFormattedInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-semibold text-slate-200 mt-4 mb-1">
            {renderFormattedInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }

      if (line.startsWith('- ')) {
        elements.push(
          <div key={`ul-${i}`} className="flex items-start gap-2.5 py-1 pl-2 text-sm text-slate-300">
            <span className="text-indigo-400 mt-1">•</span>
            <span className="leading-relaxed">{renderFormattedInline(line.slice(2))}</span>
          </div>
        );
        i++;
        continue;
      }

      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div key={`ol-${i}`} className="flex items-start gap-2.5 py-1 pl-2 text-sm text-slate-300">
            <span className="text-indigo-400 font-mono text-xs mt-1">{numMatch[1]}.</span>
            <span className="leading-relaxed">{renderFormattedInline(numMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      if (line.trim() === '') {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-[15px] text-slate-300 leading-relaxed my-2">
            {renderFormattedInline(line)}
          </p>
        );
      }
      i++;
    }

    return elements;
  };

  const fontClass =
    note.font === 'serif'
      ? 'font-serif'
      : note.font === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const containerWidthClass =
    note.style === 'wide'
      ? 'max-w-5xl'
      : note.style === 'cards'
      ? 'max-w-3xl bg-[#111827]/90 p-8 rounded-3xl border border-slate-800/90 shadow-2xl my-2'
      : 'max-w-[780px]';

  const lineCountArray = useMemo(
    () => Array.from({ length: Math.max(1, stats.linesCount) }, (_, i) => i + 1),
    [stats.linesCount]
  );

  return (
    <div className={`flex flex-col h-full overflow-hidden ${fontClass}`}>
      {/* Scrollable Calm Zen Canvas */}
      <div className="flex-1 overflow-y-auto px-8 pt-6 pb-20">
        <div className={`mx-auto w-full transition-all ${containerWidthClass}`}>
          {/* Top Minimalist Pill Bar */}
          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 mb-5">
            {/* Left Pill: 🚀 Project › 📁 Folder • Status • #tags */}
            <div className="inline-flex flex-wrap items-center gap-2 bg-[#131c31] border border-slate-800/90 px-3.5 py-1.5 rounded-full text-xs text-slate-300 shadow-sm">
              {/* Project Selector */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      projects.find((p) => p.id === note.projectId)?.color || '#6366f1',
                  }}
                />
                <select
                  value={note.projectId}
                  onChange={(e) => {
                    const newProjId = e.target.value;
                    const firstFolder = folders.find(
                      (f) => f.projectId === newProjId && !f.trashed
                    );
                    onUpdateNote({
                      ...note,
                      projectId: newProjId,
                      folderId: firstFolder ? firstFolder.id : null,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                  title="Assign Note to Project"
                >
                  {!activeProjects.some((p) => p.id === note.projectId) && (
                    <option value={note.projectId} className="bg-slate-900 text-slate-100">
                      General Notes
                    </option>
                  )}
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-600">›</span>

              {/* Folder Selector */}
              <div className="flex items-center gap-1">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={note.folderId || ''}
                  onChange={(e) =>
                    onUpdateNote({
                      ...note,
                      folderId: e.target.value || null,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
                  title="Assign Note to Folder"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    Root Folder
                  </option>
                  {projectFolders.map((f) => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-slate-100">
                      {f.parentId ? `↳ ${f.name}` : f.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-600">•</span>

              {/* Status Selector */}
              <select
                value={note.status}
                onChange={(e) =>
                  onUpdateNote({
                    ...note,
                    status: e.target.value as NoteStatus,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="bg-transparent font-medium text-indigo-400 focus:outline-none cursor-pointer"
                title="Workflow Status"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value} className="bg-slate-900 text-slate-100">
                    {st.label}
                  </option>
                ))}
              </select>

              {/* Inline Tag Chips */}
              {note.tags.map((tag) => {
                const meta = tags.find((t) => t.name === tag);
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 font-semibold text-indigo-400"
                    style={meta ? { color: meta.color } : undefined}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="opacity-50 hover:opacity-100 ml-0.5"
                      title={`Remove #${tag}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}

              {showTagInput ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddTag(newTagInput);
                  }}
                  className="inline-flex items-center"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onBlur={() => {
                      if (newTagInput.trim()) handleAddTag(newTagInput);
                      else setShowTagInput(false);
                    }}
                    placeholder="tag-name..."
                    className="px-2 py-0.5 rounded-full bg-slate-900 border border-indigo-500 text-xs text-white focus:outline-none w-24"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-0.5 text-slate-400 hover:text-indigo-300 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tag</span>
                </button>
              )}
            </div>

            {/* Right: 1-Click Format Switcher (.txt vs .md) + Work Timer + Notepad++ Tools */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Per-Note Work Timer Button */}
              {onToggleTrackNote && (
                <button
                  type="button"
                  onClick={onToggleTrackNote}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition ${
                    isTrackingThisNote
                      ? 'bg-emerald-600/25 border-emerald-500/60 text-emerald-300 shadow'
                      : 'bg-[#131c31] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title={
                    isTrackingThisNote
                      ? 'Stop & Log Work Timer for this Note'
                      : 'Start Work Timer for this Note'
                  }
                >
                  {isTrackingThisNote ? (
                    <Square className="w-3 h-3 fill-current text-emerald-400" />
                  ) : (
                    <Clock className="w-3 h-3 text-indigo-400" />
                  )}
                  <span className="font-mono">
                    {noteWorkedSeconds > 0
                      ? `${Math.floor(noteWorkedSeconds / 60)}m ${noteWorkedSeconds % 60}s`
                      : 'Track Work'}
                  </span>
                </button>
              )}

              {/* 1-Click .txt (Notepad++) vs .md (Markdown) Format Switcher */}
              <div className="inline-flex items-center bg-[#131c31] p-0.5 rounded-full border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateNote({
                      ...note,
                      format: 'txt',
                      updatedAt: new Date().toISOString(),
                    });
                    setIsReaderMode(false);
                  }}
                  className={`px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 transition ${
                    currentFormat === 'txt'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Plain Text (.txt) — Notepad++ style"
                >
                  <FileText className="w-3 h-3" />
                  <span>.txt Plain</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNote({
                      ...note,
                      format: 'md',
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className={`px-2.5 py-1 rounded-full font-semibold transition ${
                    currentFormat === 'md'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Markdown (.md) format"
                >
                  .md Markdown
                </button>
              </div>

              {/* Notepad++ Line Numbers Toggle */}
              <button
                type="button"
                onClick={() => setShowLineNumbers((v) => !v)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border transition ${
                  showLineNumbers
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-[#131c31] border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle Line Numbers Gutter (1, 2, 3...)"
              >
                <Hash className="w-3 h-3" />
                <span>Lines</span>
              </button>

              {/* Notepad++ Word Wrap Toggle */}
              <button
                type="button"
                onClick={() => setWordWrap((v) => !v)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border transition ${
                  wordWrap
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-[#131c31] border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Toggle Word Wrap"
              >
                <WrapText className="w-3 h-3" />
                <span>Wrap</span>
              </button>

              {/* Notepad++ Find & Replace Toggle (Cmd + F) */}
              <button
                type="button"
                onClick={() => {
                  setShowFindReplace((v) => !v);
                  setIsReaderMode(false);
                  setTimeout(() => findInputRef.current?.focus(), 20);
                }}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border transition ${
                  showFindReplace
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#131c31] border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Find & Replace in Note (Cmd + F)"
              >
                <Search className="w-3 h-3" />
                <span>Find</span>
              </button>

              {/* Reader View Toggle */}
              <button
                type="button"
                onClick={() => setIsReaderMode((v) => !v)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition ${
                  isReaderMode
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-[#131c31] border-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Switch between Editor and Formatted Reader View"
              >
                {isReaderMode ? (
                  <>
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Reader</span>
                  </>
                )}
              </button>

              {/* Layout & Font Switchers */}
              <button
                type="button"
                onClick={() => {
                  const order: NoteStyle[] = ['document', 'wide', 'cards'];
                  const next = order[(order.indexOf(note.style || 'document') + 1) % order.length];
                  onUpdateNote({ ...note, style: next });
                }}
                className="p-1.5 rounded-full bg-[#131c31] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                title={`Layout: ${note.style || 'document'}`}
              >
                <Layout className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const order: FontFamily[] = ['sans', 'serif', 'mono'];
                  const next = order[(order.indexOf(note.font || 'sans') + 1) % order.length];
                  onUpdateNote({ ...note, font: next });
                }}
                className="p-1.5 rounded-full bg-[#131c31] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                title={`Font: ${note.font || 'sans'}`}
              >
                <Type className="w-3.5 h-3.5" />
              </button>

              {/* Pin Note */}
              <button
                type="button"
                onClick={() =>
                  onUpdateNote({
                    ...note,
                    pinned: !note.pinned,
                    updatedAt: new Date().toISOString(),
                  })
                }
                className={`p-1.5 rounded-full border transition ${
                  note.pinned
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-[#131c31] border-slate-800 text-slate-400 hover:text-white'
                }`}
                title={note.pinned ? 'Unpin Note' : 'Pin Note'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Split-Pane View */}
              {!isSecondaryPane && onOpenInSplit && (
                <button
                  type="button"
                  onClick={() => onOpenInSplit(note.id)}
                  className="p-1.5 rounded-full bg-[#131c31] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                  title="Open Side-by-Side Split View"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
              )}

              {isSecondaryPane && onCloseSplit && (
                <button
                  type="button"
                  onClick={onCloseSplit}
                  className="px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1"
                  title="Close Split Pane"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Split
                </button>
              )}

              {/* Export Dropdown (.txt, .md, .html, .pdf) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="p-1.5 rounded-full bg-[#131c31] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                  title="Export Note (.txt, .md, .html, PDF)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl py-1.5 z-50 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          onExportNote(note, 'txt');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-emerald-600/25 flex items-center justify-between"
                      >
                        <span>Export Plain Text</span>
                        <span className="text-emerald-400 font-mono">.txt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onExportNote(note, 'md');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-indigo-600/25 flex items-center justify-between"
                      >
                        <span>Export Markdown</span>
                        <span className="text-slate-400 font-mono">.md</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onExportNote(note, 'html');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-indigo-600/25 flex items-center justify-between"
                      >
                        <span>Export Web Page</span>
                        <span className="text-slate-400 font-mono">.html</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onExportNote(note, 'pdf');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-indigo-600/25 flex items-center justify-between"
                      >
                        <span>Print / Save PDF</span>
                        <span className="text-slate-400 font-mono">.pdf</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Move Note to Trash */}
              <button
                type="button"
                onClick={() => onDeleteNote(note.id)}
                className="p-1.5 rounded-full bg-[#131c31] text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 border border-slate-800 transition"
                title="Move Note to Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notepad++ Find & Replace Bar (Cmd + F) */}
          {showFindReplace && (
            <div className="mb-5 p-3 rounded-2xl bg-[#131c31] border border-indigo-500/40 shadow-xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                  <input
                    ref={findInputRef}
                    type="text"
                    value={findText}
                    onChange={(e) => {
                      setFindText(e.target.value);
                      setLastMatchIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFindNext();
                      }
                    }}
                    placeholder="Find in note..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white focus:outline-none w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFindNext}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
                >
                  Find Next
                </button>

                <button
                  type="button"
                  onClick={() => setMatchCase((v) => !v)}
                  className={`px-2 py-1.5 rounded-xl font-mono font-bold border ${
                    matchCase
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                  title="Match Case (Aa)"
                >
                  Aa
                </button>

                <span className="text-slate-400 font-mono px-1">
                  {findText ? `${findMatchesCount} matches` : ''}
                </span>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                <div className="relative flex items-center">
                  <Replace className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replace with..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 text-white focus:outline-none w-44"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleReplaceSingle}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Replace All
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                title="Close Find & Replace"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Big Bold Zen Title */}
          <input
            type="text"
            value={note.title}
            onChange={(e) =>
              onUpdateNote({
                ...note,
                title: e.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
            placeholder="Untitled Note..."
            className="w-full bg-transparent text-4xl font-extrabold text-white placeholder-slate-600 focus:outline-none tracking-tight mb-4"
          />

          {/* Slash (/) Command Popover */}
          {showSlashMenu && (
            <div className="mb-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/50 shadow-2xl p-2.5 z-40">
              <div className="flex items-center justify-between px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <span>Slash (/) Commands — Insert Block (↑↓ Arrow Keys • Enter)</span>
                <button
                  type="button"
                  onClick={() => {
                    if (textareaRef.current) {
                      const textBefore = note.content.slice(
                        0,
                        textareaRef.current.selectionStart
                      );
                      dismissedSlashIndexRef.current = textBefore.lastIndexOf('/');
                    }
                    setShowSlashMenu(false);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white font-mono text-[11px]"
                >
                  ESC
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {filteredSlashCommands.map((cmd, idx) => {
                  const isActive = idx === slashSelectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onMouseEnter={() => setSlashSelectedIndex(idx)}
                      onClick={cmd.action}
                      className={`flex items-center justify-between gap-3 p-2 rounded-xl text-left transition group border ${
                        isActive
                          ? 'bg-indigo-600/25 border-indigo-500/60 ring-1 ring-indigo-500/40'
                          : 'border-transparent hover:bg-indigo-600/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isActive
                              ? 'bg-indigo-600/30'
                              : 'bg-slate-800 group-hover:bg-slate-700'
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-100 truncate">
                            {cmd.label}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {cmd.description}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] shrink-0">
                          ↵ Enter
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* [[Wiki-Link]] Picker Popover */}
          {showWikiMenu && (
            <div className="mb-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-purple-500/50 shadow-2xl p-2.5 z-40">
              <div className="flex items-center justify-between px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-purple-400">
                <span>Link to Note [[Wiki-Link]] — ↑↓ Arrow Keys • Enter</span>
                <button
                  type="button"
                  onClick={() => {
                    if (textareaRef.current) {
                      const textBefore = note.content.slice(
                        0,
                        textareaRef.current.selectionStart
                      );
                      dismissedWikiIndexRef.current = textBefore.lastIndexOf('[[');
                    }
                    setShowWikiMenu(false);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white font-mono text-[11px]"
                >
                  ESC
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 mt-1">
                {filteredWikiNotes.map((target, idx) => {
                  const isActive = idx === wikiSelectedIndex;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onMouseEnter={() => setWikiSelectedIndex(idx)}
                      onClick={() => insertSnippet(`[[${target.title}]]`, '[[')}
                      className={`w-full px-3 py-2 text-left text-xs text-slate-200 flex items-center justify-between rounded-lg transition ${
                        isActive ? 'bg-purple-600/30 text-white' : 'hover:bg-purple-600/20'
                      }`}
                    >
                      <span className="font-medium">{target.title}</span>
                      <span className="text-xs text-slate-400">
                        {projects.find((p) => p.id === target.projectId)?.name ||
                          'General Notes'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* NOTEPAD++ PLAIN TEXT / MARKDOWN EDITOR CANVAS WITH LINE NUMBERS GUTTER */}
          {isReaderMode ? (
            <div className="rounded-2xl border border-slate-800/80 bg-[#111827]/60 p-6 mb-5">
              {renderRichPreview()}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800/90 bg-[#0d1322]/90 overflow-hidden mb-5 shadow-inner">
              <div className="flex relative">
                {/* Synchronized Line Numbers Gutter (1, 2, 3...) */}
                {showLineNumbers && (
                  <div
                    ref={gutterRef}
                    aria-hidden="true"
                    className="select-none py-4 px-3 bg-[#090d16]/80 border-r border-slate-800/80 text-right font-mono text-xs leading-[26px] text-slate-600 shrink-0 min-w-[44px]"
                  >
                    {lineCountArray.map((ln) => (
                      <div
                        key={ln}
                        className={
                          cursorLineCol.line === ln
                            ? 'text-indigo-400 font-bold'
                            : 'text-slate-600'
                        }
                      >
                        {ln}
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Plain-Text / Markdown Editor Textarea */}
                <textarea
                  ref={textareaRef}
                  value={note.content}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  onClick={updateCursorLineCol}
                  onKeyUp={updateCursorLineCol}
                  onScroll={(e) => {
                    if (gutterRef.current) {
                      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                    }
                  }}
                  wrap={wordWrap ? 'soft' : 'off'}
                  placeholder="Write plain text here just like Notepad++ (Tab to indent, Cmd+F to Find & Replace, or / for blocks)..."
                  rows={12}
                  className={`flex-1 bg-transparent p-4 text-[15px] leading-[26px] text-slate-100 placeholder-slate-600 focus:outline-none resize-y min-h-[280px] ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                  }`}
                />
              </div>

              {/* Notepad++ Style Bottom Status Bar */}
              <div className="px-4 py-1.5 bg-[#090d16] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-semibold ${
                      currentFormat === 'txt' ? 'text-emerald-400' : 'text-indigo-400'
                    }`}
                  >
                    {currentFormat === 'txt'
                      ? 'Plain Text (.txt)'
                      : 'Markdown (.md)'}
                  </span>
                  <span>•</span>
                  <span className="text-slate-200">
                    Ln {cursorLineCol.line}, Col {cursorLineCol.col}
                  </span>
                  <span>•</span>
                  <span>{stats.linesCount} lines</span>
                </div>

                <div className="flex items-center gap-3">
                  <span>{stats.words} words</span>
                  <span>{stats.chars} chars</span>
                  <span>•</span>
                  <span>{wordWrap ? 'Wrap: ON' : 'Wrap: OFF'}</span>
                  <span>•</span>
                  <span>UTF-8</span>
                </div>
              </div>
            </div>
          )}

          {/* ACTION ITEMS CARD (Synced with Kanban) */}
          <div className="rounded-2xl bg-[#111827]/90 border border-slate-800/90 p-5 mb-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Action Items (Synced with Kanban)
              </span>
              {stats.tasksTotal > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">
                  Tasks: {stats.tasksDone}/{stats.tasksTotal} completed
                </span>
              )}
            </div>

            {noteTasks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {noteTasks.map((task) => (
                  <div
                    key={task.lineIndex}
                    onClick={() => toggleTaskLine(task.lineIndex)}
                    className="flex items-center gap-3 py-1.5 px-2.5 rounded-xl hover:bg-slate-800/60 cursor-pointer transition group"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                          : 'border-slate-600 group-hover:border-indigo-400'
                      }`}
                    >
                      {task.completed && '✓'}
                    </span>
                    <span
                      className={`text-sm ${
                        task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {renderFormattedInline(task.text)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddQuickTask} className="flex items-center gap-2">
              <input
                type="text"
                value={newQuickTaskText}
                onChange={(e) => setNewQuickTaskText(e.target.value)}
                placeholder="+ Add a new action item to this note..."
                className="flex-1 bg-slate-950/70 border border-slate-800/90 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {newQuickTaskText.trim() && (
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Add Task
                </button>
              )}
            </form>
          </div>

          {/* Quick Media Insertion Strip (Sketch Canvas & Voice Memo) */}
          <div className="flex flex-wrap items-center gap-2.5 mb-5">
            <button
              type="button"
              onClick={() => addDrawingBlock(false)}
              className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              <Brush className="w-3.5 h-3.5 text-rose-400" />
              <span>+ Sketch Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => addVoiceBlock(false)}
              className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ Voice Memo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowWikiMenu((v) => !v);
                setWikiFilter('');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#111827] hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
            >
              <Link2 className="w-3.5 h-3.5 text-purple-400" />
              <span>+ [[Link Note]]</span>
            </button>
          </div>

          {/* Embedded Voice Note Blocks */}
          {(note.voiceNotes || []).map((vc) => (
            <VoiceRecorderBlock
              key={vc.id}
              voice={vc}
              onUpdate={(updatedVoice) =>
                onUpdateNote({
                  ...note,
                  voiceNotes: note.voiceNotes.map((v) =>
                    v.id === updatedVoice.id ? updatedVoice : v
                  ),
                  updatedAt: new Date().toISOString(),
                })
              }
              onDelete={(id) =>
                onUpdateNote({
                  ...note,
                  voiceNotes: note.voiceNotes.filter((v) => v.id !== id),
                  updatedAt: new Date().toISOString(),
                })
              }
            />
          ))}

          {/* Embedded Freehand Drawing Canvas Blocks */}
          {(note.drawings || []).map((dr) => (
            <DrawingCanvasBlock
              key={dr.id}
              drawing={dr}
              onUpdate={(updatedDrawing) =>
                onUpdateNote({
                  ...note,
                  drawings: note.drawings.map((d) =>
                    d.id === updatedDrawing.id ? updatedDrawing : d
                  ),
                  updatedAt: new Date().toISOString(),
                })
              }
              onDelete={(id) =>
                onUpdateNote({
                  ...note,
                  drawings: note.drawings.filter((d) => d.id !== id),
                  updatedAt: new Date().toISOString(),
                })
              }
            />
          ))}

          {/* Bi-directional Connections & Backlinks Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/70 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#111827]/70 border border-slate-800/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                Outgoing Links ({outgoingLinks.length})
              </div>
              {outgoingLinks.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Type <code className="text-indigo-400">[[Note Title]]</code> to connect notes.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {outgoingLinks.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        item.targetNote
                          ? onSelectNote(item.targetNote.id)
                          : onCreateLinkedNote(item.title)
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600/20 border border-slate-700 text-xs text-indigo-300 flex items-center gap-1.5 transition"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#111827]/70 border border-slate-800/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                Backlinks / Referenced By ({backlinks.length})
              </div>
              {backlinks.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No other notes link to <span className="text-slate-300">"{note.title}"</span> yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {backlinks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => onSelectNote(b.id)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/15 border border-slate-700/70 text-left text-xs text-emerald-300 flex items-center justify-between transition"
                    >
                      <span className="font-medium truncate">{b.title}</span>
                      <span className="text-xs text-slate-400">Open →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
