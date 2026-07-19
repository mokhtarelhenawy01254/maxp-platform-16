const { t: i18n } = require('./i18n');
/**
 * Migration Script: Update DevSystemSettings permissions to use Arabic roles
 * This script:
 * 1. Removes old English roles (developer, manager, admin)
 * 2. Adds new Arabic roles with proper permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRoles() {
    try {
        console.log('🔄 Starting Role Migration...\n');

        // 1. Fetch current settings
        const settings = await prisma.devSystemSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            console.log('❌ No DevSystemSettings found. Creating new one...');
        }

        // 2. Define new Arabic roles with permissions
        const newPermissions = {
            // Development Team Roles
            i18n.t('msg.1b4866fc'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            i18n.t('msg.42c482de'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            i18n.t('msg.6540adce'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            i18n.t('msg.20569e7e'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            i18n.t('msg.8f66ed0d'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'project'
            },
            i18n.t('msg.7f085c18'): {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canComment: true,
                canAssign: false,
                viewScope: 'all'
            },
            i18n.t('msg.75e19ed1'): {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            // Leadership Roles
            i18n.t('msg.0540e0dc'): {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            i18n.t('msg.84078f9c'): {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            },
            i18n.t('msg.be7a7e6d'): {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canComment: true,
                canAssign: true,
                viewScope: 'all'
            }
        };

        // 3. Update or create settings
        const updatedSettings = await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: {
                permissions: JSON.stringify(newPermissions)
            },
            create: {
                id: 'default',
                permissions: JSON.stringify(newPermissions)
            }
        });

        console.log('✅ Role Migration Completed!\n');
        console.log('New Roles configured:');
        Object.keys(newPermissions).forEach(role => {
            console.log(`   - ${role}`);
        });

        console.log('\n📊 Old English roles (developer, manager, admin) have been removed.');
        console.log('📊 New Arabic roles are now active with proper permissions.');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateRoles();
