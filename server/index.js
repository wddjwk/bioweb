const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chatRouter = require('./routes/chat');
const configRouter = require('./routes/config');
const skillsRouter = require('./routes/skills');
const sessionsRouter = require('./routes/sessions');
const filesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

// Config file path
const CONFIG_PATH = path.join(__dirname, 'config', 'settings.json');

// Load or create default config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) { /* use defaults */ }
  const defaults = {
    activeAgent: 'claude',
    agents: {
      claude: {
        name: 'Claude',
        command: 'claude',
        model: 'deepseek-v4-flash',
        extraArgs: ['--allow-dangerously-skip-permissions']
      },
      copilot: {
        name: 'Copilot',
        command: 'copilot',
        model: 'gpt-4.1',
        extraArgs: []
      },
      qoder: {
        name: 'Qoder',
        command: 'qoder',
        model: 'DeepSeek-V4-Flash',
        extraArgs: []
      }
    },
    showThinking: true,
    showToolCalls: true,
    password: '212121',
    chatPassword: '121212'
  };
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
  return defaults;
}

// Make config available to routes
app.locals.config = loadConfig();
app.locals.configPath = CONFIG_PATH;
app.locals.projectRoot = path.join(__dirname, '..');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/chat', chatRouter);
app.use('/api/config', configRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/files', filesRouter);

// Serve static frontend (production)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌿 BioWeb server running at http://localhost:${PORT}`);
  console.log(`   Active agent: ${app.locals.config.activeAgent}`);
});
