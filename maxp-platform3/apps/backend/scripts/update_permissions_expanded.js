const { t: i18n } = require('./i18n');
/**
 * Update DevSystemSettings with expanded permissions
 * New permissions: canChangeStatus, canArchive, canViewReports, canManageProjects, canExport
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updatePermissions() {
    try {
        console.log('🔄 Updating roles with expanded permissions...\n');

        const newPermissions = {
            'Project Manager': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                canViewReports: true,
                canManageProjects: true,
                canExport: true,
                viewScope: 'all'
            },
            'Team Lead': {
                canCreate: true,
                canEdit: true,
                canDelete: true,
                canChangeStatus: true,
                canComment: true,
                canAssign: true,
                canArchive: true,
                canViewReports: true,
                canManageProjects: false,
                canExport: true,
                viewScope: 'all'
            },
            'Agent': {
                canCreate: true,
                canEdit: true,
                canDelete: false,
                canChangeStatus: true,
                canComment: true,
                canAssign: false,
                canArchive: false,
                canViewReports: false,
                canManageProjects: false,
                canExport: false,
                viewScope: 'assigned'
            }
        };

        await prisma.devSystemSettings.upsert({
            where: { id: 'default' },
            update: {
                permissions: JSON.stringify(newPermissions)
            },
            create: {
                id: 'default',
                permissions: JSON.stringify(newPermissions)
            }
        });

        console.log('✅ Permissions updated successfully!\n');
        console.log('Expanded permissions now include:');
        console.log('  📋 Task Permissions:');
        console.log(i18n.t('msg.fb5521be'));
        console.log(i18n.t('msg.181498a4'));
        console.log(i18n.t('msg.e59fe1ab'));
        console.log(i18n.t('msg.a3eaa7b9'));
        console.log(i18n.t('msg.b55c67b4'));
        console.log(i18n.t('msg.d3c3665e'));
        console.log(i18n.t('msg.f8dee6dc'));
        console.log('  📊 Project & Reports:');
        console.log(i18n.t('msg.dc287c26'));
        console.log(i18n.t('msg.8a03b439'));
        console.log(i18n.t('msg.f59ad48c'));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updatePermissions();
