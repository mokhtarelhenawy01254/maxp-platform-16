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
router.use(requireSuperAdmin);

router.all("/:path(*)", checkPermission("canAccessSettings"), async (req, res) => {
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
