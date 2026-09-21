/**
 * 💰 Advance Request Controller
 * التحكم في طلبات السلف
 */

const advanceService = require('../services/hr/advanceService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * إنشاء طلب سلفة جديد
 */
exports.createAdvanceRequest = async (req, res) => {
    try {
        const { companyId, id: userId, role } = req.user;
        const canCreateForOthers = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(role);
        const payload = {
            ...req.body,
            employeeId: canCreateForOthers
                ? (req.body.employeeId || userId)
                : userId
        };

        const request = await advanceService.createRequest(companyId, payload);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء طلب السلفة بنجاح',
            data: request
        });
    } catch (error) {
        console.error('Error creating advance request:', error);

        // Check for known validation error messages
        const isValidationError = error.message && (
            error.message.includes('يجب') ||
            error.message.includes('الحد الأقصى') ||
            error.message.includes('لديك سلفة') ||
            error.message.includes('يرجى ضبط') ||
            error.message.includes('الموظف غير موجود')
        );

        res.status(isValidationError ? 400 : 500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء إنشاء الطلب'
        });
    }
};

/**
 * جلب إعدادات السلف للموظف الحالي
 */
exports.getMyAdvanceConfig = async (req, res) => {
    try {
        let { companyId, id: userId } = req.user;
        const prisma = getSharedPrismaClient();

        if (!companyId && userId) {
            const userRef = await prisma.user.findUnique({
                where: { id: userId },
                select: { companyId: true, userCompanies: { select: { companyId: true }, take: 1 } }
            });
            companyId = userRef?.companyId || userRef?.userCompanies?.[0]?.companyId;
            if (!companyId) {
                const firstCompany = await prisma.company.findFirst({ select: { id: true } });
                companyId = firstCompany?.id;
            }
        }

        let settings = null;
        if (companyId) {
            settings = await prisma.hRSettings.findUnique({
                where: { companyId }
            });

            if (!settings) {
                try {
                    const companyExists = await prisma.company.findUnique({
                        where: { id: companyId },
                        select: { id: true }
                    });
                    if (companyExists) {
                        settings = await prisma.hRSettings.create({
                            data: { companyId }
                        });
                    }
                } catch (e) {
                    // Fallback if concurrent create occurs
                    settings = await prisma.hRSettings.findUnique({
                        where: { companyId }
                    });
                }
            }
        }

        // Fetch employee base salary from User or Employee table
        let baseSalary = 0;
        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    baseSalary: true,
                    employees: {
                        ...(companyId ? { where: { companyId } } : {}),
                        select: { baseSalary: true }
                    }
                }
            });

            const empRecord = Array.isArray(user?.employees) ? user.employees[0] : user?.employees;
            baseSalary = Number(empRecord?.baseSalary || user?.baseSalary || 0);
        }

        const maxAdvancePercentage = Number(settings?.maxAdvancePercentage) || 50;
        const maxAllowedAmount = baseSalary > 0
            ? Math.floor((baseSalary * maxAdvancePercentage) / 100)
            : 0;

        res.json({
            success: true,
            settings: {
                maxAdvancePercentage,
                maxActiveAdvances: settings?.maxActiveAdvances || 1,
                minMonthsForAdvance: settings?.minMonthsForAdvance || 0,
                advanceRepaymentMonths: settings?.advanceRepaymentMonths || 12,
                baseSalary,
                maxAllowedAmount
            }
        });
    } catch (error) {
        console.error('Error fetching my advance config:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء جلب إعدادات السلف'
        });
    }
};

/**
 * الموافقة على طلب سلفة
 */
exports.approveAdvanceRequest = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { limit } = req.query;
        const { id } = req.params;

        const request = await advanceService.approveRequest(companyId, id, userId);

        res.json({
            success: true,
            message: 'تم الموافقة على الطلب بنجاح',
            data: request
        });
    } catch (error) {
        console.error('Error approving advance request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء الموافقة على الطلب'
        });
    }
};

/**
 * رفض طلب سلفة
 */
exports.rejectAdvanceRequest = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const request = await advanceService.rejectRequest(companyId, id, rejectionReason);

        res.json({
            success: true,
            message: 'تم رفض الطلب',
            data: request
        });
    } catch (error) {
        console.error('Error rejecting advance request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء رفض الطلب'
        });
    }
};

/**
 * تعليم السلفة كمسددة بالكامل
 */
exports.markAdvancePaid = async (req, res) => {
    try {
        const { companyId, id: userId, role } = req.user;
        const { id } = req.params;

        const result = await advanceService.markPaidOff(companyId, id, userId, role);

        res.json({
            success: true,
            message: 'تم تعليم السلفة كمسددة',
            data: result
        });
    } catch (error) {
        console.error('Error marking advance paid:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء تحديث حالة السداد'
        });
    }
};

/**
 * جلب طلبات السلف للموظف الحالي
 */
exports.getMyAdvances = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { limit } = req.query;

        // Pass userId directly (service uses it as userId internally)
        const requests = await advanceService.getMyAdvances(companyId, userId, {
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching my advances:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء جلب البيانات'
        });
    }
};

/**
 * جلب جميع طلبات السلف (للإدارة)
 */
exports.getAllAdvances = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status, page, limit } = req.query;

        const result = await advanceService.getAllAdvances(companyId, {
            status,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({
            success: true,
            data: result.requests,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('Error fetching all advances:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء جلب البيانات'
        });
    }
};

/**
 * حذف طلب سلفة
 */
exports.deleteAdvanceRequest = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        await advanceService.deleteRequest(companyId, id);

        res.json({
            success: true,
            message: 'تم حذف الطلب بنجاح'
        });
    } catch (error) {
        console.error('Error deleting advance request:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء حذف الطلب'
        });
    }
};

module.exports = exports;

