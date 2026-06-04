const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * Initialize the complete SaaS theme (Elegance V1) for a new company
 */
async function initializeSaasTheme(companyId) {
  try {
    console.log(`🎨 [INIT] Initializing SaaS Theme (Elegance V1) for company: ${companyId}`);

    // 1. Load the theme JSON
    const themePath = path.join(__dirname, '..', 'defaults', 'saas_theme_v1.json');
    if (!fs.existsSync(themePath)) {
      console.error('❌ [INIT] Default theme file not found at:', themePath);
      return { success: false, error: 'Theme file missing' };
    }
    const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));

    // 2. Initialize Storefront Settings with Design Tokens
    await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();

      // Upsert storefront settings with design tokens
      await prisma.storefrontSettings.upsert({
        where: { companyId },
        update: {
          designTokens: theme.designTokens,
        },
        create: {
          companyId,
          designTokens: theme.designTokens,
          supportedLanguages: "ar,en"
        }
      });
    });

    // 3. Initialize Theme Pages
    for (const [key, pageDef] of Object.entries(theme.pages)) {
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

    console.log(`✅ [INIT] SaaS Theme "Elegance V1" initialized for ${companyId}`);
    return { success: true, theme: theme.themeName };
  } catch (error) {
    console.error(`❌ [INIT] Error initializing SaaS theme:`, error);
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
    const requiredDefaultAppSlugs = ['ecommerce-basic'];
    const specialtyAppSlugs = Array.isArray(options.specialtyAppSlugs)
      ? options.specialtyAppSlugs.map((slug) => String(slug || '').trim()).filter(Boolean)
      : [];
    const trialDays = Math.max(0, Number.parseInt(String(options.trialDays ?? 0), 10) || 0);
    const trialEndsAt = trialDays > 0
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      : null;

    if (specialtyAppSlugs.length > 0) {
      const businessSpecialtyService = require('../services/businessSpecialtyService');
      const resolution = await businessSpecialtyService.ensureMarketplaceAppsBySlugs(specialtyAppSlugs, {
        prisma,
      });
      const appsBySlug = new Map(resolution.apps.map((app) => [app.slug, app]));
      const specialtyApps = specialtyAppSlugs.map((slug) => appsBySlug.get(slug)).filter(Boolean);

      for (const app of specialtyApps) {
        await prisma.companyApp.upsert({
          where: { companyId_appId: { companyId, appId: app.id } },
          update: {
            status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
            trialEndsAt,
            activePricingModel: app.pricingModel || 'SUBSCRIPTION',
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
            status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
            trialEndsAt,
            activePricingModel: app.pricingModel || 'SUBSCRIPTION',
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

    if (options.specialtySlug) {
      return { success: true, installedCount: 0 };
    }

    const [featuredApps, requiredApps] = await Promise.all([
      prisma.marketplaceApp.findMany({
        where: {
          isFeatured: true,
          isActive: true,
          category: {
            notIn: ['THEME', 'TEMPLATE'],
          },
        }
      }),
      prisma.marketplaceApp.findMany({
        where: {
          slug: {
            in: requiredDefaultAppSlugs,
          },
          isActive: true,
          category: {
            notIn: ['THEME', 'TEMPLATE'],
          },
        }
      })
    ]);

    const autoInstallApps = Array.from(
      new Map(
        [...featuredApps, ...requiredApps].map((app) => [app.id, app])
      ).values()
    );

    for (const app of autoInstallApps) {
      await prisma.companyApp.upsert({
        where: { companyId_appId: { companyId, appId: app.id } },
        update: {
          status: 'ACTIVE',
          activePricingModel: app.pricingModel || 'SUBSCRIPTION',
        },
        create: {
          companyId,
          appId: app.id,
          status: 'ACTIVE',
          activePricingModel: app.pricingModel || 'SUBSCRIPTION'
        }
      });
    }

    return { success: true };
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
