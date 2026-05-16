const ClaudeAgent = require('./claude');
const CopilotAgent = require('./copilot');
const QoderAgent = require('./qoder');

const AGENT_MAP = {
  claude: ClaudeAgent,
  copilot: CopilotAgent,
  qoder: QoderAgent
};

function createAgent(name, config) {
  const AgentClass = AGENT_MAP[name];
  if (!AgentClass) {
    throw new Error(`Unknown agent: ${name}. Available: ${Object.keys(AGENT_MAP).join(', ')}`);
  }
  return new AgentClass(config);
}

function getAvailableAgents() {
  return Object.keys(AGENT_MAP);
}

module.exports = { createAgent, getAvailableAgents, AGENT_MAP };
