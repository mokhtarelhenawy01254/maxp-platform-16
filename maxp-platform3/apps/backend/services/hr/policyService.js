/**
 * 📝 Policy Service
 * خدمة إدارة سياسات الشركة
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const auditService = require('./auditService');

class PolicyService {
    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * إنشاء سياسة جديدة
     */
    async createPolicy(companyId, data, actorId) {
        try {
            console.log(`📡 [POLICY-SERVICE] createPolicy start... companyId=${companyId}`);
            const policy = await this.prisma.companyPolicy.create({
                data: {
                    companyId,
                    title: data.title,
                    content: data.content,
                    category: data.category || 'general',
                    isActive: data.isActive ?? true,
                    version: 1,
                    effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
                }
            });
            console.log(`✅ [POLICY-SERVICE] DB Record created: ${policy.id}`);

            console.log(`📝 [POLICY-SERVICE] Logging audit action...`);
            await auditService.logAction(
                companyId,
                actorId,
                'CREATE',
                'POLICY',
                policy.id,
                { title: policy.title },
                null // actorName will be fetched
            );
            console.log(`✅ [POLICY-SERVICE] Audit logged.`);

            return policy;
        } catch (error) {
            console.error('❌ [POLICY-SERVICE] Error creating policy:', error);
            throw new Error('فشل في إنشاء السياسة: ' + error.message);
        }
    }

    /**
     * تحديث سياسة
     */
    async updatePolicy(companyId, policyId, data, actorId) {
        try {
            console.log(`📡 [POLICY-SERVICE] updatePolicy start... policyId=${policyId}`);
            const existing = await this.prisma.companyPolicy.findUnique({
                where: { id: policyId }
            });

            if (!existing || existing.companyId !== companyId) {
                console.warn(`⚠️ [POLICY-SERVICE] Policy not found or mismatch: ${policyId}`);
                throw new Error('السياسة غير موجودة');
            }

            console.log(`📡 [POLICY-SERVICE] Updating DB Record...`);
            const policy = await this.prisma.companyPolicy.update({
                where: { id: policyId },
                data: {
                    title: data.title,
                    content: data.content,
                    category: data.category,
                    isActive: data.isActive,
                    version: { increment: 1 }, // Auto-increment version
                    updatedAt: new Date()
                }
            });
            console.log(`✅ [POLICY-SERVICE] DB Record updated: ${policy.id}`);

            console.log(`📝 [POLICY-SERVICE] Logging audit action...`);
            await auditService.logAction(
                companyId,
                actorId,
                'UPDATE',
                'POLICY',
                policy.id,
                {
                    oldTitle: existing.title,
                    newTitle: policy.title,
                    version: policy.version
                }
            );
            console.log(`✅ [POLICY-SERVICE] Audit logged.`);

            return policy;
        } catch (error) {
            console.error('❌ [POLICY-SERVICE] Error updating policy:', error);
            throw new Error('فشل في تحديث السياسة: ' + error.message);
        }
    }

    /**
     * حذف سياسة (Soft Delete by default, or Hard Delete)
     * Using Hard Delete as per likely requirement, or toggle isActive
     */
    async deletePolicy(companyId, policyId, actorId) {
        try {
            console.log(`📡 [POLICY-SERVICE] deletePolicy start... policyId=${policyId}`);
            const existing = await this.prisma.companyPolicy.findUnique({
                where: { id: policyId }
            });

            if (!existing || existing.companyId !== companyId) {
                console.warn(`⚠️ [POLICY-SERVICE] Policy not found or mismatch for deletion: ${policyId}`);
                throw new Error('السياسة غير موجودة');
            }

            console.log(`📡 [POLICY-SERVICE] Deleting DB Record...`);
            await this.prisma.companyPolicy.delete({
                where: { id: policyId }
            });
            console.log(`✅ [POLICY-SERVICE] DB Record deleted: ${policyId}`);

            console.log(`📝 [POLICY-SERVICE] Logging audit action...`);
            await auditService.logAction(
                companyId,
                actorId,
                'DELETE',
                'POLICY',
                policyId,
                { title: existing.title }
            );
            console.log(`✅ [POLICY-SERVICE] Audit logged.`);

            return { success: true, message: 'تم حذف السياسة بنجاح' };
        } catch (error) {
            console.error('❌ [POLICY-SERVICE] Error deleting policy:', error);
            throw new Error('فشل في حذف السياسة: ' + error.message);
        }
    }

    /**
     * جلب السياسات
     */
    async getPolicies(companyId, options = {}) {
        try {
            const { category, search } = options;
            const where = { companyId };

            if (category && category !== 'all') {
                where.category = category;
            }

            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { content: { contains: search, mode: 'insensitive' } }
                ];
            }

            const policies = await this.prisma.companyPolicy.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            return policies;
        } catch (error) {
            console.error('❌ Error getting policies:', error);
            throw new Error('فشل في جلب السياسات');
        }
    }
}

module.exports = new PolicyService();
