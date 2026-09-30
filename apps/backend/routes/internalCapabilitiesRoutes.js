/**
 * Internal Capability Manifest — machine-readable inventory of every mounted
 * backend route, enriched with the metadata attached by middleware factories
 * (`_maxpMeta.permissionKey` from requireDbPermission, `_maxpMeta.appSlug`
 * from checkAppAccess).
 *
 * Consumed by the ai-service capability bridge + drift detector so that:
 *   1. Every store capability can be compared against agent tools.
 *   2. A NEW backend route becomes visible to the bridge automatically
 *      (read capabilities auto-activate for agents, writes await curation).
 *
 * Auth: shared service token (AI_SERVICE_TOKEN || MAXP_SERVICE_TOKEN),
 * timing-safe comparison — same secret the ai-service already holds.
 */
const express = require('express');
const crypto = require('crypto');

const router = express.Router();

// Prefixes that are platform/super-admin surfaces, not store-owner
// capabilities — excluded from the manifest.
const EXCLUDED_PREFIXES = [
  '/api/v1/super-admin',
  '/api/v1/admin/super',
  '/api/v1/internal',
  '/api/v1/external/dev-tasks',
];

function getAiServiceToken() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

function tokenMatchesServiceToken(provided, expected) {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireServiceToken(req, res, next) {
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!tokenMatchesServiceToken(token, getAiServiceToken())) {
    return res.status(401).json({ error: 'Service token required' });
  }
  next();
}

/**
 * Recover the mount path of a router layer from its regexp source.
 * Normalizes Express param capture groups to ':param'.
 */
function mountPathOf(layer) {
  let src = (layer.regexp && layer.regexp.source) || '';
  src = src
    .replace('^', '')
    .replace('(?=\\/$|$)', '')
    .replace('(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    // param capture groups → :param (both plain and non-capturing variants)
    .replace(/\(\?:\[\^\/\]\+\??\)/g, ':param')
    .replace(/\(\[\^\/\]\+\)/g, ':param')
    .replace('\\', '');
  src = src.replace(/\/\?$/, '').replace(/\?$/, '');
  return src;
}

function normalizePathSegment(segment) {
  if (typeof segment === 'string') return segment;
  if (segment instanceof RegExp) return segment.source;
  if (Array.isArray(segment)) return normalizePathSegment(segment[0]);
  if (segment == null) return '';
  return String(segment);
}

function joinPath(base, sub) {
  const left = normalizePathSegment(base).replace(/\/+$/, '');
  const right = normalizePathSegment(sub).replace(/^\/+/, '');
  if (!left) return right ? `/${right}` : '/';
  if (!right) return left;
  return `${left}/${right}`;
}

function middlewareMeta(routeLayerStack) {
  const meta = {};
  for (const mw of routeLayerStack || []) {
    const handle = mw && mw.handle;
    const m = handle && handle._maxpMeta;
    if (m && typeof m === 'object') {
      if (m.permissionKey) meta.permissionKey = m.permissionKey;
      if (m.appSlug) meta.appSlug = m.appSlug;
    }
  }
  return meta;
}

function walkStack(stack, basePath, out, inheritedMeta = {}) {
  for (const layer of stack || []) {
    if (layer.route) {
      const fullPath = joinPath(basePath, layer.route.path);
      const meta = { ...inheritedMeta, ...middlewareMeta(layer.route.stack) };
      const methods = Object.keys(layer.route.methods || {});
      for (const method of methods) {
        if (method === '_all') {
          out.push({ method: 'ALL', path: fullPath, ...cloneMeta(meta) });
          continue;
        }
        out.push({ method: method.toUpperCase(), path: fullPath, ...cloneMeta(meta) });
      }
    } else if (layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
      // Router-level middleware (e.g. router.use(checkAppAccess('hr-core')))
      // applies to every route inside — inherit its metadata downward.
      const merged = { ...inheritedMeta, ...middlewareMeta(layer.handle.stack) };
      walkStack(layer.handle.stack, joinPath(basePath, mountPathOf(layer)), out, merged);
    }
  }
}

function cloneMeta(meta) {
  return {
    permissionKey: meta.permissionKey || null,
    appSlug: meta.appSlug || null,
  };
}

function buildCapabilityManifest(app) {
  const routes = [];
  // Walk only the main router stack (Express 4). Includes everything mounted
  // via app.use(...) — public storefront routes and authenticated routes.
  walkStack(app._router && app._router.stack, '', routes);

  const seen = new Set();
  const capabilities = [];
  for (const r of routes) {
    if (!r.path || !r.path.startsWith('/')) continue;
    if (EXCLUDED_PREFIXES.some((p) => r.path === p || r.path.startsWith(`${p}/`))) continue;
    const key = `${r.method} ${r.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    capabilities.push(r);
  }

  return {
    generatedAt: new Date().toISOString(),
    total: capabilities.length,
    capabilities,
  };
}

// Manifest cache: reflection over ~300 mounts is not free; capabilities only
// change on deploy/restart, so a 5-minute cache is safe and keeps the
// ai-service drift job cheap.
let manifestCache = null;
let manifestCacheAt = 0;
const MANIFEST_CACHE_TTL_MS = 5 * 60 * 1000;

router.get('/capabilities', requireServiceToken, (req, res) => {
  try {
    const now = Date.now();
    if (!manifestCache || now - manifestCacheAt > MANIFEST_CACHE_TTL_MS) {
      manifestCache = buildCapabilityManifest(req.app);
      manifestCacheAt = now;
    }
    res.json(manifestCache);
  } catch (error) {
    console.error('[internalCapabilities] manifest build failed:', error.message);
    res.status(500).json({ error: 'Failed to build capability manifest' });
  }
});

module.exports = router;
module.exports.buildCapabilityManifest = buildCapabilityManifest;
module.exports.mountPathOf = mountPathOf;
