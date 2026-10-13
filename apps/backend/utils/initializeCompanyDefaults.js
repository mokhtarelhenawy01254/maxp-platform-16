const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * Initialize the complete SaaS theme for a new company.
 * Accepts an optional themeId override (from BusinessSpecialty) — when set,
 * loads the matching theme preset from the frontend storefront themes folder.
 */
async function initializeSaasTheme(companyId, options = {}) {
  try {
    const requestedThemeId = String(options.themeId || '').trim();
    console.log(`🎨 [INIT] Initializing theme ${requestedThemeId || 'Elegance V1'} for company: ${companyId}`);

    // 1. Load the theme JSON
    let theme = null;
    let themePath = path.join(__dirname, '..', 'defaults', 'saas_theme_v1.json');

    if (requestedThemeId) {
      const candidates = [
        // monorepo checkout (local dev / CI)
        path.join(__dirname, '..', '..', 'apps', 'frontend', 'src', 'storefront', 'themes', `${requestedThemeId}.json`),
        // repo-relative when running from backend dir
        path.join(__dirname, '..', '..', 'frontend', 'src', 'storefront', 'themes', `${requestedThemeId}.json`),
        // production server layout (deploy syncs presets under frontend2)
        path.join('/', 'var', 'www', 'frontend2', 'src', 'storefront', 'themes', `${requestedThemeId}.json`),
      ];
      // explicit env override wins over every convention
      if (process.env.FRONTEND_THEMES_DIR) {
        candidates.unshift(path.join(process.env.FRONTEND_THEMES_DIR, `${requestedThemeId}.json`));
      }
      const candidatePath = candidates.find((p) => fs.existsSync(p)) || null;
      if (candidatePath) {
        themePath = candidatePath;
      } else {
        console.warn(`⚠️ [INIT] Theme file not found for "${requestedThemeId}", falling back to default.`);
      }
    }

    if (!fs.existsSync(themePath)) {
      console.error('❌ [INIT] Default theme file not found at:', themePath);
      return { success: false, error: 'Theme file missing' };
    }
    theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));

    // Ensure designTokens carry the resolved themeId so the storefront renders the right preset
    const designTokens = {
      ...(theme.designTokens || {}),
      ...(requestedThemeId ? { themeId: requestedThemeId } : {}),
    };

    // 2. Initialize Storefront Settings with Design Tokens
    await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();

      // Upsert storefront settings with design tokens
      await prisma.storefrontSettings.upsert({
        where: { companyId },
        update: {
          designTokens,
        },
        create: {
          companyId,
          designTokens,
          supportedLanguages: "ar,en"
        }
      });
    });

    // 3. Initialize Theme Pages
    for (const [key, pageDef] of Object.entries(theme.pages || {})) {
      await executeWithRetry(async () => {
        const prisma = getSharedPrismaClient();

        // Generate a slug if not provided, else use key
        const slug = key === 'homepage' ? 'index' : (pageDef.slug || key);

        await prisma.storePage.upsert({
          where: { companyId_slug: { companyId, slug } },
          update: {
            title: pageDef.title,
            pageType: pageDef.pageType || 'CUSTOM',
            publishedContent: pageDef.sections,
            draftContent: pageDef.sections,
            isActive: true
          },
          create: {
            companyId,
            title: pageDef.title,
            slug,
            content: pageDef.title, // Fallback
            pageType: pageDef.pageType || 'CUSTOM',
            publishedContent: pageDef.sections,
            draftContent: pageDef.sections,
            isActive: true,
            showInFooter: true
          }
        });
      });
    }

    console.log(`✅ [INIT] Theme "${requestedThemeId || theme.themeName || 'Elegance V1'}" initialized for ${companyId}`);
    return { success: true, theme: theme.themeName || requestedThemeId };
  } catch (error) {
    console.error(`❌ [INIT] Error initializing theme:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize default store pages for a new company (Legacy/Policies)
 */
async function initializeDefaultStorePages(companyId) {
  try {
    console.log(`📄 [INIT] Initializing policy pages for company: ${companyId}`);

    const defaultPages = [
      {
        title: 'سياسة الشحن والتوصيل',
        slug: 'shipping-policy',
        pageType: 'SHIPPING_POLICY',
        content: `<h2>سياسة الشحن والتوصيل</h2><p>توصيل لجميع المحافظات...</p>`,
        order: 1,
        showInFooter: true,
        isActive: true
      },
      {
        title: 'سياسة الإرجاع والاستبدال',
        slug: 'return-policy',
        pageType: 'RETURN_POLICY',
        content: `<h2>سياسة الإرجاع والاستبدال</h2><p>رضاك يهمنا...</p>`,
        order: 2,
        showInFooter: true,
        isActive: true
      },
      {
        title: 'سياسة الخصوصية',
        slug: 'privacy-policy',
        pageType: 'PRIVACY_POLICY',
        content: `<h2>سياسة الخصوصية</h2><p>نحن نحترم خصوصيتك...</p>`,
        order: 3,
        showInFooter: true,
        isActive: true
      }
    ];

    const prisma = getSharedPrismaClient();
    for (const page of defaultPages) {
      const { content, title, pageType, order, showInFooter, isActive } = page;
      await prisma.storePage.upsert({
        where: { companyId_slug: { companyId, slug: page.slug } },
        update: { content, title, isActive, showInFooter },
        create: { companyId, slug: page.slug, content, title, pageType, order, showInFooter, isActive }
      });
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ [INIT] Error initializing policies:`, error);
    return { success: false };
  }
}

/**
 * Initialize default apps for a new company
 */
async function initializeDefaultApps(companyId, options = {}) {
  try {
    console.log(`🚀 [INIT] Initializing default apps for company: ${companyId}`);
    const prisma = getSharedPrismaClient();
    const specialtyAppSlugs = Array.isArray(options.specialtyAppSlugs)
      ? options.specialtyAppSlugs.map((slug) => String(slug || '').trim()).filter(Boolean)
      : [];
    if (specialtyAppSlugs.length > 0) {
      const businessSpecialtyService = require('../services/businessSpecialtyService');
      const resolution = await businessSpecialtyService.ensureMarketplaceAppsBySlugs(specialtyAppSlugs, {
        prisma,
      });
      const appsBySlug = new Map(resolution.apps.map((app) => [app.slug, app]));
      const specialtyApps = specialtyAppSlugs.map((slug) => appsBySlug.get(slug)).filter(Boolean);

      for (const app of specialtyApps) {
        // 🛡️ Safety: Non-store apps with PAY_PER_USE catalog pricing must be FREE during onboarding
        const resolvedPricingModel = (app.pricingModel === 'PAY_PER_USE' && app.slug !== 'store')
          ? 'FREE'
          : (app.pricingModel || 'SUBSCRIPTION');

        const trialDays = Number(options.trialDays || 0);
        const isTrial = trialDays > 0;
        const trialEndsAt = isTrial ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
        const isFreeApp = resolvedPricingModel === 'FREE' && Number(app.monthlyPrice || 0) === 0;
        const appStatus = isFreeApp ? 'ACTIVE' : (isTrial ? 'TRIAL' : 'ACTIVE');

        await prisma.companyApp.upsert({
          where: { companyId_appId: { companyId, appId: app.id } },
          update: {
            status: appStatus,
            activePricingModel: resolvedPricingModel,
            trialEndsAt: isFreeApp ? null : trialEndsAt,
            installedInTrial: isTrial && !isFreeApp,
            settings: {
              onboarding: {
                source: options.source || 'signup-specialty',
                specialtySlug: options.specialtySlug || null,
              },
            },
          },
          create: {
            companyId,
            appId: app.id,
            status: appStatus,
            activePricingModel: resolvedPricingModel,
            trialEndsAt: isFreeApp ? null : trialEndsAt,
            installedInTrial: isTrial && !isFreeApp,
            settings: {
              onboarding: {
                source: options.source || 'signup-specialty',
                specialtySlug: options.specialtySlug || null,
              },
            },
          },
        });
      }

      if (resolution.missingSlugs.length > 0) {
        console.warn('[INIT] Missing specialty apps during signup:', resolution.missingSlugs);
      }

      return { success: true, installedCount: specialtyApps.length };
    }

    return { success: true, installedCount: 0 };
  } catch (error) {
    console.error(`❌ [INIT] Error auto-installing apps:`, error);
    return { success: false };
  }
}

module.exports = {
  initializeSaasTheme,
  initializeDefaultStorePages,
  initializeDefaultApps
};
