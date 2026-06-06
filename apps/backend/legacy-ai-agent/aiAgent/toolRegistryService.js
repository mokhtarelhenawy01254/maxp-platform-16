const { TOOLS, getToolMetadata, fromNativeToolName } = require('./agentToolRegistry');

function typeOfValue(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isFinite(value) && Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateValue(schema, value, path = 'input') {
  const errors = [];
  if (!schema) return errors;

  if (schema.type) {
    const actual = typeOfValue(value);
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.includes(actual) && !(expected.includes('number') && actual === 'integer')) {
      errors.push(`${path} must be ${expected.join(' or ')}`);
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path} must be <= ${schema.maximum}`);
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validateValue(schema.items, item, `${path}[${index}]`));
    });
  }

  return errors;
}

class ToolRegistryService {
  constructor() {
    this._cache = null;
  }

  loadRegistry({ force = false } = {}) {
    if (!this._cache || force) {
      const toolNames = Object.keys(TOOLS);
      const tools = toolNames.map(name => {
        const meta = getToolMetadata(name);
        const tool = TOOLS[name];
        return {
          name,
          description: meta.description,
          sideEffects: meta.sideEffects,
          requiresApproval: meta.requiresApproval,
          companyScoped: meta.companyScoped,
          inputSchema: tool.inputSchema || null,
          handler: meta.handler,
        };
      });
      this._cache = {
        version: '1.0.0',
        tools,
        byName: new Map(tools.map(tool => [tool.name, tool])),
      };
    }
    return this._cache;
  }

  listTools() {
    return this.loadRegistry().tools.map(tool => ({ ...tool }));
  }

  getTool(name) {
    const tool = this.loadRegistry().byName.get(name);
    return tool ? { ...tool } : null;
  }

  hasTool(name) {
    const cache = this.loadRegistry();
    if (cache.byName.has(name)) return true;
    const resolved = fromNativeToolName(name);
    return resolved !== name && cache.byName.has(resolved);
  }

  isWriteAction(name) {
    const tool = this.getTool(name);
    return tool?.sideEffects === 'write';
  }

  isReadOnly(name) {
    const tool = this.getTool(name);
    return tool?.sideEffects === 'read';
  }

  requiresApproval(name) {
    const tool = this.getTool(name);
    return Boolean(tool?.requiresApproval);
  }

  validateToolNames(toolNames = []) {
    const unknown = toolNames.filter(name => !this.hasTool(name));
    return {
      valid: unknown.length === 0,
      unknown,
    };
  }

  validateToolInput(name, input = {}) {
    const tool = this.getTool(name);
    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${name}`] };
    }

    const schema = tool.inputSchema || {};
    const errors = validateValue(schema, input, 'input');
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (input[key] === undefined || input[key] === null || input[key] === '') {
        errors.push(`input.${key} is required`);
      }
    }

    if (schema.properties && typeof input === 'object' && input !== null) {
      for (const [key, value] of Object.entries(input)) {
        const propertySchema = schema.properties[key];
        if (propertySchema) {
          errors.push(...validateValue(propertySchema, value, `input.${key}`));
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  _resetCache() {
    this._cache = null;
  }
}

module.exports = new ToolRegistryService();
module.exports._private = { validateValue, typeOfValue };
