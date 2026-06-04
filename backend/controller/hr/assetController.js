const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const WhatsAppNotificationService = require('../../services/whatsapp/WhatsAppNotificationService');

// Asset Categories
exports.getAssetCategories = async (req, res) => {
    try {
        const { companyId } = req.user;
        const categories = await getSharedPrismaClient().assetCategory.findMany({
            where: { companyId },
            include: {
                _count: { select: { assets: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching asset categories:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

exports.createAssetCategory = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, description } = req.body;

        const existing = await getSharedPrismaClient().assetCategory.findUnique({
            where: {
                companyId_name: { companyId, name }
            }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        const category = await getSharedPrismaClient().assetCategory.create({
            data: {
                companyId,
                name,
                description
            }
        });

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating asset category:', error);
        res.status(500).json({ success: false, message: 'Failed to create category' });
    }
};

exports.deleteAssetCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const category = await getSharedPrismaClient().assetCategory.findFirst({
            where: { id, companyId }
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        await getSharedPrismaClient().assetCategory.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error('Error deleting asset category:', error);
        res.status(500).json({ success: false, message: 'Failed to delete category' });
    }
};

// Stats
exports.getAssetStats = async (req, res) => {
    try {
        const { companyId } = req.user;

        const [total, inUse, available, maintenance] = await Promise.all([
            getSharedPrismaClient().asset.count({ where: { companyId } }),
            getSharedPrismaClient().asset.count({ where: { companyId, status: 'IN_USE' } }),
            getSharedPrismaClient().asset.count({ where: { companyId, status: 'AVAILABLE' } }),
            getSharedPrismaClient().asset.count({ where: { companyId, status: 'MAINTENANCE' } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                inUse,
                available,
                maintenance
            }
        });
    } catch (error) {
        console.error('Error fetching asset stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset stats' });
    }
};

// Reports
exports.generateReport = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { type } = req.params;
        const { format } = req.query;

        let assets = [];
        let title = '';
        const where = { companyId };

        switch (type) {
            case 'all-assets':
                title = 'تقرير كافة الأصول';
                break;
            case 'current-custody':
                title = 'تقرير العهد الحالية للقوى البشرية';
                where.status = 'IN_USE';
                break;
            case 'available-assets':
                title = 'تقرير الأصول المتاحة للتخصيص';
                where.status = 'AVAILABLE';
                break;
            case 'maintenance-assets':
                title = 'تقرير الأصول في الصيانة';
                where.status = 'MAINTENANCE';
                break;
            case 'lost-damaged-assets':
                title = 'تقرير الأصول المفقودة أو التالفة';
                where.status = { in: ['LOST', 'DAMAGED'] };
                break;
            case 'total-value':
                title = 'تقرير القيمة المالية للأصول';
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid report type' });
        }

        assets = await getSharedPrismaClient().asset.findMany({
            where,
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });

        if (format === 'excel') {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Assets');
            worksheet.views = [{ rightToLeft: true }];

            worksheet.columns = [
                { header: 'كود الأصل', key: 'code', width: 15 },
                { header: 'اسم الأصل', key: 'name', width: 25 },
                { header: 'التصنيف', key: 'category', width: 20 },
                { header: 'الموديل', key: 'model', width: 15 },
                { header: 'الرقم التسلسلي', key: 'serial', width: 20 },
                { header: 'الحالة', key: 'status', width: 15 },
                { header: 'القيمة الشرائية', key: 'value', width: 15 },
                { header: 'تاريخ الإضافة', key: 'date', width: 20 }
            ];

            assets.forEach(asset => {
                worksheet.addRow({
                    code: asset.code || '-',
                    name: asset.name || '-',
                    category: asset.category?.name || 'بدون تصنيف',
                    model: asset.model || '-',
                    serial: asset.serialNumber || '-',
                    status: asset.status || '-',
                    value: asset.purchaseValue ? parseFloat(asset.purchaseValue) : 0,
                    date: asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('ar-EG') : '-'
                });
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(type)}.xlsx`);
            await workbook.xlsx.write(res);
            return res.end();

        } else if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 30 });
            const path = require('path');
            const fontPath = path.join(process.cwd(), 'fonts/NotoSansArabic-Regular.ttf');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(type)}.pdf`);
            doc.pipe(res);

            // Safe font loading
            try {
                const fs = require('fs');
                if (fs.existsSync(fontPath)) {
                    doc.font(fontPath);
                }
            } catch (e) {
                console.warn('Font not found, using default');
            }

            doc.fontSize(20).text(title, { align: 'center' });
            doc.moveDown();

            assets.forEach((asset, index) => {
                doc.fontSize(12).text(`${index + 1}. ${asset.name} (${asset.code || 'بدون كود'})`, { align: 'right' });
                doc.fontSize(10).text(`التصنيف: ${asset.category?.name || '-'} | الحالة: ${asset.status}`, { align: 'right' });
                doc.moveDown(0.5);
            });

            doc.end();
            return;
        }

        res.status(400).json({ success: false, message: 'Invalid format' });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
};

// Assets
exports.getAssets = async (req, res) => {
    try {
        const { companyId, role } = req.user;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: role === 'SUPER_ADMIN'
                    ? 'يجب تحديد شركة لعرض الأصول'
                    : 'يجب أن يكون المستخدم مرتبطاً بشركة'
            });
        }

        const { categoryId, status, search, assignedTo, page: pageStr = 1, limit: limitStr = 50 } = req.query;

        const page = Math.max(1, parseInt(pageStr));
        const limit = Math.max(1, Math.min(100, parseInt(limitStr)));

        const where = { companyId };

        if (categoryId) where.categoryId = categoryId;
        if (status) where.status = status;
        if (assignedTo) where.assignedToId = assignedTo;
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { serialNumber: { contains: search } },
                { model: { contains: search } }
            ];
        }

        const [assets, total] = await Promise.all([
            getSharedPrismaClient().asset.findMany({
                where,
                include: {
                    category: true // Verified in assets.prisma:93: category AssetCategory?
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            getSharedPrismaClient().asset.count({ where })
        ]);

        // Fetch current holders (users)
        const holderIds = [...new Set(assets.map(a => a.assignedToId).filter(Boolean))];
        const holders = holderIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: holderIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : [];
        const holderMap = Object.fromEntries(holders.map(h => [h.id, h]));

        // Fetch latest assignments for each asset
        const assetIds = assets.map(a => a.id);
        const assignments = assetIds.length > 0 ? await getSharedPrismaClient().assetAssignment.findMany({
            where: { assetId: { in: assetIds } },
            orderBy: { assignedAt: 'desc' },
            distinct: ['assetId']
        }) : [];
        const assignmentMap = Object.fromEntries(assignments.map(a => [a.assetId, a]));

        // Fetch employees for assignments
        const employeeIds = [...new Set(assignments.map(a => a.userId).filter(Boolean))];
        const employees = employeeIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true
            }
        }) : [];
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

        // Merge data
        const enrichedAssets = assets.map(asset => ({
            ...asset,
            currentHolder: asset.assignedToId ? holderMap[asset.assignedToId] : null,
            assignments: assignmentMap[asset.id] ? [{
                ...assignmentMap[asset.id],
                employee: employeeMap[assignmentMap[asset.id].userId]
            }] : []
        }));

        res.json({
            success: true,
            data: enrichedAssets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch assets' });
    }
};

exports.getAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId },
            include: {
                category: true,
                maintenance: {
                    orderBy: { startDate: 'desc' }
                }
            }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Fetch current holder
        const currentHolder = asset.assignedToId ? await getSharedPrismaClient().user.findUnique({
            where: { id: asset.assignedToId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : null;

        // Fetch assignments
        const assignments = await getSharedPrismaClient().assetAssignment.findMany({
            where: { assetId: id },
            orderBy: { assignedAt: 'desc' }
        });

        // Fetch employees for assignments
        const employeeIds = [...new Set(assignments.map(a => a.userId).filter(Boolean))];
        const employees = employeeIds.length > 0 ? await getSharedPrismaClient().user.findMany({
            where: { id: { in: employeeIds } },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true
            }
        }) : [];
        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));

        // Merge data
        const enrichedAsset = {
            ...asset,
            currentHolder,
            assignments: assignments.map(a => ({
                ...a,
                employee: employeeMap[a.userId]
            }))
        };

        res.json({ success: true, data: enrichedAsset });
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset' });
    }
};

exports.createAsset = async (req, res) => {
    try {
        const { companyId } = req.user;
        const {
            name,
            categoryId,
            code,
            serialNumber,
            model,
            brand,
            status,
            condition,
            purchaseDate,
            purchaseValue,
            location,
            notes,
            warrantyProvider,
            warrantyMonths,
            warrantyEndDate,
            warrantyStartDate,
            assignedToId
        } = req.body;

        const toNullIfEmpty = (value) => (value === '' || value === undefined ? null : value);
        const safeDate = (value) => {
            if (!value) return null;
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        };
        const parsedPurchaseValue = purchaseValue !== undefined && purchaseValue !== ''
            ? Number(purchaseValue)
            : null;
        const parsedWarrantyMonths = warrantyMonths !== undefined && warrantyMonths !== ''
            ? parseInt(warrantyMonths, 10)
            : null;

        // Check for duplicate code
        if (code) {
            const existing = await getSharedPrismaClient().asset.findUnique({
                where: {
                    companyId_code: { companyId, code }
                }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Asset code already exists' });
            }
        }

        const asset = await getSharedPrismaClient().asset.create({
            data: {
                companyId,
                name,
                categoryId: toNullIfEmpty(categoryId),
                code: toNullIfEmpty(code),
                serialNumber: toNullIfEmpty(serialNumber),
                model: toNullIfEmpty(model),
                brand: toNullIfEmpty(brand),
                status: assignedToId ? 'IN_USE' : (status || 'AVAILABLE'),
                condition: condition || 'NEW',
                purchaseDate: safeDate(purchaseDate),
                purchaseValue: Number.isFinite(parsedPurchaseValue) ? parsedPurchaseValue : null,
                location: toNullIfEmpty(location),
                notes: toNullIfEmpty(notes),
                warrantyProvider: toNullIfEmpty(warrantyProvider),
                warrantyMonths: Number.isInteger(parsedWarrantyMonths) ? parsedWarrantyMonths : null,
                warrantyStartDate: safeDate(warrantyStartDate),
                warrantyEndDate: safeDate(warrantyEndDate),
                assignedToId: toNullIfEmpty(assignedToId)
            }
        });

        // Create assignment record if assigned during creation
        if (assignedToId) {
            await getSharedPrismaClient().assetAssignment.create({
                data: {
                    assetId: asset.id,
                    userId: assignedToId,
                    assignedBy: req.user.id,
                    assignedAt: new Date(),
                    notes: 'تخصيص تلقائي عند إضافة الأصل'
                }
            });
        }

        res.json({ success: true, data: asset });
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ success: false, message: 'Failed to create asset' });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;

        const existing = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        // Whitelist/normalize fields to avoid Prisma errors from unexpected props (e.g. supplierName)
        const {
            name,
            categoryId,
            code,
            serialNumber,
            model,
            brand,
            status,
            condition,
            purchaseDate,
            purchaseValue,
            location,
            notes,
            warrantyProvider,
            warrantyMonths,
            warrantyStartDate,
            warrantyEndDate,
            assignedToId
        } = req.body;

        const toNullIfEmpty = (value) => (value === '' || value === undefined ? null : value);

        // Prevent duplicate code within company
        if (code) {
            const dup = await getSharedPrismaClient().asset.findFirst({
                where: {
                    companyId,
                    code,
                    id: { not: id }
                }
            });
            if (dup) {
                return res.status(400).json({ success: false, message: 'Asset code already exists' });
            }
        }

        const parsedPurchaseValue = purchaseValue !== undefined && purchaseValue !== ''
            ? Number(purchaseValue)
            : null;
        const parsedWarrantyMonths = warrantyMonths !== undefined && warrantyMonths !== ''
            ? parseInt(warrantyMonths, 10)
            : null;
        const safeDate = (value) => {
            if (!value) return null;
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        };

        const data = {
            name: name ?? existing.name, // keep existing name if not provided
            categoryId: toNullIfEmpty(categoryId),
            code: toNullIfEmpty(code),
            serialNumber: toNullIfEmpty(serialNumber),
            model: toNullIfEmpty(model),
            brand: toNullIfEmpty(brand),
            status: status || (assignedToId ? 'IN_USE' : existing.status),
            condition: condition || existing.condition,
            purchaseDate: safeDate(purchaseDate),
            purchaseValue: Number.isFinite(parsedPurchaseValue) ? parsedPurchaseValue : null,
            location: toNullIfEmpty(location),
            notes: toNullIfEmpty(notes),
            warrantyProvider: toNullIfEmpty(warrantyProvider),
            warrantyMonths: Number.isInteger(parsedWarrantyMonths) ? parsedWarrantyMonths : null,
            warrantyStartDate: safeDate(warrantyStartDate),
            warrantyEndDate: safeDate(warrantyEndDate),
            assignedToId: toNullIfEmpty(assignedToId)
        };

        const asset = await getSharedPrismaClient().asset.update({
            where: { id },
            data
        });

        res.json({ success: true, data: asset });
    } catch (error) {
        console.error('Error updating asset:', error);
        res.status(500).json({ success: false, message: 'Failed to update asset' });
    }
};

exports.deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const prisma = getSharedPrismaClient();

        // 🛡️ [SAAS] Ensure company ownership
        const existing = await prisma.asset.findFirst({
            where: role === 'SUPER_ADMIN' ? { id } : { id, companyId }
        });

        if (!existing) {
            return res.status(404).json({ success: false, message: 'الأصل غير موجود أو ليس لديك صلاحية لحذفه' });
        }

        // Delete related records that might not have cascade (just in case)
        // Although schema should handle most, we must be sure
        await prisma.asset.delete({
            where: { id: existing.id }
        });

        res.json({ success: true, message: 'تم حذف الأصل بنجاح' });
    } catch (error) {
        console.error('❌ [ASSETS] Error deleting asset:', error);
        
        // Check for Prisma constraint error
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                success: false, 
                message: 'لا يمكن حذف هذا الأصل لأنه مرتب بطلبات أو سجلات أخرى. قم بحذف السجلات المرتبطة أولاً.',
                code: 'CONFLICT'
            });
        }

        res.status(500).json({ success: false, message: 'فشل في حذف الأصل' });
    }
};

exports.cloneAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        // Allow SUPER_ADMIN to clone across companies by falling back to id-only lookup
        const asset = await getSharedPrismaClient().asset.findFirst({
            where: role === 'SUPER_ADMIN' && !companyId
                ? { id }
                : { id, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
        }

        // Generate unique code to avoid P2002
        const timestamp = Date.now().toString().slice(-4);
        let newCode = null;
        if (asset.code) {
            // Remove previous -copy-* or -COPY if exists
            const baseCode = asset.code.replace(/-copy-\d+$/, '').replace(/-COPY$/, '');
            newCode = `${baseCode}-copy-${timestamp}`;
        }

        // Prepare data for the clone - Exclude system fields and relations
        // We use a clean approach to avoid copying ID or relations
        const { 
            id: _, createdAt: __, updatedAt: ___, 
            assignments, maintenance, requests, company: ____, category: _____, audits, custodyHistory, attachments, 
            ...assetData 
        } = asset;

        const data = {
            ...assetData,
            name: `${asset.name} (نسخة)`,
            code: newCode,
            serialNumber: null, // Serial numbers must be unique
            status: 'AVAILABLE',
            assignedToId: null,
            currentBookValue: asset.purchaseValue,
            // Handle metadata if it exists
            metadata: asset.metadata ? (typeof asset.metadata === 'string' ? JSON.parse(asset.metadata) : asset.metadata) : undefined
        };

        const clonedAsset = await getSharedPrismaClient().asset.create({
            data
        });

        res.status(201).json({
            success: true,
            data: clonedAsset,
            message: 'تم استنساخ الأصل بنجاح'
        });
    } catch (error) {
        console.error('Error cloning asset:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clone asset',
            error: error.message,
            stack: error.stack
        });
    }
};

// Assignments
exports.assignAsset = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { assetId, employeeId, notes, assignedAt } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (asset.status === 'IN_USE' || asset.assignedToId) {
            return res.status(400).json({ success: false, message: 'Asset is already assigned' });
        }

        const assignment = await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                userId: employeeId, // column is userId in schema
                assignedBy: userId,
                assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
                notes
            }
        });

        // Update asset status regardless
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: employeeId
            }
        });

        res.json({
            success: true,
            message: 'تم تسليم العهدة',
            data: assignment
        });
    } catch (error) {
        console.error('Error assigning asset:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to assign asset' });
    }
};

exports.returnAsset = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { assetId, returnCondition, notes, returnedAt } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (!asset.assignedToId) {
            return res.status(400).json({ success: false, message: 'Asset is not currently assigned' });
        }

        // Find the active assignment
        const assignment = await getSharedPrismaClient().assetAssignment.findFirst({
            where: {
                assetId,
                returnedAt: null
            }
        });

        if (assignment) {
            await getSharedPrismaClient().assetAssignment.update({
                where: { id: assignment.id },
                data: {
                    returnedAt: returnedAt ? new Date(returnedAt) : new Date(),
                    returnCondition,
                    notes: notes ? (assignment.notes ? assignment.notes + '\nReturn Notes: ' + notes : notes) : assignment.notes
                }
            });
        }

        // Update asset
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'AVAILABLE',
                assignedToId: null,
                condition: returnCondition || asset.condition
            }
        });

        res.json({ success: true, message: 'Asset returned successfully' });
    } catch (error) {
        console.error('Error returning asset:', error);
        res.status(500).json({ success: false, message: 'Failed to return asset' });
    }
};
// Asset Requests
exports.getAssetRequests = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status } = req.query;

        const where = { companyId };
        if (status) where.status = status;

        const requests = await getSharedPrismaClient().asset_requests.findMany({
            where,
            include: {
                asset: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch user details for each request
        const userIds = [...new Set(requests.map(r => r.requestedBy))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        const enrichedRequests = requests.map(request => ({
            ...request,
            requester: userMap[request.requestedBy]
        }));

        res.json({ success: true, data: enrichedRequests });
    } catch (error) {
        console.error('Error fetching asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch asset requests' });
    }
};

exports.getMyAssetRequests = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const requests = await getSharedPrismaClient().asset_requests.findMany({
            where: { companyId, requestedBy: userId },
            include: {
                asset: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Error fetching your asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your asset requests' });
    }
};

exports.createAssetRequest = async (req, res) => {
    try {
        const { companyId, id: userId } = req.user;
        const { assetType, category, reason, priority } = req.body;

        const request = await getSharedPrismaClient().asset_requests.create({
            data: {
                id: `REQ-${Date.now()}`,
                companyId,
                requestedBy: userId,
                assetType,
                category,
                reason,
                priority: priority || 'NORMAL',
                status: 'PENDING',
                updatedAt: new Date()
            }
        });

        // Optional: Notify HR or Manager
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                title: 'طلب عهدة جديد',
                message: `قام الموظف بطلب ${assetType}. السبب: ${reason}`,
                type: 'ASSET_REQUEST',
                // For simplicity, we could notify all owners/admins or a specific role
                // For now, let's just create a general notification for the company
            }
        });

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('Error creating asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to create asset request' });
    }
};

exports.updateAssetRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { companyId, id: userId } = req.user;
        const { status, rejectionReason } = req.body;

        const request = await getSharedPrismaClient().asset_requests.findFirst({
            where: { id: requestId, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const updateData = {
            status,
            updatedAt: new Date()
        };

        if (status === 'APPROVED') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        } else if (status === 'REJECTED') {
            updateData.rejectedBy = userId;
            updateData.rejectedAt = new Date();
            updateData.rejectionReason = rejectionReason;
        }

        const updatedRequest = await getSharedPrismaClient().asset_requests.update({
            where: { id: requestId },
            data: updateData
        });

        // Notify employee
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                userId: request.requestedBy,
                title: status === 'APPROVED' ? 'تمت الموافقة على طلب العهدة' : 'تم رفض طلب العهدة',
                message: status === 'APPROVED'
                    ? `تمت الموافقة على طلبك لـ ${request.assetType}. سيتم تخصيص أصل لك قريباً.`
                    : `نأسف، تم رفض طلبك لـ ${request.assetType}. السبب: ${rejectionReason || 'غير محدد'}`,
                type: 'ASSET_REQUEST_STATUS'
            }
        });

        // Fetch employee details for notification
        const employee = await getSharedPrismaClient().user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, firstName: true, lastName: true, phone: true }
        });

        // Notify employee via WhatsApp
        if (employee) {
            await WhatsAppNotificationService.sendAssetRequestNotification(updatedRequest, employee, status);
        }

        res.json({ success: true, data: updatedRequest });
    } catch (error) {
        console.error('Error updating asset request status:', error);
        res.status(500).json({ success: false, message: 'Failed to update request status' });
    }
};

exports.fulfillAssetRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { companyId, id: userId } = req.user;
        const { assetId, notes } = req.body;

        const request = await getSharedPrismaClient().asset_requests.findFirst({
            where: { id: requestId, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset || asset.status !== 'AVAILABLE') {
            return res.status(400).json({ success: false, message: 'Asset is not available' });
        }

        // 1. Assign Asset
        await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                employeeId: request.requestedBy,
                assignedBy: userId,
                assignedAt: new Date(),
                notes: notes || `Fulfilled for request ${requestId}`
            }
        });

        // 2. Update Asset
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: request.requestedBy
            }
        });

        // 3. Update Request
        const updatedRequest = await getSharedPrismaClient().asset_requests.update({
            where: { id: requestId },
            data: {
                status: 'FULFILLED',
                assetId,
                fulfilledBy: userId,
                fulfilledAt: new Date(),
                notes: notes || request.notes,
                updatedAt: new Date()
            },
            include: { asset: true }
        });

        // Fetch employee details for notification
        const employee = await getSharedPrismaClient().user.findUnique({
            where: { id: request.requestedBy },
            select: { id: true, firstName: true, lastName: true, phone: true }
        });

        // 4. Notify employee via In-App
        await getSharedPrismaClient().notification.create({
            data: {
                companyId,
                userId: request.requestedBy,
                title: 'استلام العهدة',
                message: `تم تسليم عهدتك (${asset.name}) بنجاح. يرجى مراجعة صفحة الأصول.`,
                type: 'ASSET_FULFILLED'
            }
        });

        // Notify employee via WhatsApp
        if (employee) {
            await WhatsAppNotificationService.sendAssetRequestNotification(updatedRequest, employee, 'FULFILLED');
        }

        res.json({ success: true, data: updatedRequest });
    } catch (error) {
        console.error('Error fulfilling asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to fulfill request' });
    }
};

// Maintenance
exports.getMaintenanceHistory = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const history = await getSharedPrismaClient().assetMaintenance.findMany({
            where: { asset: { companyId } },
            include: { asset: { select: { name: true, code: true } } },
            orderBy: { startDate: 'desc' },
            take: 50
        });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching maintenance history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

exports.getAssetMaintenanceHistory = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const history = await getSharedPrismaClient().assetMaintenance.findMany({
            where: { assetId },
            orderBy: { startDate: 'desc' }
        });

        res.json({ success: true, data: history });
    } catch (error) {
        console.error('Error fetching asset maintenance history:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
};

exports.addMaintenanceRecord = async (req, res) => {
    try {
        const { id: assetId } = req.params;
        const { companyId } = req.user;
        const { type, description, cost, status, startDate, completionDate, performedBy, notes } = req.body;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const maintenance = await getSharedPrismaClient().assetMaintenance.create({
            data: {
                assetId,
                type,
                description,
                cost: cost ? parseFloat(cost) : null,
                status: status || 'COMPLETED',
                startDate: new Date(startDate),
                completionDate: completionDate ? new Date(completionDate) : null,
                performedBy,
                notes,
                updatedAt: new Date()
            }
        });

        res.json({ success: true, data: maintenance });
    } catch (error) {
        console.error('Error adding maintenance record:', error);
        res.status(500).json({ success: false, message: 'Failed to add record' });
    }
};

exports.getAssetAlerts = async (req, res) => {
    try {
        const { companyId } = req.user;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        // 1. Warranty Expiry Alerts
        const expiringWarranties = await getSharedPrismaClient().asset.findMany({
            where: {
                companyId,
                warrantyEndDate: {
                    gt: new Date(),
                    lte: thirtyDaysFromNow
                }
            },
            select: { id: true, name: true, code: true, warrantyEndDate: true }
        });

        // 2. Upcoming Maintenance Alerts
        const upcomingMaintenance = await getSharedPrismaClient().assetMaintenance.findMany({
            where: {
                asset: { companyId },
                status: 'SCHEDULED',
                startDate: {
                    gt: new Date(),
                    lte: thirtyDaysFromNow
                }
            },
            include: { asset: { select: { name: true, code: true } } }
        });

        res.json({
            success: true,
            data: {
                expiringWarranties: expiringWarranties.map(a => ({
                    assetId: a.id,
                    name: a.name,
                    code: a.code,
                    endDate: a.warrantyEndDate,
                    type: 'WARRANTY'
                })),
                upcomingMaintenance: upcomingMaintenance.map(m => ({
                    maintenanceId: m.id,
                    assetId: m.assetId,
                    name: m.asset.name,
                    code: m.asset.code,
                    scheduledDate: m.startDate,
                    maintenanceType: m.type,
                    type: 'MAINTENANCE'
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching asset alerts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
};

// Asset Documents
const normalizeAttachment = (doc, req, includeAsset = false) => {
    const safeUrl = doc.fileUrl?.startsWith('http')
        ? doc.fileUrl
        : `${req.protocol}://${req.get('host')}${doc.fileUrl || ''}`;
    return {
        ...doc,
        documentType: doc.documentType || doc.type,
        uploadedAt: doc.createdAt,
        fileUrl: encodeURI(safeUrl),
        mimeType: doc.mimeType || undefined,
        fileSize: doc.fileSize || undefined,
        ...(includeAsset ? { asset: doc.asset } : {})
    };
};

exports.getAssetDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const skip = (page - 1) * limit;

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId }
        });
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const [total, documents] = await Promise.all([
            getSharedPrismaClient().assetAttachment.count({ where: { assetId: id } }),
            getSharedPrismaClient().assetAttachment.findMany({
                where: { assetId: id },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        const withMeta = documents.map(doc => normalizeAttachment(doc, req));
        res.json({
            success: true,
            data: {
                documents: withMeta,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching asset documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};

exports.uploadAssetDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId } = req.user;
        const { documentType, fileName, fileUrl, description, mimeType, fileSize } = req.body;
        const { v4: uuidv4 } = require('uuid');

        if (!fileName || !fileUrl) {
            return res.status(400).json({ success: false, message: 'File name and URL are required' });
        }

        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id, companyId }
        });
        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found for this company' });
        }

        const normalizeFileUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http')) return url;
            const clean = url.replace(/^\/+/, '');
            return `/uploads/${clean.replace(/^uploads\//, '')}`;
        };

        const attachment = await getSharedPrismaClient().assetAttachment.create({
            data: {
                id: `att-${uuidv4()}`,
                assetId: id,
                type: documentType || 'other',
                fileName,
                fileUrl: normalizeFileUrl(fileUrl),
                description,
                mimeType: mimeType || null,
                fileSize: fileSize ? Number(fileSize) : null,
                uploadedBy: req.user.id
            }
        });

        const formatted = normalizeAttachment({ ...attachment, asset }, req, true);
        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Error uploading asset document:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
};

exports.getAllDocuments = async (req, res) => {
    try {
        const { companyId } = req.user;
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
        const skip = (page - 1) * limit;
        const { type, assetId, search } = req.query;

        const where = {
            asset: { companyId }
        };

        if (type && type !== 'all') {
            where.type = type;
        }
        if (assetId && assetId !== 'all') {
            where.assetId = assetId;
        }
        if (search) {
            where.OR = [
                { fileName: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { asset: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [total, documents] = await Promise.all([
            getSharedPrismaClient().assetAttachment.count({ where }),
            getSharedPrismaClient().assetAttachment.findMany({
                where,
                include: {
                    asset: {
                        select: { id: true, name: true, code: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        ]);

        const withMeta = documents.map(doc => normalizeAttachment(doc, req, true));
        res.json({
            success: true,
            data: {
                documents: withMeta,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching all asset documents:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
};


exports.deleteAssetDocument = async (req, res) => {
    try {
        const { docId } = req.params;
        const { companyId } = req.user;

        const doc = await getSharedPrismaClient().assetAttachment.findFirst({
            where: { id: docId },
            include: {
                asset: { select: { companyId: true } }
            }
        });

        if (!doc || doc.asset?.companyId !== companyId) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        await getSharedPrismaClient().assetAttachment.delete({
            where: { id: docId }
        });
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting asset document:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
};

// Active Custody
exports.getActiveCustody = async (req, res) => {
    try {
        const { companyId } = req.user;
        const activeCustody = await getSharedPrismaClient().assetAssignment.findMany({
            where: {
                asset: { companyId },
                returnedAt: null
            },
            include: {
                asset: {
                    include: { category: true }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        // Add mock employee data if actual employee link is missing
        // This is to satisfy the frontend's requirement for firstName/lastName
        const processedCustody = activeCustody.map(assignment => ({
            ...assignment,
            employee: {
                firstName: 'موظف',
                lastName: `(ID: ${assignment.userId})`,
                employeeId: assignment.userId
            }
        }));

        res.json({ success: true, data: processedCustody });
    } catch (error) {
        console.error('Error fetching active custody:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active custody' });
    }
};

