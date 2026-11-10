const path = require('path');
const fs = require('fs');

function sanitizeFileName(name) {
  return (
    (name || 'Untitled')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'Untitled'
  );
}

function getShortNoteId(id) {
  const stripped = String(id || 'note').replace(/^note-/, '');
  return stripped.slice(-6) || '000001';
}

function ensureVaultStructure(vaultPath) {
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }
}

function syncWorkspaceFilesToDisk(vaultPath, workspaceData) {
  try {
    ensureVaultStructure(vaultPath);
    const metaPath = path.join(vaultPath, '.noteflow-workspace.json');

    let previousFiles = [];
    if (fs.existsSync(metaPath)) {
      try {
        const prevMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (Array.isArray(prevMeta._syncedFiles)) {
          previousFiles = prevMeta._syncedFiles;
        }
      } catch (_e) {
        // Ignore corrupt previous metadata
      }
    }

    const projectsById = {};
    (workspaceData.projects || []).forEach((p) => {
      projectsById[p.id] = p;
    });

    const foldersById = {};
    (workspaceData.folders || []).forEach((f) => {
      foldersById[f.id] = f;
    });

    function getFolderSegments(folderId) {
      const segments = [];
      let current = foldersById[folderId];
      let guard = 0;
      while (current && guard < 15) {
        segments.unshift(sanitizeFileName(current.name));
        current = current.parentId ? foldersById[current.parentId] : null;
        guard++;
      }
      return segments;
    }

    // Create directories for all non-trashed projects and nested folders
    (workspaceData.projects || []).forEach((proj) => {
      if (proj.trashed) return;
      const projDir = path.join(vaultPath, sanitizeFileName(proj.name));
      fs.mkdirSync(projDir, { recursive: true });
    });

    (workspaceData.folders || []).forEach((folder) => {
      if (folder.trashed) return;
      const proj = projectsById[folder.projectId];
      if (proj && proj.trashed) return;
      const projDirName = proj ? sanitizeFileName(proj.name) : 'General';
      const folderSegments = getFolderSegments(folder.id);
      const fullFolderDir = path.join(vaultPath, projDirName, ...folderSegments);
      fs.mkdirSync(fullFolderDir, { recursive: true });
    });

    // Ensure Trash directory exists inside the Vault
    const trashDir = path.join(vaultPath, 'Trash');
    fs.mkdirSync(trashDir, { recursive: true });

    const currentSyncedFiles = [];
    let activeNotesCount = 0;

    (workspaceData.notes || []).forEach((note) => {
      const proj = projectsById[note.projectId];
      const isTrashed = Boolean(note.trashed || (proj && proj.trashed));
      const projDirName = proj ? sanitizeFileName(proj.name) : 'General';
      const folderSegments = note.folderId ? getFolderSegments(note.folderId) : [];

      const targetDir = isTrashed
        ? trashDir
        : path.join(vaultPath, projDirName, ...folderSegments);
      fs.mkdirSync(targetDir, { recursive: true });

      const frontmatter = [
        '---',
        `id: "${note.id}"`,
        `title: "${(note.title || 'Untitled').replace(/"/g, '\\"')}"`,
        `project: "${proj ? proj.name : 'General'}"`,
        `folder: "${folderSegments.join('/') || '/'}"`,
        `tags: [${(note.tags || []).map((t) => `"${t}"`).join(', ')}]`,
        `status: "${note.status || 'todo'}"`,
        `pinned: ${Boolean(note.pinned)}`,
        `trashed: ${isTrashed}`,
        `style: "${note.style || 'document'}"`,
        `updatedAt: "${note.updatedAt || new Date().toISOString()}"`,
        '---',
        '',
      ].join('\n');

      const shortId = getShortNoteId(note.id);
      const isPlainTxt = note.format === 'txt';
      const ext = isPlainTxt ? 'txt' : 'md';
      const fileName = `${sanitizeFileName(note.title)} (${shortId}).${ext}`;
      const filePath = path.join(targetDir, fileName);
      const fileBody = isPlainTxt ? (note.content || '') : frontmatter + (note.content || '');
      fs.writeFileSync(filePath, fileBody, 'utf-8');
      currentSyncedFiles.push(filePath);
      if (!isTrashed) activeNotesCount++;
    });

    // Remove any stale files from previous locations (both tracked and untracked orphan note files)
    const currentSet = new Set(currentSyncedFiles);
    previousFiles.forEach((oldFilePath) => {
      if (!currentSet.has(oldFilePath) && fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (_e) {
          // Ignore unlink errors
        }
      }
    });

    function cleanupStaleNoteFiles(dirPath) {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          cleanupStaleNoteFiles(fullPath);
        } else if (
          entry.isFile() &&
          /\([^)]+\)\.(md|txt)$/i.test(entry.name) &&
          !currentSet.has(fullPath)
        ) {
          try {
            fs.unlinkSync(fullPath);
          } catch (_e) {
            // Ignore unlink errors
          }
        }
      }
    }
    cleanupStaleNoteFiles(vaultPath);

    const persistedPayload = {
      ...workspaceData,
      _syncedFiles: currentSyncedFiles,
    };
    fs.writeFileSync(metaPath, JSON.stringify(persistedPayload, null, 2), 'utf-8');

    return { ok: true, vaultPath, syncedCount: activeNotesCount };
  } catch (err) {
    console.error('Error syncing workspace to disk:', err);
    return { ok: false, error: String(err) };
  }
}

module.exports = {
  sanitizeFileName,
  getShortNoteId,
  ensureVaultStructure,
  syncWorkspaceFilesToDisk,
};
