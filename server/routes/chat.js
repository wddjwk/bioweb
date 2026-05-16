const express = require('express');
const router = express.Router();
const { createAgent } = require('../agents');

// POST /api/chat - Stream chat response
router.post('/', (req, res) => {
  const { message, agent: agentOverride, model: modelOverride, resumeSessionId } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const config = req.app.locals.config;
  const agentName = agentOverride || config.activeAgent || 'claude';
  const agentConfig = config.agents[agentName];
  
  if (!agentConfig) {
    return res.status(400).json({ error: `Agent "${agentName}" not configured` });
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
      // Send the agent session ID so frontend can use --resume
      sendSSE(res, { type: 'done', code, agentSessionId: agent.sessionId || null });
      res.end();
    }
  });

  agent.on('error', (err) => {
    if (!clientClosed) {
      sendSSE(res, { type: 'error', content: err.message });
      res.end();
    }
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
