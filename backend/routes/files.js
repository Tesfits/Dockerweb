const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
const BASE_HOME_DIR = '/samba/home';
const upload = multer({ dest: 'uploads/' });

/**
 * Helper: Get user's directory with optional subpath
 */
function getUserDir(username, subPath = '') {
  const safeSubPath = path.normalize(subPath).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(BASE_HOME_DIR, username, safeSubPath);
}

/**
 * Helper: Check if directory/file exists
 */
async function ensureUserDirExists(dirPath) {
  try {
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/files
 * List files/folders in user's directory (optionally nested)
 */
router.get('/', verifyToken, async (req, res) => {
  const subPath = req.query.path || '';
  const userDir = getUserDir(req.user.username, subPath);

  if (!(await ensureUserDirExists(userDir))) {
    return res.status(404).json({ error: 'Directory not found' });
  }

  try {
    const entries = await fs.readdir(userDir, { withFileTypes: true });
    const files = entries.map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
    res.json({ path: subPath, files });
  } catch (err) {
    res.status(500).json({ error: 'Unable to list files' });
  }
});

/**
 * POST /api/files/upload
 * Upload a file to a specific path in user's directory
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  const subPath = req.body.path || '';
  const userDir = getUserDir(req.user.username, subPath);

  if (!(await ensureUserDirExists(userDir))) {
    return res.status(404).json({ error: 'Directory not found' });
  }

  const tempPath = req.file.path;
  const targetPath = path.join(userDir, req.file.originalname);

  try {
    await fs.rename(tempPath, targetPath);
    res.json({ message: 'File uploaded successfully', file: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

/**
 * POST /api/files/folder
 * Create a new folder
 */
router.post('/folder', verifyToken, async (req, res) => {
  const { path: subPath = '', name } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  const folderPath = getUserDir(req.user.username, path.join(subPath, name));

  if (await ensureUserDirExists(folderPath)) {
    return res.status(400).json({ error: 'Folder already exists' });
  }

  try {
    await fs.mkdir(folderPath, { recursive: true });
    res.json({ message: 'Folder created successfully', folder: name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

/**
 * DELETE /api/files
 * Delete a file or folder
 */
router.delete('/', verifyToken, async (req, res) => {
  const { path: subPath } = req.body;
  if (!subPath) return res.status(400).json({ error: 'Path is required' });

  const targetPath = getUserDir(req.user.username, subPath);

  if (!(await ensureUserDirExists(targetPath))) {
    return res.status(404).json({ error: 'File/folder not found' });
  }

  try {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: true });
    } else {
      await fs.unlink(targetPath);
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

/**
 * POST /api/files/rename
 * Rename a file or folder
 */
router.post('/rename', verifyToken, async (req, res) => {
  const { path: subPath, newName } = req.body;
  if (!subPath || !newName) return res.status(400).json({ error: 'Path and new name are required' });

  const oldPath = getUserDir(req.user.username, subPath);
  const newPath = path.join(path.dirname(oldPath), newName);

  if (!(await ensureUserDirExists(oldPath))) {
    return res.status(404).json({ error: 'File/folder not found' });
  }

  try {
    await fs.rename(oldPath, newPath);
    res.json({ message: 'Renamed successfully', newName });
  } catch (err) {
    res.status(500).json({ error: 'Rename failed' });
  }
});

/**
 * GET /api/files/download
 * Download a file
 */
router.get('/download', verifyToken, async (req, res) => {
  const subPath = req.query.path;
  if (!subPath) return res.status(400).json({ error: 'File path is required' });

  const filePath = getUserDir(req.user.username, subPath);

  if (!(await ensureUserDirExists(filePath))) return res.status(404).json({ error: 'File not found' });

  res.download(filePath, path.basename(filePath), (err) => {
    if (err) res.status(500).json({ error: 'File download failed' });
  });
});

module.exports = router;
