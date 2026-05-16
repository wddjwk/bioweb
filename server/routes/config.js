const express = require('express');
const fs = require('fs');
const router = express.Router();

// Auth middleware for config routes
function authMiddleware(req, res, next) {
  const password = req.headers['x-auth-password'] || req.body?.password;
  const config = req.app.locals.config;
  
  if (password !== config.password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/config/auth - Verify settings password
router.post('/auth', (req, res) => {
  const { password } = req.body;
  const config = req.app.locals.config;
  
  if (password === config.password) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

// POST /api/config/chat-auth - Verify chat access password
router.post('/chat-auth', (req, res) => {
  const { password } = req.body;
  const config = req.app.locals.config;
  
  if (password === (config.chatPassword || '121212')) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Wrong password' });
});

// GET /api/config - Get current config (public subset)
router.get('/', (req, res) => {
  const config = req.app.locals.config;
  res.json({
    activeAgent: config.activeAgent,
    showThinking: config.showThinking,
    showToolCalls: config.showToolCalls,
    agents: Object.fromEntries(
      Object.entries(config.agents).map(([k, v]) => [k, { name: v.name, model: v.model }])
    )
  });
});

// GET /api/config/full - Get full config (auth required)
router.get('/full', authMiddleware, (req, res) => {
  const config = req.app.locals.config;
  const { password, ...safeConfig } = config;
  res.json(safeConfig);
});

// PUT /api/config - Update config (auth required)
router.put('/', authMiddleware, (req, res) => {
  const updates = req.body;
  delete updates.password;
  
  const config = req.app.locals.config;

  // Deep merge agents to preserve command/extraArgs fields
  if (updates.agents) {
    for (const [name, agentUpdates] of Object.entries(updates.agents)) {
      if (config.agents[name]) {
        Object.assign(config.agents[name], agentUpdates);
      } else {
        config.agents[name] = agentUpdates;
      }
    }
    delete updates.agents;
  }
  
  Object.assign(config, updates);
  
  try {
    fs.writeFileSync(req.app.locals.configPath, JSON.stringify(config, null, 2));
    req.app.locals.config = config;
    res.json({ success: true, config: { ...config, password: undefined } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

module.exports = router;
