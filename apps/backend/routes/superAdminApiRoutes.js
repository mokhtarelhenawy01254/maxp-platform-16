const express = require('express');
const router = express.Router();
const superAdminApiController = require('../controller/superAdminApiController');
const {
  authenticateExternalApi,
  requireExternalScope
} = require('../middleware/externalApiAuth');
const { piiSanitizerMiddleware } = require('../utils/piiSanitizer');

// 📖 1. Public / Auto-discovery introspection routes
router.get('/docs', superAdminApiController.getDocs);
router.get('/openapi.json', superAdminApiController.getOpenApiJson);
router.get('/health', superAdminApiController.getHealth);

// 🔐 2. All operational endpoints require a valid External API Key + strict PII redaction
router.use(authenticateExternalApi);
router.use(piiSanitizerMiddleware);

// 🔍 3. Capabilities matrix (Evaluates scopes for caller's key)
router.get('/capabilities', superAdminApiController.getCapabilities);

// 📋 4. Audit Log
router.get(
  '/audit',
  requireExternalScope('admin:audit:read'),
  superAdminApiController.getAudit
);

// 📊 5. Core Unified Read Domain Routes
router.get(
  '/analytics',
  requireExternalScope('admin:analytics:read'),
  superAdminApiController.getAnalytics
);

router.get(
  '/orders',
  requireExternalScope('admin:orders:read'),
  superAdminApiController.getOrders
);

router.get(
  '/products',
  requireExternalScope('admin:products:read'),
  superAdminApiController.getProducts
);

router.get(
  '/customers',
  requireExternalScope('admin:customers:read'),
  superAdminApiController.getCustomers
);

router.get(
  '/subscriptions',
  requireExternalScope('admin:subscriptions:read'),
  superAdminApiController.getSubscriptions
);

router.get(
  '/billing',
  requireExternalScope('admin:billing:read'),
  superAdminApiController.getBilling
);

router.get(
  '/revenue',
  requireExternalScope('admin:revenue:read'),
  superAdminApiController.getRevenue
);

router.get(
  '/marketplace',
  requireExternalScope('admin:marketplace:read'),
  superAdminApiController.getMarketplace
);

router.get(
  '/support',
  requireExternalScope('admin:support:read'),
  superAdminApiController.getSupport
);

router.get(
  '/ai-usage',
  requireExternalScope('admin:ai-usage:read'),
  superAdminApiController.getAiUsage
);

router.get(
  '/logs',
  requireExternalScope('admin:logs:read'),
  superAdminApiController.getLogs
);

router.get(
  '/users',
  requireExternalScope('admin:users:read'),
  superAdminApiController.getUsers
);

router.get(
  '/tenants',
  requireExternalScope('admin:tenants:read'),
  superAdminApiController.getTenants
);

router.get(
  '/coupons',
  requireExternalScope('admin:coupons:read'),
  superAdminApiController.getCoupons
);

router.get(
  '/landing',
  requireExternalScope('admin:landing:read'),
  superAdminApiController.getLanding
);

router.get(
  '/partners',
  requireExternalScope('admin:partners:read'),
  superAdminApiController.getPartners
);

router.get(
  '/settings',
  requireExternalScope('admin:settings:read'),
  superAdminApiController.getSettings
);

// 🌐 6. Dynamic catalog domain reader (checks admin:<domain>:read)
router.get('/:domain', superAdminApiController.getDynamicDomain);

// ✍️ 7. Unified domain write / dry-run endpoints (checks admin:<domain>:write)
router.post('/:domain', superAdminApiController.handleWrite);
router.post('/:domain/:action', superAdminApiController.handleWrite);

module.exports = router;
