const { BaseGuardrail, GuardrailResult } = require('./BaseGuardrail');

/**
 * Input guardrail: validates customer message before agent processes it.
 */
class InputGuardrail extends BaseGuardrail {
  constructor(name, checkFn, options = {}) {
    super(name, options);
    this.checkFn = checkFn;
  }

  async check(context, agent, input) {
    try {
      const result = await this.checkFn(context, agent, input);
      if (result instanceof GuardrailResult) return result;
      return new GuardrailResult({ tripwireTriggered: !!result.blocked, message: result.reason });
    } catch (error) {
      return new GuardrailResult({ tripwireTriggered: true, message: error.message });
    }
  }
}

// Built-in guardrails
const SensitiveDataGuardrail = new InputGuardrail(
  'sensitive_data',
  async (context, agent, input) => {
    // Detect if input contains sensitive patterns (credit cards, passwords, etc.)
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /password[:\s]\S+/i, // Password
    ];
    const hasSensitive = sensitivePatterns.some(p => p.test(input));
    return { blocked: hasSensitive, reason: hasSensitive ? 'Input contains sensitive data' : null };
  }
);

const PromptInjectionGuardrail = new InputGuardrail(
  'prompt_injection',
  async (context, agent, input) => {
    const injectionPatterns = [
      /ignore previous instructions/i,
      /you are now .* instead/i,
      /system prompt:/i,
      /\[INST\].*\[\/INST\]/i,
    ];
    const isInjection = injectionPatterns.some(p => p.test(input));
    return { blocked: isInjection, reason: isInjection ? 'Potential prompt injection detected' : null };
  }
);

module.exports = { InputGuardrail, SensitiveDataGuardrail, PromptInjectionGuardrail };
