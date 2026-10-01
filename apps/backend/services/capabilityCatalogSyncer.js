const { getSharedPrismaClient } = require('./sharedDatabase');
const { credentialHasScope } = require('./taskIntegrationService');

// In-memory cache for catalog to eliminate constant database round-trips
let cachedCatalog = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch catalog rows from PostgreSQL schema `ai.agent_tool_catalog`
 */
async function getRawCatalogRows() {
  const now = Date.now();
  if (cachedCatalog && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const prisma = getSharedPrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT name, domain, description_en, usage_hint_ar, endpoint, http_method,
             permission_key, app_slug, risk_level, exposure_state, roles, source,
             catalog_metadata, updated_at
      FROM ai.agent_tool_catalog
      ORDER BY domain ASC, name ASC
    `;

    cachedCatalog = rows;
    cacheTimestamp = now;
    return rows;
  } catch (error) {
    console.error('⚠️ [CAPABILITY-SYNCER] Failed to load ai.agent_tool_catalog:', error.message);
    if (cachedCatalog) return cachedCatalog; // Return stale cache if available
    return [];
  }
}

/**
 * Invalidate in-memory cache
 */
function invalidateCatalogCache() {
  cachedCatalog = null;
  cacheTimestamp = 0;
}

/**
 * Map a raw catalog row to a unified Super Admin capability with policy applied:
 * - Reads are auto-activated (exposure_state: active).
 * - Writes require approval (draft unless explicitly active in DB).
 */
function mapCatalogRow(row) {
  const domain = String(row.domain || 'general').trim().toLowerCase();
  const domainSlug = domain.replace(/_/g, '-');
  const isRead = row.risk_level === 'read';
  const action = isRead ? 'read' : 'write';
  const requiredScope = `admin:${domainSlug}:${action}`;

  // Approved Policy: Reads are auto-activated; Writes require review/approval
  let effectiveStatus = row.exposure_state || 'draft';
  if (isRead) {
    effectiveStatus = 'active'; // Policy: reads auto-activate
  }

  const httpMethod = row.http_method || (isRead ? 'GET' : 'POST');
  const endpoint = row.endpoint || `/api/v1/admin-api/${domainSlug}`;

  return {
    name: row.name,
    domain,
    domainSlug,
    description: row.description_en || row.usage_hint_ar || `Super Admin ${action} capability for ${domain}`,
    descriptionAr: row.usage_hint_ar || null,
    riskLevel: row.risk_level || (isRead ? 'read' : 'write'),
    exposureState: row.exposure_state || 'draft',
    effectiveStatus,
    endpoint,
    httpMethod,
    requiredScope,
    permissionKey: row.permission_key || null,
    source: row.source || 'system',
    updatedAt: row.updated_at
  };
}

/**
 * Retrieve enriched capabilities for the requesting API key
 */
async function getCapabilities(credential = null, filter = {}) {
  const rawRows = await getRawCatalogRows();
  const capabilities = rawRows.map(mapCatalogRow);

  const {
    domain,
    riskLevel,
    search,
    authorizedOnly,
    exposureState
  } = filter;

  let filtered = capabilities;

  if (domain) {
    const qDomain = String(domain).trim().toLowerCase();
    filtered = filtered.filter((c) => c.domain === qDomain || c.domainSlug === qDomain);
  }

  if (riskLevel) {
    const qRisk = String(riskLevel).trim().toLowerCase();
    filtered = filtered.filter((c) => c.riskLevel === qRisk);
  }

  if (exposureState) {
    const qExp = String(exposureState).trim().toLowerCase();
    filtered = filtered.filter((c) => c.exposureState === qExp || c.effectiveStatus === qExp);
  }

  if (search) {
    const q = String(search).trim().toLowerCase();
    filtered = filtered.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.requiredScope.toLowerCase().includes(q)
    );
  }

  const enriched = filtered.map((cap) => {
    const authorized = credential ? credentialHasScope(credential, cap.requiredScope) : false;
    return {
      ...cap,
      authorized
    };
  });

  const finalResults = (authorizedOnly === 'true' || authorizedOnly === true)
    ? enriched.filter((c) => c.authorized)
    : enriched;

  const totalReads = capabilities.filter((c) => c.riskLevel === 'read').length;
  const totalWrites = capabilities.filter((c) => c.riskLevel !== 'read').length;
  const totalActive = capabilities.filter((c) => c.effectiveStatus === 'active').length;
  const authorizedCount = enriched.filter((c) => c.authorized).length;

  return {
    capabilities: finalResults,
    meta: {
      total: capabilities.length,
      returned: finalResults.length,
      totalActive,
      totalReads,
      totalWrites,
      authorizedCount,
      callerScopes: credential?.scopes || []
    }
  };
}

/**
 * Generate OpenAPI 3.0.3 Specification dynamically from catalog
 */
async function generateOpenApiSpec() {
  const rawRows = await getRawCatalogRows();
  const capabilities = rawRows.map(mapCatalogRow);

  const domainsSet = new Set(capabilities.map((c) => c.domain));
  const domains = Array.from(domainsSet).sort();

  // Core spec domains defined in spec-v3
  const coreDomains = [
    { name: 'analytics', desc: 'Platform analytics, orders revenue, customer acquisition, conversion metrics' },
    { name: 'orders', desc: 'Order aggregation, order status distribution, revenue by status (0 PII)' },
    { name: 'products', desc: 'Product inventory stats, top selling products, pricing telemetry' },
    { name: 'customers', desc: 'Customer volume aggregations, retention cohorts, loyalty tiers (0 PII)' },
    { name: 'subscriptions', desc: 'Platform tenant subscriptions, MRR estimate, active subscriber plans' },
    { name: 'billing', desc: 'Platform invoices, paid vs pending invoice amounts, payment gateways' },
    { name: 'revenue', desc: 'Detailed financial revenue reporting, gross/net revenue trends' },
    { name: 'marketplace', desc: 'Marketplace apps inventory, tenant app installation telemetry' },
    { name: 'support', desc: 'Support tickets volume, status breakdown, category distribution (0 PII)' },
    { name: 'ai-usage', desc: 'AI token utilization, model execution metrics, agent telemetry' },
    { name: 'logs', desc: 'System activity logs, error rate telemetry, incident history' },
    { name: 'users', desc: 'Platform user counts, role distribution, active account status (0 PII)' },
    { name: 'tenants', desc: 'Registered tenant companies, subscription tier, tenant statuses' },
    { name: 'coupons', desc: 'Promotional coupons, discount types, redemption statistics' },
    { name: 'landing', desc: 'Landing pages catalog, visit volume, conversion metrics' },
    { name: 'partners', desc: 'Affiliates and partners network, commissions paid, merchant tiers' },
    { name: 'settings', desc: 'Platform system flags, active modules, maintenance configuration' },
    { name: 'audit', desc: 'Immutable API audit log querying with timestamp and status filtering' }
  ];

  const tags = [
    { name: 'System & Introspection', description: 'API health, documentation, capabilities matrix, and audit logs' },
    ...coreDomains.map((d) => ({ name: d.name, description: d.desc }))
  ];

  const paths = {
    '/docs': {
      get: {
        tags: ['System & Introspection'],
        summary: 'Interactive API Documentation',
        description: 'Returns structured JSON or human-friendly UI documentation generated dynamically from capability catalog.',
        responses: {
          '200': { description: 'Documentation retrieved successfully' }
        }
      }
    },
    '/openapi.json': {
      get: {
        tags: ['System & Introspection'],
        summary: 'OpenAPI 3.0.3 Specification',
        description: 'Auto-generated OpenAPI JSON contract representing the complete Super Admin API surface.',
        responses: {
          '200': { description: 'Valid OpenAPI JSON document' }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System & Introspection'],
        summary: 'API Health & Key Telemetry',
        description: 'Operational health status, total requests, error rates, and per-key usage stats.',
        responses: {
          '200': { description: 'API is healthy' }
        }
      }
    },
    '/capabilities': {
      get: {
        tags: ['System & Introspection'],
        summary: 'Capability Catalog Matrix',
        description: 'Lists all available platform capabilities, exposure states, and required scopes evaluated for your API key.',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'domain', in: 'query', schema: { type: 'string' }, description: 'Filter by domain name' },
          { name: 'riskLevel', in: 'query', schema: { type: 'string', enum: ['read', 'write'] }, description: 'Filter by risk level' },
          { name: 'authorizedOnly', in: 'query', schema: { type: 'boolean' }, description: 'Return only capabilities authorized for this key' }
        ],
        responses: {
          '200': { description: 'Capabilities retrieved successfully' },
          '401': { description: 'Missing or invalid API key' }
        }
      }
    },
    '/audit': {
      get: {
        tags: ['System & Introspection'],
        summary: 'External API Audit Logs',
        description: 'Query immutable audit records for external API requests.',
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'keyId', in: 'query', schema: { type: 'string' }, description: 'Filter by credential ID' },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Start date filter' },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'End date filter' },
          { name: 'statusCode', in: 'query', schema: { type: 'integer' }, description: 'Filter by HTTP status code' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Page size (1-200)' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' }
        ],
        responses: {
          '200': { description: 'Filtered audit logs' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Missing admin:audit:read scope' }
        }
      }
    }
  };

  // Add paths for the 17 core read domains
  for (const domain of coreDomains) {
    if (domain.name === 'audit') continue; // Handled above
    const pathKey = `/${domain.name}`;
    const requiredScope = `admin:${domain.name}:read`;

    paths[pathKey] = {
      get: {
        tags: [domain.name],
        summary: `Read ${domain.name} domain data`,
        description: `${domain.desc}. Strict zero individual PII policy enforced.`,
        security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Date range start' },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Date range end' },
          { name: 'companyId', in: 'query', schema: { type: 'string' }, description: 'Target company ID (platform keys only)' }
        ],
        responses: {
          '200': { description: `Data for ${domain.name}` },
          '401': { description: 'Unauthorized' },
          '403': { description: `Forbidden - Requires scope ${requiredScope}` }
        }
      }
    };
  }

  // Add dynamic endpoint for any catalog domain: /{domain}
  paths['/{domain}'] = {
    get: {
      tags: ['System & Introspection'],
      summary: 'Dynamic Domain Data Dispatcher',
      description: 'Dynamic read endpoint for any domain registered in the Capability Catalog. Checks scope admin:<domain>:read.',
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
      parameters: [
        { name: 'domain', in: 'path', required: true, schema: { type: 'string' }, description: 'Domain slug' }
      ],
      responses: {
        '200': { description: 'Domain capabilities and summary' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden - Missing domain read scope' }
      }
    },
    post: {
      tags: ['System & Introspection'],
      summary: 'Unified Domain Action Dispatcher (Write / Dry-Run)',
      description: 'Executes or dry-runs write action for a domain. Requires scope admin:<domain>:write and idempotencyKey.',
      security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
      parameters: [
        { name: 'domain', in: 'path', required: true, schema: { type: 'string' } }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['idempotencyKey'],
              properties: {
                action: { type: 'string', description: 'Action name' },
                dryRun: { type: 'boolean', default: true, description: 'Simulate without writing' },
                idempotencyKey: { type: 'string', description: 'Unique idempotency key' },
                payload: { type: 'object', description: 'Action payload' }
              }
            }
          }
        }
      },
      responses: {
        '200': { description: 'Action result or dry-run diff' },
        '202': { description: 'High-risk action requires human approval' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Forbidden - Missing write scope' }
      }
    }
  };

  return {
    openapi: '3.0.3',
    info: {
      title: 'MaxP Super Admin API',
      version: '3.0.0',
      description: 'Full-spectrum Super Admin API for autonomous manager bots and operational tools. Powered by capability catalog auto-generation, strict zero-PII redaction, and hierarchical scope security.',
      contact: {
        name: 'MaxP Platform Operations',
        url: 'https://maxp.online'
      }
    },
    servers: [
      {
        url: '/api/v1/admin-api',
        description: 'Super Admin Gateway'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'MaxP external API key (format: ext_...)'
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API-Key',
          description: 'MaxP external API key via Bearer token'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        },
        StandardMeta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            companyId: { type: 'string' },
            rateLimitRemaining: { type: 'integer' }
          }
        }
      }
    },
    tags,
    paths
  };
}

module.exports = {
  getCapabilities,
  generateOpenApiSpec,
  getRawCatalogRows,
  invalidateCatalogCache,
  mapCatalogRow
};
