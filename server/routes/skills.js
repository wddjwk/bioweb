const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

function getSkillsDir(req) {
  return path.join(req.app.locals.projectRoot, '.claude', 'skills');
}

// Auth middleware
function authMiddleware(req, res, next) {
  const password = req.headers['x-auth-password'] || req.body?.password;
  if (password !== req.app.locals.config.password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/skills - List all skills
router.get('/', (req, res) => {
  const skillsDir = getSkillsDir(req);
  
  try {
    if (!fs.existsSync(skillsDir)) {
      return res.json({ skills: [] });
    }
    
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    const skills = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const skillPath = path.join(skillsDir, e.name, 'SKILL.md');
        let content = '';
        let metadata = {};
        
        if (fs.existsSync(skillPath)) {
          content = fs.readFileSync(skillPath, 'utf-8');
          // Parse YAML frontmatter
          const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
          if (fmMatch) {
            const lines = fmMatch[1].split('\n');
            for (const line of lines) {
              const [key, ...vals] = line.split(':');
              if (key && vals.length) {
                metadata[key.trim()] = vals.join(':').trim();
              }
            }
          }
        }
        
        return {
          id: e.name,
          name: metadata.name || e.name,
          description: metadata.description || '',
          hasSkillMd: fs.existsSync(skillPath),
          path: path.join(skillsDir, e.name)
        };
      });
    
    res.json({ skills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id - Get skill content
router.get('/:id', (req, res) => {
  const skillPath = path.join(getSkillsDir(req), req.params.id, 'SKILL.md');
  
  if (!fs.existsSync(skillPath)) {
    return res.status(404).json({ error: 'Skill not found' });
  }
  
  const content = fs.readFileSync(skillPath, 'utf-8');
  res.json({ id: req.params.id, content });
});

// PUT /api/skills/:id - Update skill (auth required)
router.put('/:id', authMiddleware, (req, res) => {
  const { content } = req.body;
  const skillDir = path.join(getSkillsDir(req), req.params.id);
  const skillPath = path.join(skillDir, 'SKILL.md');
  
  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillPath, content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills - Create new skill (auth required)
router.post('/', authMiddleware, (req, res) => {
  const { id, content } = req.body;
  
  if (!id || !id.match(/^[a-z0-9-]+$/)) {
    return res.status(400).json({ error: 'Invalid skill ID. Use lowercase letters, numbers, and hyphens.' });
  }
  
  const skillDir = path.join(getSkillsDir(req), id);
  
  if (fs.existsSync(skillDir)) {
    return res.status(409).json({ error: 'Skill already exists' });
  }
  
  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      content || `---\nname: ${id}\ndescription: "New skill"\n---\n\n# ${id}\n\nDescribe your skill here.\n`
    );
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/skills/:id - Delete skill (auth required)
router.delete('/:id', authMiddleware, (req, res) => {
  const skillDir = path.join(getSkillsDir(req), req.params.id);
  
  if (!fs.existsSync(skillDir)) {
    return res.status(404).json({ error: 'Skill not found' });
  }
  
  try {
    fs.rmSync(skillDir, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
