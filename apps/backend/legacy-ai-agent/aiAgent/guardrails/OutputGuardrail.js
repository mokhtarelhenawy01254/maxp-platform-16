const { BaseGuardrail, GuardrailResult } = require('./BaseGuardrail');

/**
 * Output guardrail: validates agent reply before sending to customer.
 */
class OutputGuardrail extends BaseGuardrail {
  constructor(name, checkFn, options = {}) {
    super(name, options);
    this.checkFn = checkFn;
  }

  async check(context, agent, output) {
    try {
      const result = await this.checkFn(context, agent, output);
      if (result instanceof GuardrailResult) return result;
      return new GuardrailResult({ tripwireTriggered: !!result.blocked, message: result.reason });
    } catch (error) {
      return new GuardrailResult({ tripwireTriggered: true, message: error.message });
    }
  }
}

// Built-in guardrails
const ToolNameExposureGuardrail = new OutputGuardrail(
  'tool_name_exposure',
  async (context, agent, output) => {
    // Detect if agent leaked internal tool names
    const toolNames = Array.from(agent.allowedTools || []);
    const leaked = toolNames.filter(t => output.includes(t) && !output.includes(`\`${t}\``));
    return { blocked: leaked.length > 0, reason: leaked.length > 0 ? 'Reply contains exposed tool names' : null };
  }
);

const ArabicLanguageGuardrail = new OutputGuardrail(
  'arabic_language',
  async (context, agent, output) => {
    // For Arabic-speaking agents, ensure reply is actually Arabic
    if (agent.persona?.language === 'arabic') {
      const arabicRatio = (output.match(/[\u0600-\u06FF]/g) || []).length / output.length;
      if (arabicRatio < 0.1 && output.length > 20) {
        return { blocked: false, reason: 'Low Arabic content ratio' }; // Warning only
      }
    }
    return { blocked: false };
  }
);

module.exports = { OutputGuardrail, ToolNameExposureGuardrail, ArabicLanguageGuardrail };
