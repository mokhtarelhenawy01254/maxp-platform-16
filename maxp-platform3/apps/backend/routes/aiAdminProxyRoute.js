const express = require("express");
const router = express.Router();
const http = require("http");
const https = require("https");

const { authenticateToken, requireSuperAdmin, checkPermission } = require("../middleware/superAdminMiddleware");
const { addPublicCORS } = require("../middleware/companyMiddleware");

function getAiServiceUrl() {
  return (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
}

router.use(addPublicCORS);
router.use(authenticateToken);

// Custom access check: allow Super Admin (system) OR company Owner/Admin (merchant)
const allowMerchantOrSystemAdmin = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // 1. SUPER_ADMIN always passes
    if (req.user.role === 'SUPER_ADMIN') return next();

    // 2. Check system-level permission (for internal team roles)
    const devSettingsService = require("../services/devSettingsService");
    try {
      const settings = await devSettingsService.getSettings();
      const rolePerms = settings.permissions?.[req.user.role];
      if (rolePerms?.canAccessSettings) return next();
    } catch { /* ignore, check company role next */ }

    // 3. Check if user is OWNER or COMPANY_ADMIN of any company (merchant access)
    const companyRoles = req.user.userCompanies || [];
    const isMerchantAdmin = companyRoles.some(
      uc => ['OWNER', 'COMPANY_ADMIN'].includes(uc.role)
    );

    if (isMerchantAdmin) return next();

    return res.status(403).json({
      success: false,
      message: 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء'
    });
  } catch (error) {
    console.error('[ai-admin-proxy] Access check error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

router.all("/:path(*)", allowMerchantOrSystemAdmin, async (req, res) => {

  try {
    const aiServiceBase = getAiServiceUrl();
    const targetPath = req.params.path;
    const url = new URL(`${aiServiceBase}/admin/${targetPath}`);
    
    // Forward query params
    Object.entries(req.query).forEach(([k, v]) => url.searchParams.set(k, v));
    
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const token = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || "";

    const payload = ["POST", "PUT", "PATCH"].includes(req.method.toUpperCase()) && req.body
      ? JSON.stringify(req.body)
      : null;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
      timeout: 30000,
    };

    const proxyReq = lib.request(options, (proxyRes) => {
      let data = "";
      proxyRes.on("data", (chunk) => { data += chunk; });
      proxyRes.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          res.status(proxyRes.statusCode || 200).json(parsed);
        } catch {
          res.status(proxyRes.statusCode || 200).send(data);
        }
      });
    });

    proxyReq.on("error", (err) => {
      console.error("[ai-admin-proxy] Error:", err.message);
      res.status(502).json({ success: false, error: `AI service proxy error: ${err.message}` });
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.status(504).json({ success: false, error: "AI service timeout" });
    });

    if (payload) proxyReq.write(payload);
    proxyReq.end();
  } catch (err) {
    console.error("[ai-admin-proxy] Fatal:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
