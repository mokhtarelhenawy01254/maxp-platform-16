/**
 * AI Bridge Service Identity — permissioned service-to-service auth.
 *
 * Replaces god-mode for the capability bridge: instead of the shared
 * AI_SERVICE secret bypassing every requireDbPermission check, the bridge
 * operates as a REAL user ("AI Bridge" / role AGENT) with a company-scoped
 * Role that carries only the permission keys the bridge needs. JWTs are
 * minted per company with a 15-minute TTL and verified by the standard
 * authenticateToken path — so permission checks and activity logs behave
 * exactly like a human operator.
 *
 * The legacy service token keeps working for existing ai-service calls
 * (137 code tools); only the capability catalog bridge uses this identity.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { getSharedPrismaClient } = require('./sharedDatabase');
const { getJwtSecret } = require('../utils/jwtSecret');

const BRIDGE_EMAIL_DOMAIN = 'ai-bridge.internal.maxp';
const SESSION_TTL_SECONDS = 15 * 60;
// Permission keys the bridge needs for curated catalog capabilities.
// Extend when new domains are activated.
const BRIDGE_PERMISSION_KEYS = [
  'orders.view',
  'products.view',
  'products.create',
  'products.edit',
  'customers.view',
  'dashboard.view',
  'reports.view',
  'settings.read',
];

const sessionCache = new Map(); // companyId -> { token, expiresAt }
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000; // mint at most every 10 min

function bridgeEmailFor(companyId) {
  // Deterministic per-company identity: ai-bridge.<companyId>@...
  return `ai-bridge.${companyId}@${BRIDGE_EMAIL_DOMAIN}`;
}

async function ensureBridgeUser(companyId) {
  const prisma = getSharedPrismaClient();
  const email = bridgeEmailFor(companyId);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        // password is never used — service JWTs only; random hash prevents login
        password: crypto.randomBytes(32).toString('hex'),
        firstName: 'AI',
        lastName: 'Bridge',
        role: 'AGENT',
        isActive: true,
        companyId,
      },
    });
  }

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    update: { isActive: true },
    create: { userId: user.id, companyId, role: 'AGENT', isActive: true, isDefault: true },
  });

  return user;
}

async function ensureBridgeRole(companyId) {
  const prisma = getSharedPrismaClient();
  const key = 'AI_BRIDGE';

  let role = await prisma.role.findFirst({
    where: { key, companyId, isActive: true },
    include: { permissions: { include: { permission: true } } },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        key,
        name: 'AI Bridge',
        description: 'Permissioned identity for the AI capability bridge (per-company).',
        companyId,
        isBuiltIn: false,
        isActive: true,
        isSystem: false,
      },
      include: { permissions: true },
    });
  }

  // Sync permissions: add missing keys, keep manually added ones.
  const existingKeys = new Set((role.permissions || []).map((rp) => rp.permission.key));
  for (const permKey of BRIDGE_PERMISSION_KEYS) {
    if (existingKeys.has(permKey)) continue;
    const permission = await prisma.permission.findUnique({ where: { key: permKey } });
    if (!permission) continue; // unknown key — skip silently, catalog curation will surface it
    await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } }).catch(() => null);
    existingKeys.add(permKey);
  }

  // Attach role to the UserCompany row so permissionService resolves it
  const user = await ensureBridgeUser(companyId);
  await prisma.userCompany.updateMany({
    where: { userId: user.id, companyId },
    data: { roleId: role.id },
  });

  return { role, user };
}

function mintBridgeToken(user, companyId) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role, // AGENT — goes through normal RBAC, never AI_SERVICE
      companyId,
      scope: 'ai-bridge',
    },
    getJwtSecret(),
    { expiresIn: SESSION_TTL_SECONDS },
  );
}

/**
 * Get (or mint) a short-lived bridge JWT for a company.
 * Cached 10 min per company; token itself lives 15 min.
 */
async function getBridgeSession(companyId) {
  if (!companyId) throw new Error('companyId is required for a bridge session');

  const cached = sessionCache.get(companyId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { user } = await ensureBridgeRole(companyId);
  const token = mintBridgeToken(user, companyId);
  sessionCache.set(companyId, { token, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  return token;
}

async function POSTServiceSession(req, res) {
  try {
    const companyId = (req.headers['x-company-id'] || req.query.companyId || req.body?.companyId || '')
      .toString().trim();
    if (!companyId) {
      return res.status(400).json({ error: 'x-company-id header is required' });
    }
    const token = await getBridgeSession(companyId);
    res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: SESSION_TTL_SECONDS,
      identity: { role: 'AGENT', scope: 'ai-bridge', companyId },
    });
  } catch (error) {
    console.error('[serviceIdentity] session mint failed:', error.message);
    res.status(500).json({ error: 'Failed to mint bridge session' });
  }
}

function clearSessionCache() {
  sessionCache.clear();
}

module.exports = {
  getBridgeSession,
  ensureBridgeRole,
  ensureBridgeUser,
  bridgeEmailFor,
  BRIDGE_PERMISSION_KEYS,
  clearSessionCache,
  POSTServiceSession,
};
