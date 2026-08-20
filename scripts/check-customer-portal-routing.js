#!/usr/bin/env node
/**
 * check-customer-portal-routing.js
 *
 * Guard: يضمن إن ميزة "بوابة كل شركة على الـ subdomain" ما تتكسرش
 * لما agents تانيين يدمجوا شغل على نفس الريبو.
 *
 * يفحص 3 ثوابت معمارية:
 *  1) requestTarget.ts  -> لسه فيه إقصاء /account و /auth/customer-register من الـ storefront
 *  2) StorefrontShell.tsx -> مفيش مكونات البوابة متستوردة جوه محرك المتجر (منع الاعتماد الدائري)
 *  3) CustomerRegister.tsx -> مش بيستورد getCompanyId من storefrontApi (منع الدائرة)
 *
 * لو أي ثابت اتكسر -> exit 1 -> الـ CI يوقف الـ deploy قبل ما ينزل كسر صامت.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  requestTarget: path.join(ROOT, 'apps', 'frontend', 'src', 'bootstrap', 'requestTarget.ts'),
  storefrontShell: path.join(ROOT, 'apps', 'frontend', 'src', 'storefront', 'StorefrontShell.tsx'),
  customerRegister: path.join(ROOT, 'apps', 'frontend', 'src', 'pages', 'auth', 'CustomerRegister.tsx'),
};

let failures = 0;

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    failures++;
    console.error(`❌ BLOCK: Cannot read ${path.relative(ROOT, filePath)} — ${e.message}`);
    return '';
  }
}

// ── 1) requestTarget.ts: لازم يبقى فيه إقصاء مسارات البوابة ──
{
  const src = read(FILES.requestTarget);
  const hasAccount = src.includes('pathname === "/account"') || src.includes('pathname.startsWith("/account/")');
  const hasRegister = src.includes('"/auth/customer-register"');
  if (!hasAccount || !hasRegister) {
    failures++;
    console.error(
      `❌ BLOCK: apps/frontend/src/bootstrap/requestTarget.ts must exclude customer-portal paths ` +
      `(/account + /auth/customer-register) from the storefront. An agent merge likely reverted this. ` +
      `hasAccount=${hasAccount} hasRegister=${hasRegister}`,
    );
  } else {
    console.log(`✅ requestTarget.ts keeps the customer-portal exclusion`);
  }
}

// ── 2) StorefrontShell.tsx: ممنوع استيراد البوابة جوه محرك المتجر ──
{
  const src = read(FILES.storefrontShell);
  const importsPortal = /import\("\.\.\/pages\/(account|auth)\//.test(src);
  const hasAccountRoute = src.includes('<Route path="/account"') || src.includes('path="/account"');
  const hasPortalConst = src.includes('CustomerPortalLayout');
  if (importsPortal || hasAccountRoute || hasPortalConst) {
    failures++;
    console.error(
      `❌ BLOCK: apps/frontend/src/storefront/StorefrontShell.tsx must NOT import/render the customer portal ` +
      `(creates a circular dependency that breaks the storefront). An agent merge likely re-added it. ` +
      `importsPortal=${importsPortal} hasAccountRoute=${hasAccountRoute} hasPortalConst=${hasPortalConst}`,
    );
  } else {
    console.log(`✅ StorefrontShell.tsx keeps the customer portal out of the storefront engine`);
  }
}

// ── 3) CustomerRegister.tsx: ممنوع getCompanyId من storefrontApi ──
{
  const src = read(FILES.customerRegister);
  const importsStorefrontApi = /import\s*\{[^}]*getCompanyId[^}]*\}\s*from\s*["']\.\.\/\.\.\/utils\/storefrontApi["']/.test(src) ||
    src.includes('getCompanyId } from "../../utils/storefrontApi"');
  if (importsStorefrontApi) {
    failures++;
    console.error(
      `❌ BLOCK: apps/frontend/src/pages/auth/CustomerRegister.tsx must NOT import getCompanyId from storefrontApi ` +
      `(pulls storefront modules into the portal graph and can create a cycle).`,
    );
  } else {
    console.log(`✅ CustomerRegister.tsx keeps the light subdomain fallback (no storefrontApi import)`);
  }
}

if (failures > 0) {
  console.error(`\n🚫 Customer-portal routing guard FAILED (${failures} violation(s)). Fix before deploying.`);
  process.exit(1);
}

console.log('\n✅ Customer-portal routing guard passed.');