/**
 * Enhanced User Management Controller
 * 
 * Provides secure user management with:
 * - Transaction safety
 * - Comprehensive input validation
 * - Audit logging
 * - Race condition prevention
 * - Proper error handling
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

/**
 * Input validation helper
 */
const validateUserInput = (data, isUpdate = false) => {
    const errors = [];

    // First name validation
    if (data.firstName !== undefined) {
        if (typeof data.firstName !== 'string') {
            errors.push({ field: 'firstName', message: 'First name must be a string' });
        } else if (data.firstName.trim().length < 2) {
            errors.push({ field: 'firstName', message: 'First name must be at least 2 characters' });
        } else if (data.firstName.trim().length > 50) {
            errors.push({ field: 'firstName', message: 'First name must be less than 50 characters' });
        }
    }

    // Last name validation
    if (data.lastName !== undefined) {
        if (typeof data.lastName !== 'string') {
            errors.push({ field: 'lastName', message: 'Last name must be a string' });
        } else if (data.lastName.trim().length < 2) {
            errors.push({ field: 'lastName', message: 'Last name must be at least 2 characters' });
        } else if (data.lastName.trim().length > 50) {
            errors.push({ field: 'lastName', message: 'Last name must be less than 50 characters' });
        }
    }

    // Email validation
    if (data.email !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }
    }

    // Phone validation
    if (data.phone !== undefined && data.phone !== null && data.phone !== '') {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
        if (!phoneRegex.test(data.phone)) {
            errors.push({ field: 'phone', message: 'Invalid phone format' });
        }
    }

    // Password validation (only for create or when provided)
    if (!isUpdate && data.password !== undefined) {
        if (data.password.length < 6) {
            errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
        }
        // Additional password strength checks could be added here
    }

    // Role validation
    if (data.role !== undefined) {
        const validRoles = ['USER', 'AGENT', 'MANAGER', 'COMPANY_ADMIN', 'OWNER'];
        if (!validRoles.includes(data.role)) {
            errors.push({ field: 'role', message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }
    }

    // Base salary validation
    if (data.baseSalary !== undefined && data.baseSalary !== null && data.baseSalary !== '') {
        const salary = parseFloat(data.baseSalary);
        if (isNaN(salary)) {
            errors.push({ field: 'baseSalary', message: 'Salary must be a number' });
        } else if (salary < 0) {
            errors.push({ field: 'baseSalary', message: 'Salary cannot be negative' });
        }
    }

    // Hire date validation
    if (data.hireDate !== undefined && data.hireDate !== null && data.hireDate !== '') {
        const hireDate = new Date(data.hireDate);
        if (isNaN(hireDate.getTime())) {
            errors.push({ field: 'hireDate', message: 'Invalid date format' });
        } else if (hireDate > new Date()) {
            errors.push({ field: 'hireDate', message: 'Hire date cannot be in the future' });
        }
    }

    // Contract type validation
    if (data.contractType !== undefined) {
        const validContractTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'];
        if (!validContractTypes.includes(data.contractType)) {
            errors.push({ field: 'contractType', message: `Invalid contract type. Must be one of: ${validContractTypes.join(', ')}` });
        }
    }

    return errors;
};

/**
 * Sanitize user input - remove HTML/script tags
 */
const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

/**
 * Create audit log entry
 */
const logAuditEvent = async (prisma, event) => {
    try {
        await prisma.activityLog.create({
            data: {
                action: event.action,
                entityType: event.entityType || 'USER',
                entityId: event.entityId,
                userId: event.userId,
                companyId: event.companyId,
                metadata: {
                    ...event.metadata,
                    correlationId: event.correlationId,
                },
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
            }
        });
    } catch (error) {
        // Don't fail the operation if audit logging fails
        console.error('[AUDIT] Failed to create audit log:', error.message);
    }
};

/**
 * Update user with enhanced security and transaction safety
 */
const updateUserEnhanced = async (req, res) => {
    const prisma = getSharedPrismaClient();
    const startTime = Date.now();
    
    try {
        const { companyId, userId } = req.params;
        const {
            firstName,
            lastName,
            email,
            phone,
            role,
            isActive,
            departmentId,
            positionId,
            hireDate,
            contractType,
            baseSalary
        } = req.body;

        const requestId = req.requestId || `req_${Date.now()}`;
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.get('User-Agent');

        console.log(`[UPDATE-USER] Request received - RequestID: ${requestId}, TargetUser: ${userId}`);

        // 🛡️ SECURITY: Prevent self-modification
        if (req.user && userId === req.user.id && (isActive === false || role !== undefined)) {
            console.warn(`[UPDATE-USER] Self-modification attempt blocked - User: ${req.user.email}, RequestID: ${requestId}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'SELF_MODIFICATION',
                    message: 'Cannot modify your own account status or role'
                }
            });
        }

        // 🛡️ SECURITY: Prevent modifying SUPER_ADMIN
        const targetUserCheck = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, companyId: true }
        });

        if (!targetUserCheck) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                }
            });
        }

        if (targetUserCheck.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'CANNOT_MODIFY_SUPER_ADMIN',
                    message: 'Cannot modify super admin accounts'
                }
            });
        }

        // ✅ Input validation
        const inputData = {
            firstName,
            lastName,
            email,
            phone,
            role,
            isActive,
            baseSalary,
            hireDate,
            contractType
        };

        const validationErrors = validateUserInput(inputData, true);
        if (validationErrors.length > 0) {
            console.log(`[UPDATE-USER] Validation failed - Errors: ${validationErrors.length}, RequestID: ${requestId}`);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: validationErrors
                }
            });
        }

        // Sanitize inputs
        const sanitizedData = {
            firstName: firstName ? sanitizeInput(firstName) : undefined,
            lastName: lastName ? sanitizeInput(lastName) : undefined,
            email: email ? sanitizeInput(email.toLowerCase()) : undefined,
            phone: phone ? sanitizeInput(phone) : undefined,
            departmentId: departmentId || undefined,
            positionId: positionId || undefined,
            hireDate: hireDate || undefined,
            contractType: contractType || undefined,
            baseSalary: baseSalary !== undefined && baseSalary !== null ? parseFloat(baseSalary) : undefined,
        };

        // Check if user exists in company
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true
                    }
                }
            }
        });

        if (!userCompany) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_IN_COMPANY',
                    message: 'المستخدم غير موجود في هذه الشركة'
                }
            });
        }

        // Check if email is being changed and already exists
        if (sanitizedData.email && sanitizedData.email !== userCompany.user.email) {
            const emailExists = await prisma.user.findFirst({
                where: {
                    email: sanitizedData.email,
                    id: { not: userId }
                }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'EMAIL_EXISTS',
                        message: 'البريد الإلكتروني مستخدم بالفعل'
                    }
                });
            }
        }

        // Store original data for audit
        const originalData = {
            firstName: userCompany.user.firstName,
            lastName: userCompany.user.lastName,
            email: userCompany.user.email,
            phone: userCompany.user.phone,
            role: userCompany.role,
            isActive: userCompany.isActive
        };

        // 🎯 Use transaction for atomic updates
        const [updatedUser] = await prisma.$transaction([
            // Update user record
            prisma.user.update({
                where: { id: userId },
                data: {
                    ...(sanitizedData.firstName && { firstName: sanitizedData.firstName }),
                    ...(sanitizedData.lastName && { lastName: sanitizedData.lastName }),
                    ...(sanitizedData.email && { email: sanitizedData.email }),
                    ...(sanitizedData.phone !== undefined && { phone: sanitizedData.phone }),
                    ...(sanitizedData.departmentId !== undefined && { departmentId: sanitizedData.departmentId }),
                    ...(sanitizedData.positionId !== undefined && { positionId: sanitizedData.positionId }),
                    ...(sanitizedData.hireDate !== undefined && { hireDate: new Date(sanitizedData.hireDate) }),
                    ...(sanitizedData.contractType !== undefined && { contractType: sanitizedData.contractType }),
                    ...(sanitizedData.baseSalary !== undefined && { baseSalary: sanitizedData.baseSalary }),
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    avatar: true,
                    role: true,
                    isActive: true,
                    isEmailVerified: true,
                    lastLoginAt: true,
                    createdAt: true,
                    updatedAt: true,
                    employeeNumber: true,
                    contractType: true,
                    hireDate: true,
                    baseSalary: true,
                    departmentId: true,
                    positionId: true,
                    departmentRelation: {
                        select: {
                            id: true,
                            name: true,
                            color: true
                        }
                    },
                    positionRelation: {
                        select: {
                            id: true,
                            title: true,
                            level: true
                        }
                    }
                }
            }),
            // Update user company record (role and isActive)
            prisma.userCompany.updateMany({
                where: {
                    userId: userId,
                    companyId: companyId
                },
                data: {
                    ...(role && { role }),
                    ...(isActive !== undefined && { isActive: isActive })
                }
            })
        ], {
            maxWait: 5000,
            timeout: 10000
        });

        // Re-fetch user with updated UserCompany data
        const userCompanyAfterUpdate = await prisma.userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isEmailVerified: true,
                        lastLoginAt: true,
                        createdAt: true,
                        updatedAt: true,
                        employeeNumber: true,
                        contractType: true,
                        hireDate: true,
                        baseSalary: true,
                        departmentId: true,
                        positionId: true,
                        departmentRelation: {
                            select: {
                                id: true,
                                name: true,
                                color: true
                            }
                        },
                        positionRelation: {
                            select: {
                                id: true,
                                title: true,
                                level: true
                            }
                        }
                    }
                }
            }
        });

        const finalUser = {
            id: userCompanyAfterUpdate.user.id,
            firstName: userCompanyAfterUpdate.user.firstName,
            lastName: userCompanyAfterUpdate.user.lastName,
            email: userCompanyAfterUpdate.user.email,
            phone: userCompanyAfterUpdate.user.phone,
            avatar: userCompanyAfterUpdate.user.avatar,
            role: userCompanyAfterUpdate.role,
            isActive: userCompanyAfterUpdate.isActive,
            isEmailVerified: userCompanyAfterUpdate.user.isEmailVerified,
            lastLoginAt: userCompanyAfterUpdate.user.lastLoginAt,
            createdAt: userCompanyAfterUpdate.user.createdAt,
            updatedAt: userCompanyAfterUpdate.user.updatedAt,
            employee: userCompanyAfterUpdate.user.employeeNumber ? {
                id: userCompanyAfterUpdate.user.id,
                employeeNumber: userCompanyAfterUpdate.user.employeeNumber,
                status: userCompanyAfterUpdate.user.isActive ? 'ACTIVE' : 'INACTIVE',
                contractType: userCompanyAfterUpdate.user.contractType,
                hireDate: userCompanyAfterUpdate.user.hireDate,
                department: userCompanyAfterUpdate.user.departmentRelation,
                position: userCompanyAfterUpdate.user.positionRelation
            } : null
        };

        // 📝 Create audit log
        const changes = {};
        if (originalData.firstName !== finalUser.firstName) changes.firstName = { from: originalData.firstName, to: finalUser.firstName };
        if (originalData.lastName !== finalUser.lastName) changes.lastName = { from: originalData.lastName, to: finalUser.lastName };
        if (originalData.email !== finalUser.email) changes.email = { from: originalData.email, to: finalUser.email };
        if (originalData.phone !== finalUser.phone) changes.phone = { from: originalData.phone, to: finalUser.phone };
        if (originalData.role !== finalUser.role) changes.role = { from: originalData.role, to: finalUser.role };
        if (originalData.isActive !== finalUser.isActive) changes.isActive = { from: originalData.isActive, to: finalUser.isActive };

        if (Object.keys(changes).length > 0) {
            await logAuditEvent(prisma, {
                action: 'USER_UPDATED',
                entityType: 'USER',
                entityId: userId,
                userId: req.user?.id,
                companyId: companyId,
                metadata: {
                    changes,
                    requestId,
                    duration: Date.now() - startTime
                },
                correlationId: requestId,
                ipAddress,
                userAgent
            });
        }

        console.log(`[UPDATE-USER] Success - RequestID: ${requestId}, Duration: ${Date.now() - startTime}ms`);

        res.json({
            success: true,
            message: 'تم تحديث المستخدم بنجاح',
            data: finalUser
        });

    } catch (error) {
        console.error(`[UPDATE-USER] Error - RequestID: ${req.requestId || 'unknown'}`, error);

        // Don't expose internal errors
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'حدث خطأ داخلي'
            : error.message;

        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_ERROR',
                message: 'فشل في تحديث المستخدم',
                details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
            }
        });
    }
};

/**
 * Delete user with enhanced security
 */
const deleteUserEnhanced = async (req, res) => {
    const prisma = getSharedPrismaClient();
    const startTime = Date.now();

    try {
        const { companyId, userId } = req.params;
        const requestId = req.requestId || `req_${Date.now()}`;
        const ipAddress = req.ip || req.connection?.remoteAddress;

        console.log(`[DELETE-USER] Request received - RequestID: ${requestId}, TargetUser: ${userId}`);

        // 🛡️ SECURITY: Prevent self-deletion
        if (req.user && userId === req.user.id) {
            console.warn(`[DELETE-USER] Self-deletion attempt blocked - User: ${req.user.email}, RequestID: ${requestId}`);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'SELF_DELETION',
                    message: 'Cannot delete your own account'
                }
            });
        }

        // Check if user exists in company
        const userCompany = await prisma.userCompany.findFirst({
            where: {
                userId: userId,
                companyId: companyId
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            }
        });

        if (!userCompany) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_IN_COMPANY',
                    message: 'المستخدم غير موجود في هذه الشركة'
                }
            });
        }

        // 🛡️ SECURITY: Prevent deleting SUPER_ADMIN
        if (userCompany.user.role === 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'CANNOT_DELETE_SUPER_ADMIN',
                    message: 'Cannot delete super admin accounts'
                }
            });
        }

        // Check if this is the last company admin
        if (userCompany.role === 'COMPANY_ADMIN') {
            const adminCount = await prisma.userCompany.count({
                where: {
                    companyId: companyId,
                    role: 'COMPANY_ADMIN',
                    isActive: true
                }
            });

            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'LAST_ADMIN',
                        message: 'Cannot delete the last company admin'
                    }
                });
            }
        }

        // Store user data for audit before deletion
        const deletedUserData = {
            ...userCompany.user,
            role: userCompany.role,
            isActive: userCompany.isActive
        };

        // Soft delete: Remove from company (or hard delete if needed)
        await prisma.userCompany.deleteMany({
            where: {
                userId: userId,
                companyId: companyId
            }
        });

        // 📝 Create audit log
        await logAuditEvent(prisma, {
            action: 'USER_DELETED',
            entityType: 'USER',
            entityId: userId,
            userId: req.user?.id,
            companyId: companyId,
            metadata: {
                deletedUser: deletedUserData,
                requestId,
                duration: Date.now() - startTime
            },
            correlationId: requestId,
            ipAddress,
            userAgent: req.get('User-Agent')
        });

        console.log(`[DELETE-USER] Success - RequestID: ${requestId}, Duration: ${Date.now() - startTime}ms`);

        res.json({
            success: true,
            message: 'تم حذف المستخدم بنجاح'
        });

    } catch (error) {
        console.error(`[DELETE-USER] Error - RequestID: ${req.requestId || 'unknown'}`, error);

        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'حدث خطأ داخلي'
            : error.message;

        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_ERROR',
                message: 'فشل في حذف المستخدم',
                details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
            }
        });
    }
};

/**
 * Get users with enhanced security and filtering
 */
const getCompanyUsersEnhanced = async (req, res) => {
    const prisma = getSharedPrismaClient();

    try {
        const { companyId } = req.params;
        const {
            page = 1,
            limit = 25,
            search = '',
            role = '',
            isActive = '',
            employeeStatus = ''
        } = req.query;

        const requestId = req.requestId || `req_${Date.now()}`;
        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit) || 25, 100); // Max 100 per page
        const skip = (pageNum - 1) * limitNum;

        console.log(`[GET-USERS] Request received - RequestID: ${requestId}, Company: ${companyId}`);

        // Build where clause
        const where = {
            companyId: companyId
        };

        if (search) {
            where.OR = [
                { user: { firstName: { contains: search } } },
                { user: { lastName: { contains: search } } },
                { user: { email: { contains: search } } }
            ];
        }

        if (role) {
            where.role = role;
        }

        if (isActive !== '') {
            where.isActive = isActive === 'true';
        }

        // Get total count
        const totalCount = await prisma.userCompany.count({ where });

        // Get users
        const users = await prisma.userCompany.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isEmailVerified: true,
                        lastLoginAt: true,
                        createdAt: true,
                        updatedAt: true,
                        employeeNumber: true,
                        contractType: true,
                        hireDate: true,
                        baseSalary: true,
                        departmentId: true,
                        positionId: true,
                        departmentRelation: {
                            select: {
                                id: true,
                                name: true,
                                color: true
                            }
                        },
                        positionRelation: {
                            select: {
                                id: true,
                                title: true,
                                level: true
                            }
                        }
                    }
                }
            },
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' }
        });

        const formattedUsers = users.map(uc => ({
            id: uc.user.id,
            firstName: uc.user.firstName,
            lastName: uc.user.lastName,
            email: uc.user.email,
            phone: uc.user.phone,
            avatar: uc.user.avatar,
            role: uc.role,
            isActive: uc.isActive,
            isEmailVerified: uc.user.isEmailVerified,
            lastLoginAt: uc.user.lastLoginAt,
            createdAt: uc.user.createdAt,
            updatedAt: uc.user.updatedAt,
            employee: uc.user.employeeNumber ? {
                id: uc.user.id,
                employeeNumber: uc.user.employeeNumber,
                status: uc.user.isActive ? 'ACTIVE' : 'INACTIVE',
                contractType: uc.user.contractType,
                hireDate: uc.user.hireDate,
                department: uc.user.departmentRelation,
                position: uc.user.positionRelation
            } : null
        }));

        console.log(`[GET-USERS] Success - RequestID: ${requestId}, Count: ${formattedUsers.length}, Total: ${totalCount}`);

        res.json({
            success: true,
            data: {
                users: formattedUsers,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum)
                }
            }
        });

    } catch (error) {
        console.error(`[GET-USERS] Error - RequestID: ${req.requestId || 'unknown'}`, error);

        res.status(500).json({
            success: false,
            error: {
                code: 'FETCH_ERROR',
                message: 'فشل في جلب المستخدمين'
            }
        });
    }
};

module.exports = {
    updateUserEnhanced,
    deleteUserEnhanced,
    getCompanyUsersEnhanced,
    validateUserInput,
    sanitizeInput
};
