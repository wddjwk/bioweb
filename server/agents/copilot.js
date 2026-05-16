const BaseAgent = require('./base');

class CopilotAgent extends BaseAgent {
  constructor(config) {
    super('copilot', config);
    this.sessionId = null;
  }

  buildCommand(prompt, options = {}) {
    const model = options.model || this.config.model || 'gpt-4.1';
    const args = ['-p', prompt, '--model', model];

    if (options.resumeSessionId) {
      args.push(`--resume=${options.resumeSessionId}`);
    }

    if (this.config.extraArgs) {
      args.push(...this.config.extraArgs);
    }

    return { command: 'copilot', args, env: {} };
  }

  // Copilot outputs plain text, not JSON
  parseLine(line) {
    return { type: 'text', content: line + '\n' };
  }
}

module.exports = CopilotAgent;
