/**
 * @module agentManagerService
 * @description Paperclip-style manager facade for hiring, delegation, inbox,
 * and company agent state.
 */

const CEOAgent = require('./CEOAgent');
const agentProvisioningService = require('./agentProvisioningService');
const agentInboxService = require('./agentInboxService');
const agentAuditTrailService = require('./agentAuditTrailService');
const agentProfileLoaderService = require('./agentProfileLoaderService');
const toolRegistryService = require('./toolRegistryService');
const skillRegistryService = require('./skillRegistryService');
const aiRuntimeService = require('../aiRuntimeService');
const { getSharedPrismaClient } = require('../sharedDatabase');
const { t } = require('./i18n');

const FACEBOOK_MESSENGER_AGENT_ROLE = 'FACEBOOK_SALES_SUPPORT';
const FACEBOOK_MESSENGER_AGENT_TEMPLATE = 'facebook-sales-support-agent';
const FACEBOOK_MESSENGER_AGENT_NAME = t('agent.facebook_messenger_name');

const MANAGER_TYPES = {
  CEO: 'CEO',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  AGENT: 'AGENT',
};

const DEFAULT_AGENT_DEPARTMENTS = [
  { key: 'executive', name: 'Executive', description: 'CEO and agent coordination', icon: '👑', sortOrder: 1 },
  { key: 'sales', name: 'Sales', description: 'Customer sales and order drafts', icon: '💼', sortOrder: 10 },
  { key: 'support', name: 'Support', description: 'Customer service and order follow-up', icon: '🎧', sortOrder: 20 },
  { key: 'inventory', name: 'Inventory & Pricing', description: 'Stock, prices and products', icon: '📦', sortOrder: 30 },
  { key: 'marketing', name: 'Marketing', description: 'Campaigns and advertisements', icon: '📣', sortOrder: 40 },
  { key: 'messenger', name: 'Facebook & Messenger', description: 'Facebook Messenger replies and social channel sales', icon: '💬', sortOrder: 50 },
  { key: 'operations', name: 'Operations', description: 'Shipping, operations and follow-up', icon: '⚙️', sortOrder: 60 },
];

// ── Global template agents: auto-provisioned for every company ───────────────
const GLOBAL_TEMPLATE_AGENTS = [
  { slug: 'sales-agent',                  role: 'SALES',                   name: 'Sales Agent',             icon: '💼', description: 'Specialized agent for sales, order drafts and customer service.' },
  { slug: 'support-agent',                role: 'SUPPORT',                 name: 'Support Agent',           icon: '🎧', description: 'Specialized agent for customer service, order and shipping follow-up.' },
  { slug: 'inventory-pricing-agent',      role: 'INVENTORY',               name: 'Inventory & Pricing Agent',      icon: '📦', description: 'Specialized agent for inventory management, pricing and products.' },
  { slug: 'marketing-agent',              role: 'MARKETING',               name: 'Marketing Agent',               icon: '📣', description: 'Specialized agent for marketing campaigns and advertisements.' },
  { slug: 'facebook-sales-support-agent', role: 'FACEBOOK_SALES_SUPPORT',  name: FACEBOOK_MESSENGER_AGENT_NAME,         icon: '💬', description: 'Specialized agent for Facebook Messenger customer replies and social channel sales.' },
  { slug: 'sas-sales-agent',              role: 'SAS_SALES',               name: 'Facebook & Google Sheets Agent', icon: '📊', description: 'Specialized sales agent integrated with Google Sheets for Facebook Messenger customer replies.' },
];

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

function departmentKeyForRole(role = '') {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === 'CEO' || normalized === 'MANAGER') return 'executive';
  if (normalized === 'SALES' || normalized === 'SAS_SALES') return 'sales';
  if (normalized === 'SUPPORT') return 'support';
  if (normalized === 'INVENTORY' || normalized === 'PRICING') return 'inventory';
  if (normalized === 'MARKETING') return 'marketing';
  if (normalized === 'FACEBOOK' || normalized === 'MESSENGER' || normalized === FACEBOOK_MESSENGER_AGENT_ROLE) return 'messenger';
  if (normalized === 'SHIPPING') return 'operations';
  return 'operations';
}

function managerTypeForRole(role = '', parentId = null) {
  const normalized = String(role || '').trim().toUpperCase();
  if (normalized === 'CEO' || normalized === 'MANAGER') return MANAGER_TYPES.CEO;
  if (!parentId) return MANAGER_TYPES.DEPARTMENT_MANAGER;
  return MANAGER_TYPES.AGENT;
}

const DEPARTMENT_ROLE_MAP = {
  executive: ['CEO', 'MANAGER'],
  sales: ['SALES', 'SAS_SALES'],
  support: ['SUPPORT'],
  inventory: ['INVENTORY', 'PRICING'],
  marketing: ['MARKETING'],
  messenger: ['FACEBOOK', 'MESSENGER', FACEBOOK_MESSENGER_AGENT_ROLE],
  operations: ['SHIPPING'],
};

// ── Tables are managed by Prisma migrations; this is now a no-op guard. ──────
let _agentTablesReady = true;

async function ensureAgentTables() {
  // Tables (agent_definitions, company_agents, agent_departments) are created
  // by Prisma migrations. No raw SQL auto-migration needed.
  return;
}

// ── DB hydration: loads persisted agents into memory after server restart ─────
const _hydratedCompanies = new Set();

// ── Global template agents: tracks companies that already have templates ensured
const _globalTemplatesEnsured = new Set();

async function hydrateCompanyAgentsFromDB(companyId) {
  if (_hydratedCompanies.has(companyId)) return;
  _hydratedCompanies.add(companyId);

  try {
    const prisma = getSharedPrismaClient();
    const dbAgents = await prisma.companyAgent.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
    });

    for (const dbAgent of (dbAgents || [])) {
      if (agentProvisioningService.getAgent(companyId, dbAgent.id)) continue;
      agentProvisioningService._restoreAgent(companyId, {
        id: dbAgent.id,
        name: dbAgent.name,
        role: dbAgent.role,
        model: dbAgent.model,
        templateSlug: dbAgent.templateSlug,
        parentId: dbAgent.parentId,
        allowedSkills: safeJsonParse(dbAgent.skills, null),
        soul: dbAgent.soul,
        status: dbAgent.status,
      });
    }
  } catch (e) {
    _hydratedCompanies.delete(companyId);
    console.error('[AGENT-MANAGER] DB hydration failed for company', companyId, ':', e.message);
  }
}

async function loadAgentDefinitionTemplate(role) {
  try {
    const prisma = getSharedPrismaClient();
    const def = await prisma.agentDefinition.findUnique({
      where: { type: String(role || '').toLowerCase() },
    }).catch(() => null);
    if (!def?.settings) return {};
    return safeJsonParse(def.settings, {});
  } catch { return {}; }
}

async function ensureDefaultAgentDepartments(companyId) {
  if (!companyId) return [];
  const prisma = getSharedPrismaClient();

  // Verify the company exists to avoid foreign key violations
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    console.warn('[AGENT-MANAGER] Company not found for ensureDefaultAgentDepartments:', companyId);
    return [];
  }

  // Bulk create default departments, skipping duplicates if they already exist
  await prisma.agentDepartment.createMany({
    data: DEFAULT_AGENT_DEPARTMENTS.map(dept => ({
      id: `agent_dept_${companyId.slice(-6)}_${dept.key}`,
      companyId,
      key: dept.key,
      name: dept.name,
      description: dept.description || null,
      icon: dept.icon || '🤖',
      sortOrder: Number(dept.sortOrder) || 100,
    })),
    skipDuplicates: true,
  });

  // Fetch departments for this company
  const departments = await prisma.agentDepartment.findMany({
    where: { companyId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const departmentsByKey = new Map(departments.map(dept => [dept.key, dept]));

  // Update agents with department/manager type via Prisma API
  for (const [key, roles] of Object.entries(DEPARTMENT_ROLE_MAP)) {
    const departmentId = departmentsByKey.get(key)?.id;
    if (!departmentId || !roles.length) continue;
    const upperRoles = roles.map(r => r.toUpperCase());

    const agentsToUpdate = await prisma.companyAgent.findMany({
      where: {
        companyId,
        role: { in: upperRoles },
        OR: [
          { departmentId: null },
          { managerType: null },
          { managerType: '' },
        ],
      },
    });

    for (const agent of agentsToUpdate) {
      const managerType =
        ['CEO', 'MANAGER'].includes(agent.role?.toUpperCase())
          ? MANAGER_TYPES.CEO
          : (!agent.parentId ? MANAGER_TYPES.DEPARTMENT_MANAGER : MANAGER_TYPES.AGENT);
      await prisma.companyAgent.update({
        where: { id: agent.id },
        data: {
          departmentId: agent.departmentId || departmentId,
          managerType: agent.managerType || managerType,
          updatedAt: new Date(),
        },
      });
    }
  }

  // Fallback: assign remaining agents to operations department
  const opsDepartment = departmentsByKey.get('operations');
  const remainingAgents = await prisma.companyAgent.findMany({
    where: {
      companyId,
      departmentId: null,
    },
  });
  for (const agent of remainingAgents) {
    const managerType =
      ['CEO', 'MANAGER'].includes(agent.role?.toUpperCase())
        ? MANAGER_TYPES.CEO
        : (!agent.parentId ? MANAGER_TYPES.DEPARTMENT_MANAGER : MANAGER_TYPES.AGENT);
    await prisma.companyAgent.update({
      where: { id: agent.id },
      data: {
        departmentId: agent.departmentId || opsDepartment?.id || null,
        managerType: agent.managerType || managerType,
        updatedAt: new Date(),
      },
    });
  }

  return departments;
}

async function getDepartmentIdForRole(companyId, role) {
  const departments = await ensureDefaultAgentDepartments(companyId);
  const key = departmentKeyForRole(role);
  return departments.find(dept => dept.key === key)?.id || null;
}

// ── Global template agent provisioning ───────────────────────────────────────
async function ensureGlobalTemplateAgents(companyId) {
  if (!companyId) return;
  if (_globalTemplatesEnsured.has(companyId)) return;
  _globalTemplatesEnsured.add(companyId);

  try {
    const prisma = getSharedPrismaClient();
    // Get existing agents for this company to avoid duplicates
    const existingAgents = await prisma.companyAgent.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      select: { templateSlug: true, role: true },
    });
    const existingSlugs = new Set(existingAgents.map(a => a.templateSlug).filter(Boolean));
    const existingRoles = new Set(existingAgents.map(a => a.role).filter(Boolean));

    // Get the CEO/manager agent to use as parentId
    let managerId = null;
    const ceoAgent = agentProvisioningService.listAgents(companyId)
      .find(agent => agent.role === 'CEO');
    managerId = ceoAgent?.id || null;

    for (const template of GLOBAL_TEMPLATE_AGENTS) {
      // Skip if this template or role already exists for the company
      if (existingSlugs.has(template.slug) || existingRoles.has(template.role)) {
        continue;
      }

      try {
        // Load the profile from disk to get soul/rules/skills
        const profile = agentProfileLoaderService.loadProfile(template.slug);

        // Spawn in memory
        const agent = await agentProvisioningService.spawn(companyId, {
          name: template.name,
          role: template.role,
          templateSlug: template.slug,
          parentId: managerId,
        });

        // Persist to DB with full profile data
        const departmentId = await getDepartmentIdForRole(companyId, template.role);
        await persistCompanyAgent(companyId, agent, {
          soul: profile.instructions?.soul || '',
          rules: [],
          skills: agent.getSkills ? agent.getSkills() : profile.allowedSkills || [],
          createdBy: 'system_global_template',
          description: template.description || '',
          icon: template.icon || '🤖',
          departmentId,
          managerType: MANAGER_TYPES.DEPARTMENT_MANAGER,
        });

        console.log(`[AGENT-MANAGER] Auto-provisioned global template agent: ${template.name} (${template.slug}) for company ${companyId}`);
      } catch (err) {
        // Non-blocking: one agent failure should not prevent others
        console.warn(`[AGENT-MANAGER] Failed to auto-provision template ${template.slug} for company ${companyId}:`, err.message);
      }
    }
  } catch (err) {
    _globalTemplatesEnsured.delete(companyId);
    console.error('[AGENT-MANAGER] Global template provisioning failed for company', companyId, ':', err.message);
  }
}

async function persistCompanyAgent(companyId, agent, { soul, rules, skills, createdBy, description, icon, departmentId, managerType } = {}) {
  const prisma = getSharedPrismaClient();
  const persistedSkills = Array.isArray(skills)
    ? skills
    : (agent.getSkills ? agent.getSkills() : []);
  const resolvedDepartmentId = departmentId || await getDepartmentIdForRole(companyId, agent.role);
  const resolvedManagerType = managerType || managerTypeForRole(agent.role, agent.parentId);
  const templateSlugValue = agent.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(agent.role) || String(agent.role || '').toLowerCase();

  const row = await prisma.companyAgent.upsert({
    where: { id: agent.id },
    create: {
      id: agent.id,
      companyId,
      name: agent.name,
      role: agent.role,
      description: description || '',
      icon: icon || '🤖',
      soul: soul || null,
      rules: Array.isArray(rules) ? JSON.stringify(rules) : null,
      skills: JSON.stringify(persistedSkills),
      model: agent.model || null,
      status: agent.status || 'ACTIVE',
      parentId: agent.parentId || null,
      departmentId: resolvedDepartmentId || null,
      managerType: resolvedManagerType || MANAGER_TYPES.AGENT,
      templateSlug: templateSlugValue,
      createdBy: createdBy || 'ceo_agent',
    },
    update: {
      name: agent.name,
      role: agent.role,
      description: description || undefined,
      icon: icon || undefined,
      soul: soul || null,
      rules: Array.isArray(rules) ? JSON.stringify(rules) : null,
      skills: JSON.stringify(persistedSkills),
      model: agent.model || null,
      templateSlug: templateSlugValue,
      status: agent.status || 'ACTIVE',
      departmentId: resolvedDepartmentId || undefined,
      managerType: resolvedManagerType || undefined,
      ...(createdBy ? { createdBy } : {}),
      updatedAt: new Date(),
    },
  });

  // Verify persistence
  const verified = await prisma.companyAgent.findFirst({
    where: { id: agent.id, companyId },
  });
  if (!verified) {
    throw new Error(`AGENT_PERSIST_VERIFY_FAILED:${agent.id}`);
  }

  return row;
}

async function companyHasConnectedFacebookPage(companyId) {
  try {
    const prisma = getSharedPrismaClient();
    if (!prisma.facebookPage?.findFirst) return false;
    const page = await prisma.facebookPage.findFirst({
      where: {
        companyId,
        status: { not: 'disconnected' },
      },
      select: { id: true },
    });
    return Boolean(page);
  } catch {
    return false;
  }
}

function normalizeTaskText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}_\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAgentIdentity(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}_\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAgentLookupKeys(value = '') {
  const normalized = normalizeAgentIdentity(value);
  if (!normalized) return [];
  const withoutGenericAgentPrefix = normalized
    .replace(/^(?:ال)?(?:وكيل|ايجنت|agent)\s+/iu, '')
    .trim();
  return [...new Set([normalized, withoutGenericAgentPrefix].filter(Boolean))];
}

function pickUniqueAgent(matches = [], requestedRole = '') {
  const role = String(requestedRole || '').trim().toUpperCase();
  const scoped = role
    ? matches.filter(agent => String(agent.role || '').trim().toUpperCase() === role)
    : matches;
  const unique = [...new Map(scoped.map(agent => [agent.id, agent])).values()];
  return unique.length === 1 ? unique[0] : null;
}

function findAgentForTask(companyId, request = {}) {
  if (request.agentId) {
    const byId = agentProvisioningService.getAgent(companyId, request.agentId);
    if (byId) return byId;
  }

  const activeAgents = agentProvisioningService.listAgents(companyId)
    .filter(agent => agent.status === 'ACTIVE');
  const requestedNameKeys = buildAgentLookupKeys(request.agentName);

  if (requestedNameKeys.length > 0) {
    const exactMatches = activeAgents.filter(agent => {
      const agentKeys = buildAgentLookupKeys(agent.name);
      const idKey = normalizeAgentIdentity(agent.id);
      return requestedNameKeys.includes(idKey)
        || requestedNameKeys.some(key => agentKeys.includes(key));
    });
    const exact = pickUniqueAgent(exactMatches, request.agentRole);
    if (exact) return exact;

    const fuzzyMatches = activeAgents.filter(agent => {
      const agentKeys = buildAgentLookupKeys(agent.name);
      return requestedNameKeys.some(requestKey => (
        requestKey.length >= 4
        && agentKeys.some(agentKey => (
          agentKey.length >= 4
          && (agentKey.includes(requestKey) || requestKey.includes(agentKey))
        ))
      ));
    });
    const fuzzy = pickUniqueAgent(fuzzyMatches, request.agentRole);
    if (fuzzy) return fuzzy;
  }

  if (request.agentRole) {
    const requestedRole = String(request.agentRole || '').trim().toUpperCase();
    return activeAgents.find(item => item.role === requestedRole) || null;
  }

  return null;
}

function taskRequiresProductCreateTool(task = '') {
  const text = normalizeTaskText(task);
  if (taskRequiresOrderCreateDraftTool(task)) return false;
  const explicitProduct = [
    'نضيف منتج', 'ضيف منتج', 'اضيف منتج', 'اضافه منتج',
    'منتج جديد', 'اعمل منتج', 'انشئ منتج', 'اخلق منتج',
    'create product', 'add product', 'new product',
  ].some((needle) => text.includes(normalizeTaskText(needle)));
  const addAction = ['نضيف', 'ضيف', 'اضيف', 'اعمل', 'انشئ', 'create', 'add']
    .some((needle) => text.includes(normalizeTaskText(needle)));
  const productKind = ['منتج', 'كوتشي', 'جزمه', 'حذاء', 'شنطه', 'فستان', 'product', 'shoe', 'sneaker']
    .some((needle) => text.includes(normalizeTaskText(needle)));
  return explicitProduct || (addAction && productKind);
}

function taskRequiresOrderCreateDraftTool(task = '') {
  const text = normalizeTaskText(task);
  const explicitOrderDraft = [
    'اعمل اوردر', 'اعمللي اوردر', 'اعملي اوردر', 'اعمل طلب',
    'انشئ اوردر', 'انشئ طلب', 'جهز اوردر', 'جهز طلب',
    'مسوده اوردر', 'مسودة اوردر', 'مسوده طلب', 'مسودة طلب',
    'create order', 'draft order', 'order.create_draft',
  ].some((needle) => text.includes(normalizeTaskText(needle)));
  const createAction = ['اعمل', 'انشئ', 'جهز', 'اكد', 'create', 'draft']
    .some((needle) => text.includes(normalizeTaskText(needle)));
  const orderKind = ['اوردر', 'طلب', 'order']
    .some((needle) => text.includes(normalizeTaskText(needle)));
  return explicitOrderDraft || (createAction && orderKind);
}

function extractRangeList(text = '', labelPattern = '') {
  const label = new RegExp(`${labelPattern}[^\\d\\p{L}]*(?:من\\s*)?(\\d+)\\s*(?:ل|الى|إلى|-)\\s*(\\d+)`, 'iu');
  const match = String(text || '').match(label);
  if (!match) return [];
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || end - start > 50) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function extractCommaListAfter(text = '', labelPattern = '') {
  const match = String(text || '').match(new RegExp(`${labelPattern}\\s+([^\\n.،]+(?:[،,]\\s*[^\\n.،]+)*)`, 'iu'));
  if (!match) return [];
  return match[1]
    .split(/[،,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function extractProductCreateParams(task = '') {
  const raw = String(task || '');
  const priceMatch = raw.match(/(?:السعر|سعره|بسعر|price)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  const nameMatch = raw.match(/(?:اسمه|اسمها|اسم المنتج|product name)\s+(.+?)(?=\s+(?:المقاسات|مقاساته|مقاساتها|الوانه|ألوانه|الوانها|ألوانها|السعر|سعره|بسعر|وحط|وصف|$))/iu);
  const fallbackName = raw.match(/(?:نضيف|ضيف|اضيف|اعمل|انشئ)\s+(.+?)(?=\s+(?:المقاسات|مقاساته|مقاساتها|الوانه|ألوانه|الوانها|ألوانها|السعر|سعره|بسعر|وحط|وصف|$))/iu);
  const name = (nameMatch?.[1] || fallbackName?.[1] || '').trim();
  const colors = extractCommaListAfter(raw, '(?:الوانه|ألوانه|الوانها|ألوانها|الالوان|الألوان)');
  const sizeRange = extractRangeList(raw, '(?:المقاسات|مقاساته|مقاساتها|مقاسات)');
  const sizes = sizeRange.length > 0
    ? sizeRange
    : extractCommaListAfter(raw, '(?:المقاسات|مقاساته|مقاساتها|مقاسات)');

  return {
    name,
    price: priceMatch ? Number(String(priceMatch[1]).replace(',', '.')) : undefined,
    colors,
    sizes,
    description: /وصف من عندك|حط وصف من عندك/i.test(raw) ? '' : undefined,
    tags: ['ai-agent-draft'],
  };
}

function normalizeNumberText(value = '') {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(',', '.');
}

function extractNumber(value = '') {
  const match = normalizeNumberText(value).match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanCustomerName(value = '') {
  return String(value || '')
    .replace(/\+?\d[\d\s-]{7,}\d[\s\S]*$/u, '')
    .replace(/\s+(?:منتج|المنتج|product|السعر|سعر|price|الكمية|كميه|quantity|qty)\b[\s\S]*$/iu, '')
    .trim();
}

function extractOrderCreateDraftParams(task = '') {
  const raw = String(task || '');
  const pick = (pattern) => raw.match(pattern)?.[1]?.trim().replace(/[.،؛\s]+$/u, '') || '';
  const productName = pick(/(?:productName|اسم المنتج|المنتج|منتج|product)\s*[:=]?\s+(.+?)(?=\s+(?:السعر|سعر|price|الكمية|كميه|quantity|qty|العميل|اسم العميل|رقم العميل|هاتف العميل|phone|المدينة|المحافظة|المقاس|اللون|$))/iu);
  const customerName = cleanCustomerName(
    pick(/(?:customerName|اسم العميل|للعميل|العميل|customer name)\s*[:=]?\s+(.+?)(?=\s+(?:\+?\d[\d\s-]{7,}|رقم العميل|هاتف العميل|phone|منتج|المنتج|السعر|سعر|الكمية|كميه|$))/iu)
  );
  const customerPhone = pick(/(?:customerPhone|هاتف العميل|رقم العميل|رقم الموبايل|phone)\s*[:=]?\s*(\+?\d[\d\s-]{7,}\d)/iu)
    || (raw.match(/\+?\d[\d\s-]{7,}\d/u)?.[0] || '').trim();
  const productPrice = extractNumber(
    pick(/(?:productPrice|السعر|سعر|price)\s*[:=]?\s*([٠-٩۰-۹\d]+(?:[.,][٠-٩۰-۹\d]+)?)/iu)
  );
  const quantity = extractNumber(
    pick(/(?:quantity|qty|الكمية|كمية|كميه|عدد)\s*[:=]?\s*([٠-٩۰-۹\d]+)/iu)
  );
  const productColor = pick(/(?:productColor|اللون|color)\s*[:=]?\s+([^،,.\n]+)/iu);
  const productSize = pick(/(?:productSize|المقاس|size)\s*[:=]?\s+([^،,.\n]+)/iu);
  const city = pick(/(?:city|المدينة|المحافظة)\s*[:=]?\s+([^،,.\n]+)/iu);

  return {
    productName,
    productPrice,
    quantity: quantity === undefined ? 1 : Math.max(1, Math.floor(quantity)),
    customerName,
    customerPhone,
    ...(productColor ? { productColor } : {}),
    ...(productSize ? { productSize } : {}),
    ...(city ? { city } : {}),
    notes: 'Created by specialist agent task as an approval-required order draft.',
  };
}

function serializeAgent(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    model: agent.model,
    templateSlug: agent.templateSlug || null,
    version: agent.version || null,
    parentId: agent.parentId || null,
    allowedTools: agent.getTools(),
    allowedSkills: agent.getSkills ? agent.getSkills() : [],
    persona: agent.persona || {},
    policies: agent.policies || {},
  };
}

class AgentManagerService {
  async ensureAgentDepartments(companyId) {
    return ensureDefaultAgentDepartments(companyId);
  }

  async ensureGlobalTemplateAgents(companyId) {
    return ensureGlobalTemplateAgents(companyId);
  }

  async listAgentDepartments(companyId) {
    return ensureDefaultAgentDepartments(companyId);
  }

  async getManagerAgent(companyId) {
    await hydrateCompanyAgentsFromDB(companyId);
    const existing = agentProvisioningService.listAgents(companyId)
      .find(agent => agent.role === 'CEO');
    if (existing) {
      return agentProvisioningService.reconcileTemplateDefaults(companyId, existing);
    }
    return await agentProvisioningService.spawn(companyId, { role: 'CEO', name: 'CEO Agent' });
  }

  async ensureFacebookMessengerAgent(companyId) {
    if (!companyId) throw new Error('companyId is required');
    await hydrateCompanyAgentsFromDB(companyId);

    const runtimeExisting = agentProvisioningService.listAgents(companyId)
      .find(agent => (
        agent.status === 'ACTIVE' &&
        (
          agent.role === FACEBOOK_MESSENGER_AGENT_ROLE ||
          agent.templateSlug === FACEBOOK_MESSENGER_AGENT_TEMPLATE
        )
      ));
    if (runtimeExisting) {
      return agentProvisioningService.reconcileTemplateDefaults(companyId, runtimeExisting);
    }

    let dbExisting = null;
    try {
      const prisma = getSharedPrismaClient();
      try {
        dbExisting = await prisma.companyAgent.findFirst({
          where: {
            companyId,
            OR: [
              { role: FACEBOOK_MESSENGER_AGENT_ROLE },
              { templateSlug: FACEBOOK_MESSENGER_AGENT_TEMPLATE },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });
      } catch (_) {}
      // Fallback to raw SQL when Prisma model is unavailable
      if (dbExisting === undefined || dbExisting === null) {
        const rows = await prisma.$queryRawUnsafe(
          `SELECT id, name, role, model, "templateSlug", "parentId", skills, soul, status FROM "company_agents" WHERE "companyId" = $1 AND (role = $2 OR "templateSlug" = $3) ORDER BY "createdAt" ASC LIMIT 1`,
          companyId, FACEBOOK_MESSENGER_AGENT_ROLE, FACEBOOK_MESSENGER_AGENT_TEMPLATE
        ).catch(() => []);
        dbExisting = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      }
    } catch (_) {}

    if (dbExisting?.status === 'ARCHIVED') return null;
    if (dbExisting) {
      const restored = agentProvisioningService._restoreAgent(companyId, {
        id: dbExisting.id,
        name: dbExisting.name,
        role: dbExisting.role,
        model: dbExisting.model,
        templateSlug: dbExisting.templateSlug,
        parentId: dbExisting.parentId,
        allowedSkills: safeJsonParse(dbExisting.skills, null),
        soul: dbExisting.soul,
        status: dbExisting.status,
      });
      return restored ? agentProvisioningService.reconcileTemplateDefaults(companyId, restored) : null;
    }

    if (!(await companyHasConnectedFacebookPage(companyId))) return null;

    const manager = await this.getManagerAgent(companyId);
    const profile = agentProfileLoaderService.loadProfile(FACEBOOK_MESSENGER_AGENT_TEMPLATE);
    const agent = await agentProvisioningService.spawn(companyId, {
      name: FACEBOOK_MESSENGER_AGENT_NAME,
      role: FACEBOOK_MESSENGER_AGENT_ROLE,
      templateSlug: FACEBOOK_MESSENGER_AGENT_TEMPLATE,
      parentId: manager.id,
    });

    try {
      await persistCompanyAgent(companyId, agent, {
        soul: profile.instructions?.soul || '',
        rules: [
          'Only responds to Facebook/Messenger customers as a sales and support agent.',
          'Does not execute any final write operations without human approval when required.',
          'Hands off the conversation to a human team for complaints, returns, or unclear cases.',
        ],
        skills: agent.getSkills ? agent.getSkills() : profile.allowedSkills,
        createdBy: 'system_facebook_channel',
        description: 'Specialized agent for Facebook Messenger customer replies using company catalog and conversation context.',
        icon: '💬',
        departmentId: await getDepartmentIdForRole(companyId, FACEBOOK_MESSENGER_AGENT_ROLE),
        managerType: MANAGER_TYPES.AGENT,
      });
    } catch (error) {
      agentProvisioningService.removeRuntimeAgent(companyId, agent.id);
      const persistError = new Error(`FACEBOOK_AGENT_PERSIST_FAILED:${error.message}`);
      persistError.code = 'FACEBOOK_AGENT_PERSIST_FAILED';
      throw persistError;
    }

    await this._audit(companyId, {
      agentId: manager.id,
      action: 'FACEBOOK_MESSENGER_AGENT_ENSURED',
      decision: `Ensured Facebook Messenger agent ${agent.id}`,
      metadata: { agent: serializeAgent(agent), createdBy: 'system_facebook_channel' },
    });

    return agent;
  }

  async getManagerContext(companyId) {
    if (!companyId) throw new Error('companyId is required');
    const departments = await this.ensureAgentDepartments(companyId);
    const manager = await this.getManagerAgent(companyId);
    await this.ensureGlobalTemplateAgents(companyId);
    await this.ensureFacebookMessengerAgent(companyId).catch(error => {
      console.warn('[AGENT-MANAGER] Failed to ensure Facebook Messenger agent:', error.message);
    });
    const agents = agentProvisioningService.listAgents(companyId).map(serializeAgent);
    const tasks = await agentInboxService.listTasks(companyId);
    const activeTasks = tasks.filter(task => ['PENDING', 'CHECKED_OUT', 'IN_PROGRESS'].includes(task.status));

    return {
      manager: serializeAgent(manager),
      agents,
      inbox: {
        total: tasks.length,
        active: activeTasks.length,
        pending: tasks.filter(task => task.status === 'PENDING').length,
        checkedOut: tasks.filter(task => task.status === 'CHECKED_OUT').length,
        completed: tasks.filter(task => task.status === 'COMPLETED').length,
        failed: tasks.filter(task => task.status === 'FAILED').length,
      },
      profiles: agentProfileLoaderService.listProfiles().map(profile => ({
        slug: profile.slug,
        name: profile.name,
        role: profile.role,
        version: profile.version,
        allowedTools: profile.allowedTools,
        allowedSkills: profile.allowedSkills,
      })),
      departments,
      tools: toolRegistryService.listTools(),
      skills: skillRegistryService.listSkills().map(skill => ({
        id: skill.id,
        displayName: skill.displayName,
        version: skill.version,
        allowedTools: skill.allowedTools,
      })),
    };
  }

  async hireAgent(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!request.role) throw new Error('role is required');

    const manager = await this.getManagerAgent(companyId);
    const requestedName = normalizeAgentIdentity(request.name);
    const requestedRole = normalizeAgentIdentity(request.role).toUpperCase();

    if (requestedName) {
      const existing = agentProvisioningService.listAgents(companyId)
        .find(agent => (
          agent.status === 'ACTIVE' &&
          normalizeAgentIdentity(agent.name) === requestedName &&
          normalizeAgentIdentity(agent.role).toUpperCase() === requestedRole
        ));
      if (existing) {
        await this._audit(companyId, {
          agentId: manager.id,
          action: 'AGENT_HIRE_REUSED',
          decision: `Reused existing ${existing.role} agent ${existing.id}`,
          metadata: { reusedAgent: serializeAgent(existing), requestedBy: request.requestedBy || null },
        });
        return { success: true, agent: serializeAgent(existing), reused: true };
      }
    }

    // ── Load soul/rules/skills from AgentDefinition template ────────────────
    const template = await loadAgentDefinitionTemplate(request.role);
    const soul   = request.soul   || template.soul   || '';
    const rules  = request.rules  || template.rules  || [];
    const skills = request.skills || template.skills || null;

    // ── Spawn in memory ──────────────────────────────────────────────────────
    const agent = await agentProvisioningService.spawn(companyId, {
      name: request.name,
      role: request.role,
      model: request.model,
      templateSlug: request.templateSlug,
      allowedTools: skills || request.allowedTools,
      allowedSkills: request.allowedSkills,
      parentId: request.parentId || manager.id,
      persona: request.persona,
      policies: request.policies,
    });

    // ── Persist to DB ────────────────────────────────────────────────────────
    try {
      await persistCompanyAgent(companyId, agent, {
        soul,
        rules,
        skills,
        createdBy: request.requestedBy || 'ceo_agent',
      });
    } catch (error) {
      agentProvisioningService.removeRuntimeAgent(companyId, agent.id);
      const persistError = new Error(`AGENT_HIRE_PERSIST_FAILED:${error.message}`);
      persistError.code = 'AGENT_HIRE_PERSIST_FAILED';
      throw persistError;
    }

    await this._audit(companyId, {
      agentId: manager.id,
      action: 'AGENT_HIRED',
      decision: `Hired ${agent.role} agent ${agent.id}`,
      metadata: { hiredAgent: serializeAgent(agent), requestedBy: request.requestedBy || null },
    });

    return { success: true, agent: serializeAgent(agent) };
  }

  async archiveAgent(companyId, agentId) {
    if (!companyId) throw new Error('companyId is required');
    if (!agentId) throw new Error('agentId is required');

    await hydrateCompanyAgentsFromDB(companyId);
    const runtimeAgent = agentProvisioningService.getAgent(companyId, agentId);

    let dbAgent = null;
    try {
      const prisma = getSharedPrismaClient();
      dbAgent = await prisma.companyAgent.findFirst({ where: { id: agentId, companyId } });
    } catch (_) {}

    if (!runtimeAgent && !dbAgent) {
      const error = new Error('AGENT_NOT_FOUND');
      error.code = 'AGENT_NOT_FOUND';
      error.statusCode = 404;
      throw error;
    }

    if ((runtimeAgent?.role || dbAgent?.role) === 'CEO') {
      const error = new Error('Cannot archive the CEO agent');
      error.code = 'CANNOT_ARCHIVE_CEO_AGENT';
      error.statusCode = 400;
      throw error;
    }

    let archivedCount = 0;
    try {
      const prisma = getSharedPrismaClient();
      const result = await prisma.companyAgent.updateMany({
        where: { id: agentId, companyId },
        data: { status: 'ARCHIVED', updatedAt: new Date() },
      });
      archivedCount = result?.count || 0;
    } catch (error) {
      if (dbAgent) throw error;
    }

    const removedRuntime = agentProvisioningService.removeRuntimeAgent(companyId, agentId);
    await this._audit(companyId, {
      agentId,
      action: 'AGENT_ARCHIVED',
      decision: `Archived agent ${agentId}`,
      metadata: { archivedCount, removedRuntime },
    });

    return { success: true, agentId, archivedCount, removedRuntime };
  }

  async assignTask(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');
    const manager = await this.getManagerAgent(companyId);
    const task = await agentInboxService.createTask(companyId, {
      title: request.title,
      description: request.description,
      priority: request.priority,
      assignTo: request.assignTo,
      agentId: request.agentId,
      createdBy: request.createdBy || manager.id,
      parentTaskId: request.parentTaskId,
      traceId: request.traceId,
      metadata: {
        ...(request.metadata || {}),
        ...(request.conflictKey ? { conflictKey: request.conflictKey } : {}),
        ...(request.conflictAction ? { conflictAction: request.conflictAction } : {}),
        ...(request.conflictResource ? { conflictResource: request.conflictResource } : {}),
        ...(request.conflictScope ? { conflictScope: request.conflictScope } : {}),
      },
    });

    await this._audit(companyId, {
      traceId: request.traceId,
      agentId: manager.id,
      action: 'TASK_ASSIGNED',
      decision: `Created task ${task.id}`,
      metadata: { task },
    });

    return { success: true, task };
  }

  async updateAgentProfile(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!request.agentId) throw new Error('agentId is required');
    const manager = await this.getManagerAgent(companyId);
    const agent = await agentProvisioningService.updateAgent(companyId, request.agentId, {
      name: request.name,
      role: request.role,
      model: request.model,
      allowedTools: request.allowedTools,
      allowedSkills: request.allowedSkills,
      persona: {
        ...(request.persona || {}),
        ...(request.soulInstructions !== undefined ? { soulInstructions: request.soulInstructions } : {}),
        ...(request.agentInstructions !== undefined ? { agentInstructions: request.agentInstructions } : {}),
        ...(request.toolsInstructions !== undefined ? { toolsInstructions: request.toolsInstructions } : {}),
        ...(request.style !== undefined ? { style: request.style } : {}),
      },
      policies: request.policies,
      audit: {
        requestedBy: request.requestedBy || null,
        source: request.source || 'agent-manager',
      },
    });

    try {
      await ensureAgentTables();
      await getSharedPrismaClient().companyAgent.updateMany({
        where: { id: request.agentId, companyId },
        data: {
          name: agent.name,
          role: agent.role,
          model: agent.model || null,
          status: agent.status || 'ACTIVE',
          ...(request.soulInstructions !== undefined ? { soul: request.soulInstructions || '' } : {}),
          ...(Array.isArray(request.allowedSkills) ? { skills: JSON.stringify(request.allowedSkills) } : {}),
        },
      });
    } catch (error) {
      console.warn('[AGENT-MANAGER] Failed to persist profile update to company_agents:', error.message);
    }

    await this._audit(companyId, {
      traceId: request.traceId,
      agentId: manager.id,
      action: 'AGENT_PROFILE_UPDATED',
      decision: `Updated ${agent.role} agent ${agent.id}`,
      metadata: {
        targetAgent: serializeAgent(agent),
        changedFields: Object.keys(request).filter(key => !['agentId', 'requestedBy', 'traceId'].includes(key)),
      },
    });

    return { success: true, agent: serializeAgent(agent) };
  }

  async runAgentTask(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!request.task) throw new Error('task is required');
    const agent = findAgentForTask(companyId, request);
    if (!agent) throw new Error('AGENT_NOT_FOUND');
    if (taskRequiresOrderCreateDraftTool(request.task) && !agent.canUseTool('order.create_draft')) {
      throw new Error('MISSING_TOOL: order.create_draft is required before an agent can create order drafts');
    }
    if (taskRequiresOrderCreateDraftTool(request.task) && agent.canUseTool('order.create_draft')) {
      const params = extractOrderCreateDraftParams(request.task);
      if (!params.productName || params.productPrice === undefined || Number.isNaN(params.productPrice) || !params.customerName || !params.customerPhone) {
        throw new Error('ORDER_CREATE_DETAILS_REQUIRED: productName, productPrice, customerName, and customerPhone are required');
      }
      const agentToolGatewayService = require('./agentToolGatewayService');
      const toolResult = await agentToolGatewayService.execute({
        companyId,
        agent,
        tool: 'order.create_draft',
        params: { ...params, agentId: agent.id },
        traceId: request.traceId,
        source: 'specialist-agent-run-task',
        userMessage: request.task,
      });
      await this._audit(companyId, {
        traceId: request.traceId,
        agentId: agent.id,
        action: 'AGENT_TASK_RUN',
        decision: `Ran order.create_draft task for ${agent.id}`,
        metadata: { task: request.task, toolResult },
      });
      return { success: Boolean(toolResult.success), agent: serializeAgent(agent), result: toolResult };
    }
    if (taskRequiresProductCreateTool(request.task) && !agent.canUseTool('product.create')) {
      throw new Error('MISSING_TOOL: product.create is required before an agent can create products');
    }
    if (taskRequiresProductCreateTool(request.task) && agent.canUseTool('product.create')) {
      const params = extractProductCreateParams(request.task);
      if (!params.name || params.price === undefined || Number.isNaN(params.price)) {
        throw new Error('PRODUCT_CREATE_DETAILS_REQUIRED: name and price are required');
      }
      const agentToolGatewayService = require('./agentToolGatewayService');
      const toolResult = await agentToolGatewayService.execute({
        companyId,
        agent,
        tool: 'product.create',
        params,
        traceId: request.traceId,
        source: 'specialist-agent-run-task',
        userMessage: request.task,
      });
      await this._audit(companyId, {
        traceId: request.traceId,
        agentId: agent.id,
        action: 'AGENT_TASK_RUN',
        decision: `Ran product.create task for ${agent.id}`,
        metadata: { task: request.task, toolResult },
      });
      return { success: Boolean(toolResult.success), agent: serializeAgent(agent), result: toolResult };
    }
    agent.setModelManager(aiRuntimeService.getModelManager());
    const result = await agent.processTask({
      title: request.title || 'Direct agent task',
      description: request.task,
      metadata: request.metadata || {},
    });
    await this._audit(companyId, {
      traceId: request.traceId,
      agentId: agent.id,
      action: 'AGENT_TASK_RUN',
      decision: `Ran direct task for ${agent.id}`,
      metadata: { task: request.task, result },
    });
    return { success: true, agent: serializeAgent(agent), result };
  }

  async delegateGoal(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!request.goal) throw new Error('goal is required');

    const manager = await this.getManagerAgent(companyId);
    const ceo = new CEOAgent(companyId, { id: manager.id, name: manager.name });
    const tasks = ceo.decomposeGoal(request.goal);
    const createdTasks = [];

    for (const task of tasks) {
      let agent = agentProvisioningService.listAgents(companyId)
        .find(item => item.role === task.assignTo && item.status === 'ACTIVE');

      if (!agent && request.autoHire !== false) {
        agent = await agentProvisioningService.spawn(companyId, {
          role: task.assignTo,
          parentId: manager.id,
        });
      }

      const created = await agentInboxService.createTask(companyId, {
        title: task.description,
        description: task.description,
        priority: task.priority === 1 ? 'high' : task.priority === 2 ? 'medium' : 'low',
        assignTo: task.assignTo,
        agentId: agent?.id || null,
        createdBy: manager.id,
        parentTaskId: request.parentTaskId || null,
        traceId: request.traceId,
        metadata: {
          goal: request.goal,
          dependencies: task.dependencies || [],
          sourceTaskId: task.id,
        },
      });
      createdTasks.push(created);
    }

    await this._audit(companyId, {
      traceId: request.traceId,
      agentId: manager.id,
      action: 'GOAL_DELEGATED',
      decision: `Delegated goal into ${createdTasks.length} task(s)`,
      metadata: { goal: request.goal, taskIds: createdTasks.map(task => task.id) },
    });

    return {
      success: true,
      goal: request.goal,
      taskCount: createdTasks.length,
      tasks: createdTasks,
    };
  }

  async readState(companyId, include = []) {
    const context = await this.getManagerContext(companyId);
    const selected = new Set(include || []);
    if (selected.size === 0) return context;

    const state = { manager: context.manager };
    for (const key of selected) {
      if (context[key] !== undefined) state[key] = context[key];
    }
    return state;
  }

  async chat(companyId, { message = '', userId = null } = {}) {
    const context = await this.getManagerContext(companyId);
    const normalized = String(message || '').toLowerCase();
    const focus = normalized.includes('tool')
      ? 'tools'
      : normalized.includes('skill')
        ? 'skills'
        : normalized.includes('task') || normalized.includes('inbox')
          ? 'inbox'
          : 'agents';

    return {
      success: true,
      reply: this._buildManagerReply(context, focus),
      focus,
      context,
      userId,
    };
  }

  registerToolHandlers(toolOrchestratorService) {
    if (!toolOrchestratorService) return;
    this._handlersRegistered = true;

    toolOrchestratorService.registerHandler('agentManager.spawnAgent', ({ companyId, input, agent }) => (
      this.hireAgent(companyId, { ...input, requestedBy: agent?.id || null })
    ));
    toolOrchestratorService.registerHandler('agentManager.assignTask', ({ companyId, input, agent }) => (
      this.assignTask(companyId, { ...input, createdBy: agent?.id || null })
    ));
    toolOrchestratorService.registerHandler('agentManager.listAgents', ({ companyId }) => (
      agentProvisioningService.listAgents(companyId).map(serializeAgent)
    ));
    toolOrchestratorService.registerHandler('agentManager.readCompanyState', ({ companyId, input }) => (
      this.readState(companyId, input.include || [])
    ));
    toolOrchestratorService.registerHandler('agentManager.updateAgentProfile', ({ companyId, input, agent }) => (
      this.updateAgentProfile(companyId, { ...input, requestedBy: agent?.id || null })
    ));
    toolOrchestratorService.registerHandler('agentManager.runAgentTask', ({ companyId, input, agent }) => (
      this.runAgentTask(companyId, { ...input, requestedBy: agent?.id || null })
    ));
    toolOrchestratorService.registerHandler('agentManager.handoff', ({ companyId, input, agent }) => (
      this.assignTask(companyId, {
        title: `Handoff: ${input.reason}`,
        description: input.summary || input.reason,
        priority: 'high',
        agentId: input.targetType === 'agent' ? input.targetId : null,
        assignTo: input.targetType === 'human' ? 'HUMAN' : null,
        createdBy: agent?.id || null,
        metadata: { handoff: input },
      })
    ));
  }

  _buildManagerReply(context, focus) {
    if (focus === 'tools') {
      return `Loaded ${context.tools.length} registered tool(s). Write tools require approval drafts when marked in the registry.`;
    }
    if (focus === 'skills') {
      return `Loaded ${context.skills.length} skill package(s). Each agent only receives skills assigned by its template.`;
    }
    if (focus === 'inbox') {
      return `Inbox has ${context.inbox.active} active task(s): ${context.inbox.pending} pending and ${context.inbox.checkedOut} checked out.`;
    }
    return `Active team has ${context.agents.length} agent(s). Manager template: ${context.manager.templateSlug || 'custom'}.`;
  }

  async _audit(companyId, event) {
    try {
      await agentAuditTrailService.logDecision(companyId, event);
    } catch (_) {}
  }

  async _reset() {
    await agentInboxService._reset();
    agentProvisioningService._reset();
  }
}

const service = new AgentManagerService();
try {
  const toolOrchestratorService = require('./toolOrchestratorService');
  service.registerToolHandlers(toolOrchestratorService);
} catch (_) {}

module.exports = service;
module.exports._private = {
  serializeAgent,
  taskRequiresProductCreateTool,
  taskRequiresOrderCreateDraftTool,
  extractProductCreateParams,
  extractOrderCreateDraftParams,
  findAgentForTask,
  buildAgentLookupKeys,
};
