/**
 * @file remove-dental-from-huinzo.js
 * @description Diagnostic and cleanup script to remove Dental Lab module and associated
 * apps / specialties / settings from the company "huinzo" (or specified company identifier).
 *
 * Usage:
 *   DRY_RUN=true node apps/backend/scripts/one-off/remove-dental-from-huinzo.js
 *   DRY_RUN=false node apps/backend/scripts/one-off/remove-dental-from-huinzo.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
} catch (_) {}

const { getSharedPrismaClientAsync } = require('../../services/sharedDatabase');
const companyCacheService = require('../../services/companyCacheService');
const redisCacheService = require('../../services/redisCacheService');

const TARGET_SEARCH = process.env.COMPANY_IDENTIFIER || 'huinzo';
const IS_DRY_RUN = process.env.DRY_RUN !== 'false';

const DENTAL_APP_SLUGS = [
  'dental-lab-app',
  'dental-lab',
  'dental-lab-elite',
  'dental-materials-pro',
  'cat-app-dental-lab-app'
];

async function main() {
  console.log('===========================================================');
  console.log(`🔍 [REMOVE-DENTAL] Target Identifier: "${TARGET_SEARCH}"`);
  console.log(`⚙️  [REMOVE-DENTAL] Mode: ${IS_DRY_RUN ? 'DRY RUN (No changes)' : 'APPLY (Modifying Database)'}`);
  console.log('===========================================================');

  const prisma = await getSharedPrismaClientAsync();

  // 1. Search for matching companies
  const matchingCompanies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: { contains: TARGET_SEARCH, mode: 'insensitive' } },
        { name: { contains: TARGET_SEARCH, mode: 'insensitive' } },
        { email: { contains: TARGET_SEARCH, mode: 'insensitive' } },
        { id: TARGET_SEARCH }
      ]
    },
    include: {
      businessSpecialty: true,
      installedApps: {
        include: {
          app: true
        }
      }
    }
  });

  if (matchingCompanies.length === 0) {
    console.log(`⚠️  No company found matching "${TARGET_SEARCH}".`);

    const dentalCompanies = await prisma.company.findMany({
      where: {
        OR: [
          { businessSpecialtyId: 'bizsp_dental_lab' },
          { businessSpecialty: { slug: 'dental-lab' } }
        ]
      },
      select: { id: true, name: true, slug: true, email: true }
    });
    console.log(`ℹ️  Companies with Dental Lab specialty in system:`, dentalCompanies);
    return;
  }

  console.log(`✅ Found ${matchingCompanies.length} matching company(ies):\n`);

  for (const company of matchingCompanies) {
    console.log('-----------------------------------------------------------');
    console.log(`🏢 Company ID: ${company.id}`);
    console.log(`   Name:       ${company.name}`);
    console.log(`   Slug:       ${company.slug || '(none)'}`);
    console.log(`   Email:      ${company.email}`);
    console.log(`   Specialty:  ${company.businessSpecialty ? `${company.businessSpecialty.slug} (${company.businessSpecialty.nameAr})` : 'None'} [ID: ${company.businessSpecialtyId || 'null'}]`);
    console.log(`   Total Apps: ${company.installedApps.length}`);

    // Inspect Installed Apps
    const dentalAppsInstalled = company.installedApps.filter((ca) => {
      const slug = (ca.app?.slug || '').toLowerCase();
      return DENTAL_APP_SLUGS.includes(slug) || slug.includes('dental');
    });

    console.log(`\n📦 Installed Apps List:`);
    company.installedApps.forEach((ca) => {
      const isDental = dentalAppsInstalled.some((d) => d.id === ca.id);
      console.log(`   - ${ca.app?.slug} [${ca.app?.name}] | Status: ${ca.status} | ID: ${ca.id} ${isDental ? '⚠️ [DENTAL TARGET]' : ''}`);
    });

    // Inspect Dental Technicians in DB
    let dentalTechs = [];
    try {
      if (prisma.dentalTechnician) {
        dentalTechs = await prisma.dentalTechnician.findMany({
          where: { companyId: company.id }
        });
      }
    } catch (_) {}

    console.log(`\n🦷 Dental Technicians Count: ${dentalTechs.length}`);
    if (dentalTechs.length > 0) {
      dentalTechs.forEach((dt) => console.log(`   - ${dt.name} (Phone: ${dt.phone || 'none'}) [ID: ${dt.id}]`));
    }

    // Inspect Sidebar Preferences
    let hasDentalInSidebar = false;
    if (company.sidebarPreferences) {
      const prefsString = JSON.stringify(company.sidebarPreferences);
      if (prefsString.includes('dental')) {
        hasDentalInSidebar = true;
        console.log(`⚠️  SidebarPreferences contains dental references.`);
      }
    }

    const isDentalSpecialty =
      company.businessSpecialtyId === 'bizsp_dental_lab' ||
      company.businessSpecialty?.slug === 'dental-lab';

    console.log(`\n📋 Actions Required for "${company.name}":`);
    console.log(`   - Dental apps to delete/uninstall: ${dentalAppsInstalled.length}`);
    console.log(`   - Dental specialty to reset:        ${isDentalSpecialty ? 'YES' : 'NO'}`);
    console.log(`   - Dental technicians to deactivate: ${dentalTechs.length}`);
    console.log(`   - SidebarPreferences to clean:      ${hasDentalInSidebar ? 'YES' : 'NO'}`);

    if (IS_DRY_RUN) {
      console.log(`\n🔒 [DRY RUN] No changes were applied. Run with DRY_RUN=false to execute.`);
      continue;
    }

    console.log(`\n🚀 [APPLY] Executing cleanup...`);

    // 1. Delete all dental CompanyApp records
    if (dentalAppsInstalled.length > 0) {
      const appRecordIds = dentalAppsInstalled.map((d) => d.id);
      const delResult = await prisma.companyApp.deleteMany({
        where: { id: { in: appRecordIds } }
      });
      console.log(`   ✓ Deleted ${delResult.count} dental CompanyApp record(s).`);
    }

    // 2. Reset business specialty if it was dental-lab
    if (isDentalSpecialty) {
      await prisma.company.update({
        where: { id: company.id },
        data: { businessSpecialtyId: null }
      });
      console.log(`   ✓ Reset businessSpecialtyId to null.`);
    }

    // 3. Deactivate or remove dental technicians
    if (dentalTechs.length > 0 && prisma.dentalTechnician) {
      const techUpdate = await prisma.dentalTechnician.updateMany({
        where: { companyId: company.id },
        data: { isActive: false }
      });
      console.log(`   ✓ Deactivated ${techUpdate.count} dental technician(s).`);
    }

    // 4. Clean sidebar preferences if present
    if (hasDentalInSidebar) {
      let cleanedPrefs = null;
      try {
        const raw = company.sidebarPreferences;
        if (typeof raw === 'object' && raw !== null) {
          cleanedPrefs = { ...raw };
          if (Array.isArray(cleanedPrefs.customItems)) {
            cleanedPrefs.customItems = cleanedPrefs.customItems.filter(
              (item) => !String(item.key || '').includes('dental')
            );
          }
          if (Array.isArray(cleanedPrefs.pinnedSections)) {
            cleanedPrefs.pinnedSections = cleanedPrefs.pinnedSections.filter(
              (sec) => !String(sec).includes('dental')
            );
          }
          if (Array.isArray(cleanedPrefs.hiddenSections)) {
            cleanedPrefs.hiddenSections = cleanedPrefs.hiddenSections.filter(
              (sec) => !String(sec).includes('dental')
            );
          }
        }
      } catch (e) {
        cleanedPrefs = null;
      }
      await prisma.company.update({
        where: { id: company.id },
        data: { sidebarPreferences: cleanedPrefs }
      });
      console.log(`   ✓ Cleaned sidebarPreferences.`);
    }

    // 5. Invalidate caches
    try {
      if (companyCacheService && typeof companyCacheService.invalidateCompanyCache === 'function') {
        await companyCacheService.invalidateCompanyCache(company.id);
        console.log(`   ✓ Invalidated in-memory & company cache.`);
      }
    } catch (e) {
      console.warn(`   ⚠️ companyCacheService invalidation warning:`, e.message);
    }

    try {
      if (redisCacheService && typeof redisCacheService.delPattern === 'function') {
        await redisCacheService.delPattern(`*${company.id}*`);
        await redisCacheService.delPattern(`company:${company.id}*`);
        await redisCacheService.delPattern(`apps:${company.id}*`);
        await redisCacheService.delPattern(`sidebar:${company.id}*`);
        console.log(`   ✓ Purged Redis keys matching company ID.`);
      }
    } catch (e) {
      console.warn(`   ⚠️ redisCacheService purge warning:`, e.message);
    }

    // 6. Log ActivityLog entry
    try {
      if (prisma.activityLog) {
        await prisma.activityLog.create({
          data: {
            companyId: company.id,
            category: 'MARKETPLACE',
            action: 'UNINSTALL_APP',
            description: `إزالة تطبيق معمل الأسنان بالكامل من شركة ${company.name}`,
            targetType: 'APP',
            targetId: 'dental-lab-app',
            targetName: 'معمل الأسنان',
            metadata: JSON.stringify({
              reason: 'Unsubscribed company - dental lab removed',
              removedAt: new Date().toISOString()
            }),
            severity: 'MEDIUM',
            isSuccess: true
          }
        });
        console.log(`   ✓ Recorded ActivityLog audit trail.`);
      }
    } catch (e) {
      console.warn(`   ⚠️ ActivityLog warning:`, e.message);
    }

    console.log(`\n🎉 Company "${company.name}" successfully cleansed of Dental Lab!`);
  }

  console.log('\n===========================================================');
  console.log('✅ [REMOVE-DENTAL] Script finished successfully.');
  console.log('===========================================================');
}

main()
  .catch((err) => {
    console.error('❌ [REMOVE-DENTAL] Script failed with error:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
