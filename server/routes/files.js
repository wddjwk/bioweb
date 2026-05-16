const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

function authMiddleware(req, res, next) {
  const password = req.headers['x-auth-password'] || req.query?.password;
  const config = req.app.locals.config;
  if (password !== config.password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Resolve and validate path is within .claude directory
function resolveSafePath(projectRoot, relativePath) {
  const baseDir = path.join(projectRoot, '.claude');
  const resolved = path.resolve(baseDir, relativePath || '');
  if (!resolved.startsWith(baseDir)) {
    return null; // Path traversal attempt
  }
  return resolved;
}

// GET /api/files?path=... — list directory or get file info
router.get('/', authMiddleware, (req, res) => {
  const relPath = req.query.path || '';
  const fullPath = resolveSafePath(req.app.locals.projectRoot, relPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Path not found' });
  }

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    try {
      const entries = fs.readdirSync(fullPath, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.'))
        .map(e => ({
          name: e.name,
          path: path.relative(path.join(req.app.locals.projectRoot, '.claude'), path.join(fullPath, e.name)),
          isDirectory: e.isDirectory(),
          size: e.isFile() ? fs.statSync(path.join(fullPath, e.name)).size : null,
          modified: fs.statSync(path.join(fullPath, e.name)).mtime.toISOString()
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      res.json({ type: 'directory', path: relPath, entries });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json({ type: 'file', path: relPath, size: stat.size, modified: stat.mtime.toISOString() });
  }
});

// GET /api/files/read?path=... — read file content
router.get('/read', authMiddleware, (req, res) => {
  const relPath = req.query.path || '';
  const fullPath = resolveSafePath(req.app.locals.projectRoot, relPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/files/write — write file content
router.put('/write', authMiddleware, (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Path required' });
  
  const fullPath = resolveSafePath(req.app.locals.projectRoot, relPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  try {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content || '');
    res.json({ success: true, path: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/create — create new file or directory
router.post('/create', authMiddleware, (req, res) => {
  const { path: relPath, isDirectory } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const fullPath = resolveSafePath(req.app.locals.projectRoot, relPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  if (fs.existsSync(fullPath)) {
    return res.status(409).json({ error: 'Path already exists' });
  }

  try {
    if (isDirectory) {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, '');
    }
    res.json({ success: true, path: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/rename — rename file or directory
router.post('/rename', authMiddleware, (req, res) => {
  const { oldPath, newPath } = req.body;
  if (!oldPath || !newPath) return res.status(400).json({ error: 'Both paths required' });

  const fullOld = resolveSafePath(req.app.locals.projectRoot, oldPath);
  const fullNew = resolveSafePath(req.app.locals.projectRoot, newPath);
  if (!fullOld || !fullNew) return res.status(400).json({ error: 'Invalid path' });

  try {
    fs.renameSync(fullOld, fullNew);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/files?path=... — delete file or directory
router.delete('/', authMiddleware, (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Path required' });

  const fullPath = resolveSafePath(req.app.locals.projectRoot, relPath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  // Prevent deleting the root .claude directory itself
  const baseDir = path.join(req.app.locals.projectRoot, '.claude');
  if (fullPath === baseDir) {
    return res.status(403).json({ error: 'Cannot delete root directory' });
  }

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    fs.rmSync(fullPath, { recursive: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
