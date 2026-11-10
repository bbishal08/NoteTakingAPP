import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

describe('NoteFlow Studio — Zen Canvas + Floating Top Dock & Trash Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Projects, Nested Folders, Tags, and the default Welcome Note in Zen layout', () => {
    render(<App />);

    // Projects in sidebar
    expect(screen.getAllByText('Product & Engineering').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Knowledge Vault').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Personal & Journal').length).toBeGreaterThan(0);

    // Nested Folders in sidebar
    expect(screen.getAllByText('Architecture & Specs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Frontend Systems').length).toBeGreaterThan(0);

    // Active Note Title in Zen Editor
    const titleInput = screen.getByPlaceholderText('Untitled Note...') as HTMLInputElement;
    expect(titleInput.value).toBe('Welcome to NoteFlow Studio');

    // Outgoing [[Wiki-Links]] rendered in Connections footer
    expect(screen.getByText(/Outgoing Links \(2\)/i)).toBeInTheDocument();
  });

  it('creates a new note, uses 1-click templates, edits title & content, and adds a custom #tag', () => {
    render(<App />);

    // Open 1-Click Note Templates menu and verify it renders cleanly
    const tplBtn = screen.getByTitle('Create Note from Template');
    fireEvent.click(tplBtn);
    expect(screen.getByText(/1-Click Note Templates/i)).toBeInTheDocument();
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
    fireEvent.click(tplBtn);

    // Click New Note
    const newNoteBtn = screen.getByRole('button', { name: /New Note.*⌘N/i });
    fireEvent.click(newNoteBtn);

    const titleInput = screen.getByPlaceholderText('Untitled Note...') as HTMLInputElement;
    expect(titleInput.value).toBe('Untitled Note');

    // Update note title
    fireEvent.change(titleInput, { target: { value: 'Sprint Architecture Review' } });
    expect(titleInput.value).toBe('Sprint Architecture Review');

    // Add a custom tag via "+ Add Tag" button
    const addTagBtn = screen.getByRole('button', { name: /Add Tag/i });
    fireEvent.click(addTagBtn);

    const tagInput = screen.getByPlaceholderText('tag-name...');
    fireEvent.change(tagInput, { target: { value: 'sprint-42' } });
    fireEvent.submit(tagInput.closest('form')!);

    expect(screen.getAllByText(/sprint-42/i).length).toBeGreaterThan(0);
  });

  it('supports Slash (/) commands and Floating Top Dock Sketch & Voice actions', () => {
    render(<App />);

    // Type "/" at the end of the editor textarea to trigger Slash Command menu
    const editorTextarea = screen.getByPlaceholderText(
      /Write plain text here just like Notepad\+\+/i
    ) as HTMLTextAreaElement;
    fireEvent.change(editorTextarea, {
      target: {
        value: editorTextarea.value + '\n/',
        selectionStart: editorTextarea.value.length + 2,
      },
    });

    expect(screen.getByText(/Slash \(\/\) Commands — Insert Block/i)).toBeInTheDocument();

    // Insert a Sketch / Drawing Canvas block from the slash menu
    const sketchOption = screen.getByText('Sketch / Drawing Canvas');
    fireEvent.click(sketchOption);
    expect(screen.getByDisplayValue('Sketch 1')).toBeInTheDocument();

    // Insert a Voice Memo Recorder block from the Floating Top Dock
    const dockVoiceBtn = screen.getByTitle('Add Voice Memo Recorder to Note');
    fireEvent.click(dockVoiceBtn);

    expect(screen.getByDisplayValue('Voice Memo 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record Voice Note/i })).toBeInTheDocument();
  });

  it('supports Notepad++ Plain Text (.txt) mode, Find & Replace, Line Numbers, and Word Wrap', () => {
    render(<App />);

    // Verify default Plain Text (.txt) status bar and Ln/Col indicator
    expect(screen.getByText('Plain Text (.txt)')).toBeInTheDocument();
    expect(screen.getByText(/Ln 1, Col 1/i)).toBeInTheDocument();
    expect(screen.getByText('Wrap: ON')).toBeInTheDocument();

    // Toggle Word Wrap off
    const wrapBtn = screen.getByTitle('Toggle Word Wrap');
    fireEvent.click(wrapBtn);
    expect(screen.getByText('Wrap: OFF')).toBeInTheDocument();

    // Switch note format to .md Markdown and back to .txt Plain
    const mdBtn = screen.getByTitle('Markdown (.md) format');
    fireEvent.click(mdBtn);
    expect(screen.getByText('Markdown (.md)')).toBeInTheDocument();

    const txtBtn = screen.getByTitle('Plain Text (.txt) — Notepad++ style');
    fireEvent.click(txtBtn);
    expect(screen.getByText('Plain Text (.txt)')).toBeInTheDocument();

    // Open Find & Replace bar and replace a word
    const findBtn = screen.getByTitle('Find & Replace in Note (Cmd + F)');
    fireEvent.click(findBtn);

    const findInput = screen.getByPlaceholderText('Find in note...');
    const replaceInput = screen.getByPlaceholderText('Replace with...');
    fireEvent.change(findInput, { target: { value: 'Notepad++' } });
    fireEvent.change(replaceInput, { target: { value: 'SuperPad++' } });

    const replaceAllBtn = screen.getByRole('button', { name: /Replace All/i });
    fireEvent.click(replaceAllBtn);

    const editorTextarea = screen.getByPlaceholderText(
      /Write plain text here just like Notepad\+\+/i
    ) as HTMLTextAreaElement;
    expect(editorTextarea.value).toContain('SuperPad++');
  });

  it('navigates via bi-directional [[Wiki-Links]] and displays Backlinks', () => {
    render(<App />);

    const wikiButtons = screen.getAllByRole('button', {
      name: /Design System & UI Philosophy/i,
    });
    fireEvent.click(wikiButtons[0]);

    const titleInput = screen.getByPlaceholderText('Untitled Note...') as HTMLInputElement;
    expect(titleInput.value).toBe('Design System & UI Philosophy');

    expect(screen.getByText(/Backlinks \/ Referenced By \(2\)/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Welcome to NoteFlow Studio.*Open/i })
    ).toBeInTheDocument();
  });

  it('minimizes and expands the side menu via the Minimize / Show Sidebar buttons', () => {
    render(<App />);

    expect(screen.getByText('Projects & Folders')).toBeInTheDocument();

    // Click Minimize button in the sidebar
    const minimizeBtn = screen.getByTitle('Minimize Sidebar (Cmd + \\)');
    fireEvent.click(minimizeBtn);

    expect(screen.queryByText('Projects & Folders')).not.toBeInTheDocument();

    // Click Show Sidebar button in the top bar
    const expandBtn = screen.getByRole('button', { name: /Show Sidebar/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText('Projects & Folders')).toBeInTheDocument();
  });

  it('syncs action items between the Zen Action Items card and the Kanban & Tasks Hub', () => {
    render(<App />);

    // Switch to Kanban & Tasks view via the Floating Top Dock
    const kanbanTab = screen.getByRole('button', { name: /Kanban & Tasks/i });
    fireEvent.click(kanbanTab);

    expect(screen.getByText(/Kanban & Action Items Hub/i)).toBeInTheDocument();

    // Switch to "All Note Checklists" sub-tab
    const checklistsTab = screen.getByRole('button', { name: /All Note Checklists/i });
    fireEvent.click(checklistsTab);

    // Toggle an uncompleted task
    const taskItem = screen.getByText(/Record a quick audio thought with the/i);
    fireEvent.click(taskItem);

    // Switch back to Workspace Editor and verify task count updated to 3/5
    const editorTab = screen.getByRole('button', { name: /Workspace Editor/i });
    fireEvent.click(editorTab);

    expect(screen.getByText(/Tasks: 3\/5 completed/i)).toBeInTheDocument();
  });

  it('deletes both Projects and Notes into the Trash Folder and restores them cleanly', () => {
    render(<App />);

    // 1. Delete current Note ("Welcome to NoteFlow Studio")
    const deleteNoteBtn = screen.getByTitle('Move Note to Trash');
    fireEvent.click(deleteNoteBtn);

    // 2. Delete an entire Project ("Personal & Journal") from the sidebar
    const deleteProjectBtn = screen.getByTitle('Delete Project "Personal & Journal" to Trash');
    fireEvent.click(deleteProjectBtn);

    // Open the Trash Bin from the sidebar
    const trashBtn = screen.getByRole('button', { name: /Trash Bin/i });
    fireEvent.click(trashBtn);

    // Verify Trash Folder View shows both Deleted Projects and Deleted Notes
    expect(screen.getByText('Trash Folder')).toBeInTheDocument();
    expect(screen.getByText(/Deleted Projects \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Deleted Notes \(2\)/i)).toBeInTheDocument();

    // Restore the deleted Project
    const restoreProjectBtn = screen.getByRole('button', { name: /Restore Project/i });
    fireEvent.click(restoreProjectBtn);

    // Restore the remaining deleted Note ("Welcome to NoteFlow Studio")
    const restoreNoteBtn = screen.getByRole('button', { name: /^Restore$/i });
    fireEvent.click(restoreNoteBtn);

    expect(screen.getByText('Your Trash Folder is Empty')).toBeInTheDocument();
  });

  it('promotes Scratchpad text into a new active Note even after projects are deleted', () => {
    render(<App />);

    // Delete the first project ("Product & Engineering") to verify Scratchpad doesn't promote into a trashed project
    const deleteProjBtn = screen.getByTitle('Delete Project "Product & Engineering" to Trash');
    fireEvent.click(deleteProjBtn);

    // Open Quick Capture Scratchpad
    const openScratchpadBtn = screen.getByTitle('Open Quick Capture Scratchpad (Cmd + J)');
    fireEvent.click(openScratchpadBtn);

    const scratchpadInput = screen.getByPlaceholderText(
      /Jot down a quick thought, snippet, or phone number here/i
    ) as HTMLTextAreaElement;
    fireEvent.change(scratchpadInput, {
      target: { value: 'Brainstorm Idea: Offline AI Summarizer\n- Fast local model\n- Zero cloud latency' },
    });

    const promoteBtn = screen.getByRole('button', { name: /Promote to Note/i });
    fireEvent.click(promoteBtn);

    // Verify confirmation banner and that the new note is active in the editor and listed in the sidebar
    expect(
      screen.getByText(/Promoted "Brainstorm Idea: Offline AI Summarizer" to Notes!/i)
    ).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('Untitled Note...') as HTMLInputElement;
    expect(titleInput.value).toBe('Brainstorm Idea: Offline AI Summarizer');
  });

  it('supports Esc and Arrow key navigation in / command menu, plus smart Checklist single-Enter continuation and double-Enter exit', () => {
    render(<App />);

    const editor = screen.getByPlaceholderText(
      /Write plain text here just like Notepad\+\+/i
    ) as HTMLTextAreaElement;

    // 1. Type "/" to open the Slash Command menu
    fireEvent.change(editor, {
      target: { value: '/', selectionStart: 1, selectionEnd: 1 },
    });
    editor.setSelectionRange(1, 1);

    expect(
      screen.getByText(/Slash \(\/\) Commands — Insert Block/i)
    ).toBeInTheDocument();

    // 2. Press Escape -> Slash Command menu closes immediately
    fireEvent.keyDown(editor, { key: 'Escape' });
    expect(
      screen.queryByText(/Slash \(\/\) Commands — Insert Block/i)
    ).not.toBeInTheDocument();

    // 3. Re-open Slash menu on a fresh "/" and navigate with ArrowDown / ArrowUp + Enter
    fireEvent.change(editor, {
      target: { value: 'Notes:\n/', selectionStart: 8, selectionEnd: 8 },
    });
    editor.setSelectionRange(8, 8);
    expect(
      screen.getByText(/Slash \(\/\) Commands — Insert Block/i)
    ).toBeInTheDocument();

    // Navigate down once (to Heading 1) and back up once (to To-Do Checklist) then press Enter
    fireEvent.keyDown(editor, { key: 'ArrowDown' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    fireEvent.keyDown(editor, { key: 'Enter' });

    // Verify "- [ ] " was inserted replacing "/"
    expect(editor.value).toBe('Notes:\n- [ ] ');

    // 4. Type checklist text and press Enter ONCE -> automatically continues checklist on next line
    const withFirstTask = 'Notes:\n- [ ] Ship v2 release';
    fireEvent.change(editor, {
      target: {
        value: withFirstTask,
        selectionStart: withFirstTask.length,
        selectionEnd: withFirstTask.length,
      },
    });
    editor.setSelectionRange(withFirstTask.length, withFirstTask.length);

    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(editor.value).toBe('Notes:\n- [ ] Ship v2 release\n- [ ] ');

    // 5. Press Enter a SECOND time on the empty "- [ ] " line -> exits checklist mode cleanly!
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(editor.value).toBe('Notes:\n- [ ] Ship v2 release\n');
  });

  it('tracks work sessions on a particular work item, automatically pauses on system idle, and logs to the Work Timeline', () => {
    render(<App />);

    // Open Work Timer & Timeline view from the Floating Top Dock
    const timerDockBtn = screen.getByTitle('Open Work Timer & Timeline Tracker');
    fireEvent.click(timerDockBtn);

    expect(screen.getByText(/Work Timeline & Time Tracker/i)).toBeInTheDocument();

    // Enter a particular work name and start the timer
    const taskInput = screen.getByPlaceholderText(
      /What particular work are you focusing on/i
    ) as HTMLInputElement;
    fireEvent.change(taskInput, {
      target: { value: 'Backend Database Optimization' },
    });

    const startBtn = screen.getByRole('button', { name: /Start Timer/i });
    fireEvent.click(startBtn);

    expect(screen.getByText('ACTIVE WORK SESSION')).toBeInTheDocument();

    // Simulate System Idle -> verify automatic idle pause activates
    const simulateIdleBtn = screen.getByRole('button', {
      name: /Simulate System Idle/i,
    });
    fireEvent.click(simulateIdleBtn);

    expect(screen.getByText('SYSTEM IDLE — AUTO-PAUSED')).toBeInTheDocument();
    expect(
      screen.getByText(/System Idle Detected — Timer Automatically Paused!/i)
    ).toBeInTheDocument();

    // Resume timer discarding idle time
    const resumeDiscardBtn = screen.getByRole('button', {
      name: /Resume \(Discard Idle Time\)/i,
    });
    fireEvent.click(resumeDiscardBtn);
    expect(screen.getByText('ACTIVE WORK SESSION')).toBeInTheDocument();

    // Stop & Log Session -> verify it appears in Time Worked per Particular Work and Chronological Work Timeline
    const stopAndLogBtn = screen.getByRole('button', { name: /^Stop & Log$/i });
    fireEvent.click(stopAndLogBtn);

    expect(
      screen.getAllByText('Backend Database Optimization').length
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/idle excluded/i)).toBeInTheDocument();
  });

  it('minimizes and expands folders in the sidebar to hide or show nested notes', () => {
    render(<App />);

    // "Sprint & Meetings" folder contains "Q4 Product Roadmap"
    expect(screen.getByTitle('Move "Q4 Product Roadmap" to Trash')).toBeInTheDocument();

    const folderRow = screen.getByTitle('Minimize folder "Sprint & Meetings"');
    fireEvent.click(folderRow);

    // Once minimized, the "Q4 Product Roadmap" note row inside "Sprint & Meetings" is hidden
    expect(
      screen.queryByTitle('Move "Q4 Product Roadmap" to Trash')
    ).not.toBeInTheDocument();

    // Click again to expand the folder
    const expandFolderRow = screen.getByTitle('Expand folder "Sprint & Meetings"');
    fireEvent.click(expandFolderRow);

    expect(screen.getByTitle('Move "Q4 Product Roadmap" to Trash')).toBeInTheDocument();
  });
});
