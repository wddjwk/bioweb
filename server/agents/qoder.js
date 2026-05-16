const BaseAgent = require('./base');

class QoderAgent extends BaseAgent {
  constructor(config) {
    super('qoder', config);
  }

  buildCommand(prompt, options = {}) {
    const model = options.model || this.config.model || 'DeepSeek-V4-Flash';
    const args = ['-p', prompt, '--model', model];

    if (this.config.extraArgs) {
      args.push(...this.config.extraArgs);
    }

    return { command: 'qoder', args, env: {} };
  }

  parseLine(line) {
    // Try JSON first, fallback to plain text
    try {
      const json = JSON.parse(line);
      return this.normalizeEvent(json);
    } catch {
      return { type: 'text', content: line + '\n' };
    }
  }
}

module.exports = QoderAgent;
