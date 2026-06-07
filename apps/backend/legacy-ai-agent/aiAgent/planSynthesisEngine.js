/**
 * @module planSynthesisEngine
 * @description Merges outputs from multiple specialist agents into a single,
 * coherent plan. The CEOAgent uses this after consulting multiple agents to
 * produce a unified answer for the merchant.
 */

const aiRuntimeService = require('../aiRuntimeService');

const SYNTHESIS_MAX_TOKENS = 1500;
const VALIDATION_MAX_TOKENS = 500;

class PlanSynthesisEngine {
  constructor() {
    this._modelManager = null;
  }

  setModelManager(modelManager) {
    this._modelManager = modelManager;
  }

  /**
   * Takes an array of agent outputs and synthesizes them into one unified plan.
   *
   * @param {Object} params
   * @param {string} params.goal - The original merchant request
   * @param {Array<Object>} params.inputs - Array of { agentRole, agentName, output }
   * @param {Object} [params.constraints] - Optional constraints (budget, timeline, etc.)
   * @param {string} [params.companyId] - For audit context
   * @returns {Object} { plan, summary, completeness, agentInputs }
   */
  async synthesizePlan({ goal, inputs, constraints = {}, companyId = null }) {
    if (!this._modelManager) {
      throw new Error('MODEL_MANAGER_NOT_SET');
    }
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw new Error('INPUTS_REQUIRED');
    }

    const prompt = this._buildSynthesisPrompt(goal, inputs, constraints);

    const AIProviderFactory = require('./providers/AIProviderFactory');
    const modelManager = this._modelManager;

    const keyInfo = await modelManager.getNextKeySimple(companyId || 'system', {
      preferredModel: 'gemini-2.5-pro',
      estimatedTokens: 2000,
    });

    if (!keyInfo || keyInfo.error) {
      throw new Error(keyInfo?.error || 'NO_MODEL_KEY_AVAILABLE');
    }

    const provider = AIProviderFactory.getProvider(
      keyInfo.provider,
      keyInfo.apiKey,
      keyInfo.baseUrl,
      keyInfo.keyId
    );

    const result = await provider.generateResponse(prompt, {
      model: keyInfo.model,
      temperature: 0.2,
      max_tokens: SYNTHESIS_MAX_TOKENS,
      maxOutputTokens: SYNTHESIS_MAX_TOKENS,
    });

    const text = this._extractText(result);
    const parsed = this._parseSynthesisOutput(text);

    // Validate the synthesized plan
    const validation = await this._validatePlan(parsed, goal, inputs);

    return {
      plan: parsed.plan || text,
      summary: parsed.summary || '',
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      completeness: validation.completeness,
      gaps: validation.gaps || [],
      agentInputs: inputs.map(i => ({ role: i.agentRole, name: i.agentName })),
      modelUsed: keyInfo.model,
    };
  }

  /**
   * Validates whether a synthesized plan is complete and actionable.
   */
  async validatePlanCompleteness({ plan, goal, inputs }) {
    return this._validatePlan({ plan }, goal, inputs);
  }

  // --- Private helpers ---

  _buildSynthesisPrompt(goal, inputs, constraints) {
    const inputSections = inputs
      .map((input, index) => {
        const role = input.agentRole || 'UNKNOWN';
        const name = input.agentName || role;
        const output = typeof input.output === 'string'
          ? input.output
          : JSON.stringify(input.output, null, 2);
        return `## Input ${index + 1} (${role} - ${name}):\n${output}`;
      })
      .join('\n\n');

    const constraintText = Object.keys(constraints).length > 0
      ? `\nConstraints:\n${JSON.stringify(constraints, null, 2)}`
      : '';

    return [
      {
        role: 'system',
        content: `You are the CEO Agent synthesizing a unified business plan. You have received inputs from multiple specialist agents. Your job is to merge them into one coherent, actionable plan.`,
      },
      {
        role: 'user',
        content: `Goal: ${goal}\n\n${inputSections}\n${constraintText}\n\n---\n\nPlease produce a unified plan in the following JSON format:\n{\n  "plan": "The full detailed plan text in Arabic",\n  "summary": "A one-paragraph executive summary in Arabic",\n  "actionItems": [\n    { "owner": "SALES|MARKETING|INVENTORY|SUPPORT", "task": "...", "priority": "high|medium|low" }\n  ]\n}\n\nReturn valid JSON only.`,
      },
    ];
  }

  async _validatePlan(parsed, goal, inputs) {
    const expectedRoles = new Set(inputs.map(i => i.agentRole).filter(Boolean));
    const mentionedRoles = new Set();

    const planText = JSON.stringify(parsed);
    for (const role of expectedRoles) {
      if (planText.toLowerCase().includes(role.toLowerCase())) {
        mentionedRoles.add(role);
      }
    }

    const coverage = expectedRoles.size > 0
      ? mentionedRoles.size / expectedRoles.size
      : 1;

    const gaps = [];
    for (const role of expectedRoles) {
      if (!mentionedRoles.has(role)) {
        gaps.push(`Missing perspective from ${role}`);
      }
    }

    // Check if plan actually addresses the goal
    const goalKeywords = goal.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const goalCoverage = goalKeywords.length > 0
      ? goalKeywords.filter(k => planText.toLowerCase().includes(k)).length / goalKeywords.length
      : 1;

    const completeness = Math.round(((coverage + goalCoverage) / 2) * 100);

    return {
      completeness,
      coverage: Math.round(coverage * 100),
      goalCoverage: Math.round(goalCoverage * 100),
      gaps,
    };
  }

  _extractText(result) {
    if (!result) return '';
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;
    const candidateText = result.candidates?.[0]?.content?.parts?.find(
      part => typeof part.text === 'string'
    )?.text;
    return typeof candidateText === 'string' ? candidateText : '';
  }

  _parseSynthesisOutput(text) {
    if (!text) return { plan: '', summary: '', actionItems: [] };

    let jsonText = text.trim();
    if (jsonText.includes('```')) {
      const m = jsonText.match(/```(?:json)?([\s\S]+?)```/);
      if (m?.[1]) jsonText = m[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonText);
      return {
        plan: parsed.plan || parsed.planText || text,
        summary: parsed.summary || '',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch {
      return { plan: text, summary: '', actionItems: [] };
    }
  }
}

module.exports = new PlanSynthesisEngine();
