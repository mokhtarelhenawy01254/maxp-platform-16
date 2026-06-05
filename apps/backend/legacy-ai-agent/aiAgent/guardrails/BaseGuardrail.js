/**
 * Base class for guardrails. Follows OpenAI Agents SDK pattern.
 */
class GuardrailResult {
  constructor({ tripwireTriggered = false, outputInfo = {}, message = '' }) {
    this.tripwireTriggered = tripwireTriggered;
    this.outputInfo = outputInfo;
    this.message = message;
  }
}

class BaseGuardrail {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  async check(context, agent, input) {
    throw new Error('Guardrail check() must be implemented by subclass');
  }
}

module.exports = { BaseGuardrail, GuardrailResult };
