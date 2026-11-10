import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { DEFAULT_WORKSPACE } from '../defaultData';
import { WorkspaceData } from '../types';

const require = createRequire(import.meta.url);
const {
  sanitizeFileName,
  getShortNoteId,
  syncWorkspaceFilesToDisk,
} = require('../../electron/vaultSync.cjs');

describe('Local Vault File System Sync Engine (vaultSync.cjs)', () => {
  let tempVaultDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'noteflow-vault-test-'));
  });

  afterEach(() => {
    if (tempVaultDir && fs.existsSync(tempVaultDir)) {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    }
  });

  it('sanitizes filenames safely while preserving readable titles', () => {
    expect(sanitizeFileName('Q4: Product / Architecture? *Spec*')).toBe(
      'Q4- Product - Architecture- -Spec-'
    );
    expect(sanitizeFileName('')).toBe('Untitled');
  });

  it('generates distinct short IDs for timestamp-based note IDs', () => {
    const id1 = getShortNoteId('note-1731172000111-a1b2');
    const id2 = getShortNoteId('note-1731172000222-c3d4');
    expect(id1).not.toBe(id2);
    expect(id1.length).toBe(6);
  });

  it('creates Project and Nested Folder hierarchy and writes Markdown files with YAML frontmatter', () => {
    const clone: WorkspaceData = JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
    const res = syncWorkspaceFilesToDisk(tempVaultDir, clone);

    expect(res.ok).toBe(true);
    expect(res.syncedCount).toBe(5);

    // Check Project directories exist
    expect(fs.existsSync(path.join(tempVaultDir, 'Product & Engineering'))).toBe(true);
    expect(fs.existsSync(path.join(tempVaultDir, 'Knowledge Vault'))).toBe(true);
    expect(fs.existsSync(path.join(tempVaultDir, 'Personal & Journal'))).toBe(true);

    // Check Nested Subfolder exists
    const nestedDir = path.join(
      tempVaultDir,
      'Product & Engineering',
      'Architecture & Specs',
      'Frontend Systems'
    );
    expect(fs.existsSync(nestedDir)).toBe(true);

    const filesInNested = fs.readdirSync(nestedDir);
    expect(filesInNested.length).toBe(1);
    expect(filesInNested[0]).toContain('Design System & UI Philosophy');

    const fileContent = fs.readFileSync(path.join(nestedDir, filesInNested[0]), 'utf-8');
    expect(fileContent).toContain('title: "Design System & UI Philosophy"');
    expect(fileContent).toContain('project: "Product & Engineering"');
    expect(fileContent).toContain('folder: "Architecture & Specs/Frontend Systems"');
    expect(fileContent).toContain('tags: ["ux-design", "architecture"]');
    expect(fileContent).toContain('# Design System & UI Philosophy');
    // Verify plain text (.txt) note in Architecture & Specs is written as a clean .txt file
    const archDir = path.join(
      tempVaultDir,
      'Product & Engineering',
      'Architecture & Specs'
    );
    const archFiles = fs.readdirSync(archDir);
    expect(archFiles.some((f) => f.endsWith('.txt') && f.includes('Welcome to NoteFlow Studio'))).toBe(true);
  });

  it('moves trashed notes and trashed project notes into the Vault Trash folder on disk', () => {
    const clone: WorkspaceData = JSON.parse(JSON.stringify(DEFAULT_WORKSPACE));
    syncWorkspaceFilesToDisk(tempVaultDir, clone);

    const archDir = path.join(
      tempVaultDir,
      'Product & Engineering',
      'Architecture & Specs'
    );
    const initialFiles = fs.readdirSync(archDir).filter((f) => f.endsWith('.txt') || f.endsWith('.md'));
    expect(initialFiles.some((f) => f.includes('Welcome to NoteFlow Studio'))).toBe(true);

    // Rename "Welcome to NoteFlow Studio" -> "Updated Master Guide"
    clone.notes[0].title = 'Updated Master Guide';
    // Trash the second note ("Design System & UI Philosophy")
    clone.notes[1].trashed = true;

    const secondSync = syncWorkspaceFilesToDisk(tempVaultDir, clone);
    expect(secondSync.ok).toBe(true);
    expect(secondSync.syncedCount).toBe(4);

    // Old file name should be removed and replaced by new file name
    const afterRenameFiles = fs.readdirSync(archDir).filter((f) => f.endsWith('.txt') || f.endsWith('.md'));
    expect(afterRenameFiles.some((f) => f.includes('Welcome to NoteFlow Studio'))).toBe(
      false
    );
    expect(afterRenameFiles.some((f) => f.includes('Updated Master Guide'))).toBe(true);

    // Trashed note file should be removed from Frontend Systems directory and moved to Trash folder
    const nestedDir = path.join(archDir, 'Frontend Systems');
    const nestedFiles = fs.readdirSync(nestedDir).filter((f) => f.endsWith('.md'));
    expect(nestedFiles.length).toBe(0);

    const trashDir = path.join(tempVaultDir, 'Trash');
    const trashFiles = fs.readdirSync(trashDir).filter((f) => f.endsWith('.md'));
    expect(trashFiles.some((f) => f.includes('Design System & UI Philosophy'))).toBe(true);
  });
});
