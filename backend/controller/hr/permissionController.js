/**
 * 🕒 Permission Controller
 * متحكم إدارة الأذونات
 */

const permissionService = require('../../services/hr/permissionService');

/**
 * إنشاء طلب إذن جديد
 */
exports.createPermissionRequest = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        // Prioritize body for managers, fallback to user.employeeId, finally fallback to user.id (which service will handle)
        let employeeId = req.body.employeeId || req.user.employeeId;

        if (!employeeId && req.user && req.user.id) {
            console.log(`⚠️ [Permission Controller] No employeeId found, falling back to userId: ${req.user.id}`);
            employeeId = req.user.id;
        }

        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الموظف مطلوب'
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        const permission = await permissionService.createPermissionRequest(companyId, employeeId, req.body);

        res.status(201).json({
            success: true,
            data: permission
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء إنشاء طلب الإذن'
        });
    }
};

/**
 * الحصول على قائمة طلبات الأذونات
 */
exports.getPermissionRequests = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        // 🔐 Security: If user is an employee, only show their own requests
        const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(req.user.role || '');

        // If 'mine' is true, or if it's not a manager, restrict to their own employeeId
        let employeeId;
        if (req.query.mine === 'true' || !isManager) {
            employeeId = req.user.employeeId;
            // If still no employeeId, even for a manager viewing their own, they should see NOTHING
            if (!employeeId) {
                return res.json({
                    success: true,
                    requests: [],
                    total: 0,
                    pagination: { page: req.query.page || 1, limit: req.query.limit || 20, total: 0, totalPages: 0 }
                });
            }
        } else {
            // Manager viewing others or everyone
            employeeId = req.query.employeeId;
        }

        const options = {
            employeeId: employeeId,
            status: req.query.status,
            type: req.query.type,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await permissionService.getPermissionRequests(companyId, options);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب طلبات الأذونات'
        });
    }
};

/**
 * الحصول على طلب إذن بالـ ID
 */
exports.getPermissionRequestById = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        const { requestId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        const permission = await permissionService.getPermissionRequestById(companyId, requestId);

        // 🔐 Security: Check if user has permission to view this request
        const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(req.user.role || '');
        const isOwner = permission.employeeId === req.user.employeeId;

        if (!isManager && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول لهذا المستند'
            });
        }

        res.json({
            success: true,
            data: permission
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'المستند غير موجود'
        });
    }
};

/**
 * الموافقة على طلب إذن
 */
exports.approvePermissionRequest = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        const { requestId } = req.params;
        const approverEmployeeId = req.user.employeeId || req.user.id; // نستخدم الـ employeeId إذا وجد، وإلا الـ userId

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        const result = await permissionService.approvePermissionRequest(companyId, requestId, approverEmployeeId);

        res.json({
            success: true,
            data: result,
            message: 'تمت الموافقة على الطلب بنجاح'
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء الموافقة على الطلب'
        });
    }
};

/**
 * رفض طلب إذن
 */
exports.rejectPermissionRequest = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        const { requestId } = req.params;
        const { reason } = req.body;
        const approverEmployeeId = req.user.employeeId || req.user.id;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'سبب الرفض مطلوب'
            });
        }

        const result = await permissionService.rejectPermissionRequest(companyId, requestId, approverEmployeeId, reason);

        res.json({
            success: true,
            data: result,
            message: 'تم رفض الطلب'
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء رفض الطلب'
        });
    }
};

/**
 * الحصول على إحصائيات الأذونات
 */
exports.getPermissionStats = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(req.user.role || '');

        let targetEmployeeId;
        if (req.query.mine === 'true' || !isManager) {
            targetEmployeeId = req.user.employeeId;
            // If No employee profile and they are requesting their own, return empty stats
            if (!targetEmployeeId) {
                return res.json({
                    success: true,
                    data: {
                        totalRequests: 0,
                        pendingCount: 0,
                        totalHours: 0,
                        byType: { DEDUCTIBLE: 0, NON_DEDUCTIBLE: 0, FIXED_HOURS: 0, COMPENSATORY: 0 }
                    }
                });
            }
        } else {
            targetEmployeeId = req.query.employeeId;
        }

        const stats = await permissionService.getPermissionStats(companyId, targetEmployeeId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء جلب الإحصائيات'
        });
    }
};

/**
 * حذف طلب إذن
 */
exports.deletePermissionRequest = async (req, res) => {
    try {
        const companyId = req.params.companyId || req.user.companyId;
        const { requestId } = req.params;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: 'معرف الشركة مطلوب'
            });
        }

        // 🔐 Security check
        const permission = await permissionService.getPermissionRequestById(companyId, requestId);
        const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(req.user.role || '');
        const isOwner = permission.employeeId === req.user.employeeId;

        if (!isManager && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف هذا الطلب'
            });
        }

        // Employees can only delete PENDING requests
        if (!isManager && permission.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف الطلب بعد معالجته (قبول/رفض)'
            });
        }

        const result = await permissionService.deletePermissionRequest(companyId, requestId);

        res.json(result);
    } catch (error) {
        console.error('❌ Controller Error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'حدث خطأ أثناء حذف طلب الإذن'
        });
    }
};

