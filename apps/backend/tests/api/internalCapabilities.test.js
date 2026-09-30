/**
 * Internal Capability Manifest tests — walker correctness + middleware
 * metadata tagging (permissionKey from requireDbPermission, appSlug from
 * checkAppAccess). This manifest is the source of truth for the ai-service
 * capability bridge & drift detector.
 */
const express = require('express');
const { buildCapabilityManifest, mountPathOf } = require('../../routes/internalCapabilitiesRoutes');
const { requireDbPermission } = require('../../middleware/rbacMiddleware');
const checkAppAccess = require('../../middleware/checkAppAccess');

function buildApp() {
  const app = express();

  const orders = express.Router();
  orders.get('/', requireDbPermission('orders.view'), (req, res) => res.json({}));
  orders.post('/', requireDbPermission('orders.edit'), checkAppAccess('order-core'), (req, res) => res.json({}));
  orders.patch('/:orderNumber/status', requireDbPermission('orders.edit'), (req, res) => res.json({}));

  const nested = express.Router();
  nested.get('/', (req, res) => res.json({}));
  orders.use('/stats', nested);

  const admin = express.Router();
  admin.get('/billing', (req, res) => res.json({}));

  app.use('/api/v1/orders-v2', orders);
  app.use('/api/v1/super-admin', admin);
  app.get('/api/v1/health', (req, res) => res.json({}));

  return app;
}

describe('internal capability manifest', () => {
  test('walks nested routers and extracts method + full path', () => {
    const manifest = buildCapabilityManifest(buildApp());
    const paths = manifest.capabilities.map((c) => `${c.method} ${c.path}`);

    expect(paths).toContain('GET /api/v1/orders-v2');
    expect(paths).toContain('PATCH /api/v1/orders-v2/:orderNumber/status');
    expect(paths).toContain('GET /api/v1/orders-v2/stats');
    expect(paths).toContain('GET /api/v1/health');
  });

  test('recovers permissionKey and appSlug from middleware metadata', () => {
    const manifest = buildCapabilityManifest(buildApp());
    const getOrders = manifest.capabilities.find((c) => c.method === 'GET' && c.path === '/api/v1/orders-v2');
    const postOrders = manifest.capabilities.find((c) => c.method === 'POST' && c.path === '/api/v1/orders-v2');

    expect(getOrders.permissionKey).toBe('orders.view');
    expect(getOrders.appSlug).toBeNull();
    expect(postOrders.permissionKey).toBe('orders.edit');
    expect(postOrders.appSlug).toBe('order-core');
  });

  test('excludes super-admin / internal prefixes', () => {
    const manifest = buildCapabilityManifest(buildApp());
    const paths = manifest.capabilities.map((c) => c.path);
    expect(paths.some((p) => p.startsWith('/api/v1/super-admin'))).toBe(false);
    expect(paths.some((p) => p.startsWith('/api/v1/internal'))).toBe(false);
  });

  test('dedupes identical method+path entries', () => {
    const manifest = buildCapabilityManifest(buildApp());
    const keys = manifest.capabilities.map((c) => `${c.method} ${c.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(manifest.total).toBe(manifest.capabilities.length);
  });

  test('middleware factories attach _maxpMeta', () => {
    const permMw = requireDbPermission('products.view');
    const appMw = checkAppAccess('coupons-pro');
    expect(permMw._maxpMeta).toEqual({ permissionKey: 'products.view' });
    expect(appMw._maxpMeta).toEqual({ appSlug: 'coupons-pro' });
  });

  test('mountPathOf normalizes regexp source', () => {
    const layer = { regexp: { source: '^\\/api\\/v1\\/orders-v2\\/?' } };
    expect(mountPathOf(layer)).toBe('/api/v1/orders-v2');
  });
});
