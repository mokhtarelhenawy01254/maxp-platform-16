/**
 * funnelRoutes.smoke.cjs
 * ======================
 * Quick manual smoke test for the COD Sales Funnel API.
 *
 * Run with:  node tests/funnelRoutes.smoke.cjs
 *
 * Requires the dev server to be running on port 3000 (or PORT env).
 * This is NOT a real test suite — it's a focused verification script you can
 * run by hand after pulling the funnel route, to confirm:
 *   - GET  /api/v1/funnels/public/:slug     → 200 + funnel payload
 *   - POST /api/v1/funnels/public/:slug/order → 200 + trackingId
 *   - POST /api/v1/funnels/quick-generate   → 201 + funnel summary
 *
 * It uses fetch (Node 18+) — no external deps.
 */

const BASE = process.env.FUNNEL_BASE || "http://localhost:3000/api/v1";

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
};

const log = (label, ok, detail) => {
  const tag = ok ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  console.log(`${tag} ${label}${detail ? ` ${COLORS.dim}— ${detail}${COLORS.reset}` : ""}`);
};

async function test(label, fn) {
  try {
    const detail = await fn();
    log(label, true, detail);
  } catch (err) {
    log(label, false, err.message);
  }
}

(async () => {
  console.log(`\n${COLORS.yellow}═══ Funnel API smoke test (base: ${BASE}) ═══${COLORS.reset}\n`);

  // 1) GET funnel public
  await test("GET /funnels/public/socks returns a funnel payload", async () => {
    const res = await fetch(`${BASE}/funnels/public/socks`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.funnel) throw new Error("missing funnel");
    if (!json.funnel.config) throw new Error("missing config");
    if (!Array.isArray(json.funnel.config.bundleTiers)) throw new Error("missing bundleTiers");
    if (json.funnel.config.bundleTiers.length < 2) throw new Error("expected at least 2 tiers");
    return `${json.funnel.status} · ${json.funnel.config.bundleTiers.length} tiers`;
  });

  // 2) POST funnel order
  await test("POST /funnels/public/socks/order records tracking", async () => {
    const res = await fetch(`${BASE}/funnels/public/socks/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Test User",
        phone: "01000000000",
        address: "Test address",
        city: "Cairo",
        quantity: 3,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.trackingId) throw new Error("missing trackingId");
    return `trackingId=${json.trackingId}`;
  });

  // 3) POST quick-generate (requires auth — may fail in dev)
  await test("POST /funnels/quick-generate creates a draft funnel", async () => {
    const res = await fetch(`${BASE}/funnels/quick-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: "demo-product",
        title: "Smoke Test Funnel",
        slug: "smoke-test-funnel",
      }),
    });
    // 401 is acceptable in dev (no auth token) — anything else is a pass
    if (res.status === 401) return "401 (auth required — expected in dev)";
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.funnel) throw new Error("missing funnel in response");
    return `slug=${json.funnel.slug} status=${json.funnel.status}`;
  });

  // 4) Bad slug → still 200 (graceful fallback)
  await test("GET /funnels/public/non-existent-slug returns 200 fallback", async () => {
    const res = await fetch(`${BASE}/funnels/public/non-existent-${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.funnel?.status !== "PUBLISHED") throw new Error("expected fallback PUBLISHED");
    return "200 with demo fallback";
  });

  console.log(`\n${COLORS.dim}Done.${COLORS.reset}\n`);
})();
