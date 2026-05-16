const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const SESSIONS_BASE = path.join(__dirname, '..', 'data', 'sessions');

function userDir(user) {
  const safe = (user || 'default').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dir = path.join(SESSIONS_BASE, safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function loadSession(user, id) {
  const file = path.join(userDir(user), `${id}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return null;
}

function saveSession(user, session) {
  fs.writeFileSync(
    path.join(userDir(user), `${session.id}.json`),
    JSON.stringify(session, null, 2)
  );
}

// GET /api/sessions?user=xxx
router.get('/', (req, res) => {
  const user = req.query.user || 'default';
  try {
    const dir = userDir(user);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const sessions = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        return {
          id: data.id,
          title: data.title,
          agentSessionId: data.agentSessionId,
          agent: data.agent,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          messageCount: (data.messages || []).length
        };
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.json({ sessions });
  } catch (err) {
    res.json({ sessions: [] });
  }
});

// POST /api/sessions
router.post('/', (req, res) => {
  const user = req.body.user || 'default';
  const session = {
    id: uuidv4(),
    title: '新对话',
    agent: req.body.agent || 'claude',
    user,
    agentSessionId: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveSession(user, session);
  res.json(session);
});

// GET /api/sessions/:id
router.get('/:id', (req, res) => {
  const user = req.query.user || 'default';
  const session = loadSession(user, req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

// PUT /api/sessions/:id
router.put('/:id', (req, res) => {
  const user = req.body.user || req.query.user || 'default';
  const session = loadSession(user, req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  if (req.body.title !== undefined) session.title = req.body.title;
  if (req.body.agentSessionId !== undefined) session.agentSessionId = req.body.agentSessionId;
  if (req.body.agent !== undefined) session.agent = req.body.agent;
  if (req.body.message) {
    session.messages = session.messages || [];
    session.messages.push(req.body.message);
    if (session.title === '新对话' && req.body.message.role === 'user') {
      session.title = req.body.message.content.slice(0, 30) + (req.body.message.content.length > 30 ? '...' : '');
    }
  }
  session.updatedAt = new Date().toISOString();
  saveSession(user, session);
  res.json(session);
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  const user = req.query.user || 'default';
  const file = path.join(userDir(user), `${req.params.id}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Not found' });
});

module.exports = router;
