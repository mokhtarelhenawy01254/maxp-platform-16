# Storefront Theme Pack Release - 2026-04-25

## 2026-04-26 Refresh Layer

- `cutline-club` و`closet-os` تحولا من `svg` mock visuals إلى أصول فوتوغرافية محلية `jpg`.
- manifests المحدثة:
  - `frontend/src/storefront/themes/cutline-club.json`
  - `frontend/src/storefront/themes/closet-os.json`
- preview/runtime sync:
  - `frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `frontend/src/storefront/themes/catalog.ts`
  - `frontend/src/storefront/__tests__/themeCatalog.test.ts`
- copy direction:
  - إزالة اللغة التي تشرح "الثيم/المتجر"
  - تعظيم لغة البيع المباشر: القطعة، اللوك، المقاس، العرض، والتكرار
  - تحويل النصوص الظاهرة للعميل في `cutline-club` و`closet-os` إلى لهجة مصرية بيعّية أوضح
- verification refresh:
  - `npx.cmd vitest run src/storefront/__tests__/themeCatalog.test.ts src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `npm.cmd run validate:themes`
  - `npm.cmd run build`
- release sync / ops review:
  - `node --check scripts/verify-docs.js`
  - `C:\Program Files\Git\bin\bash.exe -n deploy.sh backend/deploy.sh backend/deploy-db-update.sh`
  - production SSH/health review on `153.92.223.119` with `pm2 list` and `curl http://127.0.0.1:3007/api/v1/health`

## Scope

- release slice: `cutline-club` + `closet-os`
- goal: شحن ثيمين ملابس مختلفين في المنطق نفسه، لا في palette أو الصور فقط
- supporting docs:
  - `docs/cutline-club-storefront-template-plan-2026-04-25.md`
  - `docs/closet-os-storefront-template-plan-2026-04-25.md`

## Shipped Themes

- `cutline-club`
  - identity: `street utility + youth club`
  - shopping logic: poster rail / release board / faster list-first browsing
  - runtime markers: `drop-board` hero, poster-style product cards, branded header rail, louder PDP tone
- `closet-os`
  - identity: `weekly wardrobe / capsule planner`
  - shopping logic: routine-first browsing / compatibility / repeat wear
  - runtime markers: `wardrobe-planner` hero, closet/planner cards, weekly shell rail, calmer PDP framing

## Runtime Changes

- manifests:
  - `frontend/src/storefront/themes/cutline-club.json`
  - `frontend/src/storefront/themes/closet-os.json`
- runtime layers:
  - `frontend/src/storefront/sections/HeroBanner.tsx`
  - `frontend/src/storefront/components/ProductCard.tsx`
  - `cutline-club` card readability fix by forcing the intended dark card surface in the custom list-card branch instead of inheriting the generic card token background
  - `frontend/src/storefront/StorefrontShell.tsx`
  - `cutline-club` header contrast fix so the branded dark shell stays visible instead of being overridden by the generic storefront background fallback
  - `closet-os` brand subtitle contrast bump for clearer readability on the light shell header
  - `frontend/src/storefront/sections/ProductInfo.tsx`
  - `frontend/src/storefront/sections/ConversionStack.tsx`
- preview runtime:
  - `frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `frontend/src/storefront/preview/marketplacePreviewCart.ts`
  - `frontend/src/storefront/preview/marketplacePreviewOrder.ts`

## Verification

- `npm.cmd run validate:themes` -> passed (`45` presets)
- `npx vitest run src/storefront/__tests__/themeCatalog.test.ts src/storefront/preview/__tests__/marketplaceSampleData.test.ts src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts` -> passed (`44` tests)
- `npm.cmd run build` -> passed
- `node --check scripts/verify-docs.js` -> passed
- `C:\Program Files\Git\bin\bash.exe -n deploy.sh backend/deploy.sh backend/deploy-db-update.sh` -> passed
- `ssh max-p-vps` production health check -> passed on `PORT=3007`

## Operational Notes

- `frontend/src/locales/en/translation.json` and `frontend/src/locales/ar/translation.json` are touched by `i18n:merge` during the normal frontend build path.
- Existing frontend warnings remain unchanged:
  - `Geist` font assets unresolved at build time
  - `vendor-ui-framework <-> vendor-mui` circular chunk note
  - chunk-size warnings over `500 kB`
- Production server review remained healthy:
  - host: `srv974554`
  - pm2 apps online: `maxp-backend`, `maxp-webhook-worker`
  - backend health: `status: OK`
