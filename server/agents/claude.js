const BaseAgent = require('./base');

class ClaudeAgent extends BaseAgent {
  constructor(config) {
    super('claude', config);
    this.sessionId = null;
  }

  buildCommand(prompt, options = {}) {
    const model = options.model || this.config.model || 'deepseek-v4-flash';
    const args = [
      '-p', prompt,
      '--model', model,
      '--output-format', 'stream-json',
      '--verbose',
      ...this.config.extraArgs || []
    ];
    
    // Resume existing session
    if (options.resumeSessionId) {
      args.push('--resume', options.resumeSessionId);
    }
    
    return { command: 'claude', args, env: {} };
  }

  normalizeEvent(event) {
    switch (event.type) {
      case 'system':
        // Capture session_id from init event
        if (event.session_id) {
          this.sessionId = event.session_id;
        }
        return { type: 'system', content: '' };
      case 'assistant': {
        if (event.session_id && !this.sessionId) {
          this.sessionId = event.session_id;
        }
        const content = event.message?.content || [];
        let text = '';
        let thinking = '';
        const tools = [];
        
        for (const block of content) {
          if (block.type === 'text') {
            text += block.text || '';
          } else if (block.type === 'thinking') {
            thinking += block.thinking || '';
          } else if (block.type === 'tool_use') {
            tools.push({ name: block.name, id: block.id, input: JSON.stringify(block.input || {}) });
          }
        }
        
        const events = [];
        if (thinking) events.push({ type: 'thinking', content: thinking });
        if (tools.length > 0) {
          for (const tool of tools) {
            events.push({ type: 'tool_start', tool: tool.name, id: tool.id });
            events.push({ type: 'tool_input', content: tool.input });
          }
        }
        if (text) events.push({ type: 'text', content: text });
        
        return events.length === 1 ? events[0] : events.length > 0 ? events : { type: 'text', content: text };
      }
      case 'result':
        if (event.session_id) this.sessionId = event.session_id;
        return { 
          type: 'result', 
          content: event.result || '',
          cost: event.total_cost_usd || null,
          duration: event.duration_ms || null
        };
      default:
        return event;
    }
  }
}

module.exports = ClaudeAgent;
