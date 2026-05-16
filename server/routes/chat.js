const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { createAgent } = require('../agents');

// File upload storage
const uploadDir = path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

// POST /api/chat - Stream chat response (supports optional file attachment)
router.post('/', upload.single('attachment'), (req, res) => {
  const message = req.body?.message;
  const agentOverride = req.body?.agent;
  const modelOverride = req.body?.model;
  const resumeSessionId = req.body?.resumeSessionId;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const config = req.app.locals.config;
  const agentName = agentOverride || config.activeAgent || 'claude';
  const agentConfig = config.agents[agentName];
  
  if (!agentConfig) {
    return res.status(400).json({ error: `Agent "${agentName}" not configured` });
  }

  // Prepare attachment path (rename to preserve original extension)
  let attachmentPath = null;
  if (req.file) {
    const ext = path.extname(req.file.originalname) || '';
    const newPath = req.file.path + ext;
    fs.renameSync(req.file.path, newPath);
    attachmentPath = newPath;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const agent = createAgent(agentName, agentConfig);
  const options = {};
  if (modelOverride) options.model = modelOverride;
  if (resumeSessionId) options.resumeSessionId = resumeSessionId;
  if (attachmentPath) options.attachmentPath = attachmentPath;
  options.cwd = req.app.locals.projectRoot;

  sendSSE(res, { type: 'start', agent: agentName, model: modelOverride || agentConfig.model });

  let clientClosed = false;

  agent.on('data', (event) => {
    if (clientClosed) return;

    // Filter based on config
    if (!config.showThinking && (event.type === 'thinking' || event.type === 'thinking_start')) return;
    if (!config.showToolCalls && (event.type === 'tool_start' || event.type === 'tool_input')) return;
    if (event.type === 'system') return;
    if (event.type === 'stderr') {
      const content = event.content || '';
      if (/Changes\s+\+|Requests\s+\d|Tokens\s+[↑↓]/.test(content)) return;
    }

    sendSSE(res, event);
  });

  agent.on('done', ({ code }) => {
    if (!clientClosed) {
      sendSSE(res, { type: 'done', code, agentSessionId: agent.sessionId || null });
      res.end();
    }
    if (attachmentPath) try { fs.unlinkSync(attachmentPath) } catch {}
  });

  agent.on('error', (err) => {
    if (!clientClosed) {
      sendSSE(res, { type: 'error', content: err.message });
      res.end();
    }
    if (attachmentPath) try { fs.unlinkSync(attachmentPath) } catch {}
  });

  res.on('close', () => {
    clientClosed = true;
    agent.abort();
  });

  agent.execute(message, options).catch((err) => {
    if (!clientClosed) {
      sendSSE(res, { type: 'error', content: err.message });
      res.end();
    }
  });
});

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

module.exports = router;
