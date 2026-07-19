/**
 * Migration Script: Migrate existing users to UserCompany table
 * 
 * This script creates UserCompany records for existing users based on their
 * current companyId. This enables multi-company support for all existing users.
 * 
 * Run with: node scripts/migrateExistingUsersToUserCompany.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const { PrismaClient } = require('../prisma/generated/postgresql_v2');

const prisma = new PrismaClient();

async function migrateUsersToUserCompany() {
  console.log('🔄 Starting migration of existing users to UserCompany table...\n');

  try {
    // Get all users with their company relationships
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 Found ${users.length} users to process\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Check if user already has a UserCompany record
        const existing = await prisma.userCompany.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: user.companyId
            }
          }
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${user.email} - already has UserCompany record`);
          skipped++;
          continue;
        }

        // Create UserCompany record
        await prisma.userCompany.create({
          data: {
            userId: user.id,
            companyId: user.companyId,
            role: user.role,
            isActive: true,
            isDefault: true
          }
        });

        console.log(`✅ Created: ${user.email} -> ${user.company?.name || 'Unknown'} (${user.role})`);
        created++;

      } catch (error) {
        console.error(`❌ Error for ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors:  ${errors}`);
    console.log(`   📊 Total:   ${users.length}`);

    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the logs.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateUsersToUserCompany();


