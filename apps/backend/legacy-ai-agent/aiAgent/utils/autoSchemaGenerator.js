/**
 * Auto-generates JSON Schema from JSDoc comments and function signatures.
 * Reduces boilerplate when registering tools.
 */

/**
 * Parse JSDoc @param tags to extract parameter info.
 * @param {Function} fn - The function to analyze
 * @returns {Object} JSON Schema for the function's parameters
 */
function generateSchemaFromFunction(fn) {
  const fnString = fn.toString();
  const schema = {
    type: 'object',
    properties: {},
    required: [],
  };

  // Extract parameter names from function signature. The first (...) in
  // the function string is the formal parameter list, so we anchor on it
  // and use only that substring for default detection.
  const paramMatch = fnString.match(/\(([^)]*)\)/);
  if (!paramMatch) return schema;
  const signature = paramMatch[0];

  const params = paramMatch[1]
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      // Handle destructuring: { companyId, params }
      if (p.startsWith('{')) {
        const inner = p.slice(1, -1).trim();
        return inner.split(',').map(sub => sub.trim().split('=')[0].trim());
      }
      // Handle defaults: companyId = 'default'
      return p.split('=')[0].trim();
    })
    .flat();

  // Parse JSDoc from function string (basic heuristic)
  const jsdocMatch = fnString.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdocMatch) {
    const jsdoc = jsdocMatch[1];

    // Extract @param tags. Supports [name] optional syntax.
    const paramRegex = /@param\s+\{([^}]+)\}\s+(\w+|\[\w+\])(?:\s+-\s+(.+))?/g;
    let match;
    while ((match = paramRegex.exec(jsdoc)) !== null) {
      const [, type, rawName, description] = match;
      const isOptional = rawName.startsWith('[') && rawName.endsWith(']');
      const name = isOptional ? rawName.slice(1, -1) : rawName;
      const jsonType = jsdocTypeToJsonSchema(type.trim());

      schema.properties[name] = {
        type: jsonType.type,
        description: (description && description.trim()) || `${name} (${type})`,
        ...(jsonType.enum ? { enum: jsonType.enum } : {}),
      };

      // Required only when JSDoc does not mark it optional AND signature has no default.
      // We check the formal parameter list only; checking the entire function
      // body would incorrectly match `const name = ...` assignments.
      if (!isOptional && !signature.includes(`${name} = `) && !signature.includes(`${name}=`)) {
        schema.required.push(name);
      }
    }
  }

  // Fallback: if no JSDoc found, infer from parameter names
  if (Object.keys(schema.properties).length === 0) {
    for (const param of params) {
      if (param === 'companyId') continue; // Internal parameter
      schema.properties[param] = {
        type: 'string',
        description: inferDescriptionFromName(param),
      };
      schema.required.push(param);
    }
  }

  return schema;
}

function jsdocTypeToJsonSchema(jsdocType) {
  const typeMap = {
    'string': { type: 'string' },
    'number': { type: 'number' },
    'boolean': { type: 'boolean' },
    'object': { type: 'object' },
    'array': { type: 'array' },
    'integer': { type: 'integer' },
    'Date': { type: 'string', format: 'date-time' },
    'string[]': { type: 'array', items: { type: 'string' } },
    'number[]': { type: 'array', items: { type: 'number' } },
  };

  // Handle enum types: {'SALES', 'SUPPORT', 'SHIPPING'}
  const enumMatch = jsdocType.match(/\{(.+)\}/);
  if (enumMatch) {
    const values = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
    return { type: 'string', enum: values };
  }

  // Handle union enum types without braces: 'PENDING'|'CONFIRMED'|'SHIPPED'|'DELIVERED'
  if (/^'[^']+'(\s*\|\s*'[^']+')+$/.test(jsdocType)) {
    const values = jsdocType.split('|').map(v => v.trim().replace(/['"]/g, ''));
    return { type: 'string', enum: values };
  }

  // Handle nullable: {?string}
  const nullableMatch = jsdocType.match(/^\?(.+)$/);
  if (nullableMatch) {
    const inner = jsdocTypeToJsonSchema(nullableMatch[1]);
    return { ...inner, nullable: true };
  }

  return typeMap[jsdocType] || { type: 'string' };
}

function inferDescriptionFromName(paramName) {
  const descriptions = {
    query: 'Search query or filter term',
    productId: 'Unique identifier for the product',
    customerId: 'Customer unique identifier',
    orderId: 'Order number or identifier',
    quantity: 'Number of items',
    price: 'Price amount in base currency',
    status: 'Current status value',
    city: 'City name for delivery/shipping',
    address: 'Delivery address',
    phone: 'Phone number',
    email: 'Email address',
    name: 'Full name or display name',
    limit: 'Maximum number of results',
    offset: 'Number of results to skip',
  };
  return descriptions[paramName] || `${paramName} value`;
}

/**
 * Generate tool registration object from a function.
 * Reduces boilerplate when creating tools.
 *
 * Produces an object that is structurally identical to the manually-defined
 * tool shape consumed by agentToolRegistry.js and toolOrchestratorService.js:
 *   { description, params, required, requiredParams, readOnly, sideEffects,
 *     requiresApproval, companyScoped, inputSchema, handler }
 *
 * `options` accepts:
 *   - description: override the JSDoc-derived description
 *   - readOnly: defaults to true
 *   - sideEffects: 'read' | 'write' (defaults from readOnly)
 *   - requiresApproval: boolean
 *   - companyScoped: boolean
 *   - inputSchema: full JSON Schema override (when finer constraints are needed)
 */
function createToolFromFunction(name, fn, options = {}) {
  const schema = generateSchemaFromFunction(fn);

  // Legacy `params` shape: { paramName: 'description string' }
  const paramsDescriptions = {};
  for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
    paramsDescriptions[paramName] = paramSchema.description || paramName;
  }

  const readOnly = options.readOnly !== false;
  const inputSchema = options.inputSchema || schema;

  return {
    name,
    description: options.description || extractDescriptionFromFunction(fn),
    params: paramsDescriptions,
    required: schema.required,
    ...(options.requiredParams ? { requiredParams: options.requiredParams } : {}),
    readOnly,
    sideEffects: options.sideEffects || (readOnly ? 'read' : 'write'),
    requiresApproval: options.requiresApproval === true,
    companyScoped: options.companyScoped === true,
    inputSchema,
    handler: fn,
  };
}

function extractDescriptionFromFunction(fn) {
  const fnString = fn.toString();
  const jsdocMatch = fnString.match(/\/\*\*([\s\S]*?)\*\//);
  if (jsdocMatch) {
    // Extract description (text before first @tag)
    const desc = jsdocMatch[1]
      .replace(/@\w+.*$/gm, '') // Remove @tags
      .replace(/\s*\*\s?/g, ' ') // Remove * prefixes
      .trim();
    return desc || `Execute ${fn.name}`;
  }
  return `Execute ${fn.name}`;
}

module.exports = {
  generateSchemaFromFunction,
  createToolFromFunction,
  jsdocTypeToJsonSchema,
};
