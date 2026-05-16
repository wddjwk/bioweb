const { spawn } = require('child_process');
const { EventEmitter } = require('events');

class BaseAgent extends EventEmitter {
  constructor(name, config) {
    super();
    this.name = name;
    this.config = config;
    this.process = null;
  }

  buildCommand(prompt, options = {}) {
    throw new Error('Subclasses must implement buildCommand()');
  }

  async execute(prompt, options = {}) {
    const { command, args, env } = this.buildCommand(prompt, options);
    const cwd = options.cwd || process.cwd();
    
    return new Promise((resolve, reject) => {
      let proc;
      try {
        proc = spawn(command, args, {
          env: { ...process.env, ...env },
          cwd,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (spawnErr) {
        this.emit('error', spawnErr);
        return reject(spawnErr);
      }
      
      // Close stdin immediately - CLI tools with -p don't need input
      proc.stdin.end();
      
      this.process = proc;
      let buffer = '';

      proc.stdout.on('data', (data) => {
        buffer += data.toString();
        // Try to parse streaming JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          const parsed = this.parseLine(trimmed);
          if (parsed) {
            // Handle single or array of events
            if (Array.isArray(parsed)) {
              for (const event of parsed) {
                this.emit('data', event);
              }
            } else {
              this.emit('data', parsed);
            }
          }
        }
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        this.emit('data', { type: 'stderr', content: text });
      });

      proc.on('close', (code) => {
        // Flush remaining buffer
        if (buffer.trim()) {
          const parsed = this.parseLine(buffer.trim());
          if (parsed) this.emit('data', parsed);
        }
        this.process = null;
        this.emit('done', { code });
        resolve({ code });
      });

      proc.on('error', (err) => {
        this.process = null;
        this.emit('error', err);
        reject(err);
      });
    });
  }

  parseLine(line) {
    // Try JSON parse first
    try {
      const json = JSON.parse(line);
      return this.normalizeEvent(json);
    } catch {
      // Plain text output
      return { type: 'text', content: line };
    }
  }

  normalizeEvent(event) {
    // Subclasses can override for custom normalization
    return event;
  }

  abort() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }
}

module.exports = BaseAgent;
