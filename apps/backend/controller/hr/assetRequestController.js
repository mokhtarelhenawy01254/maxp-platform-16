const { getSharedPrismaClient } = require('../../services/sharedDatabase');

// Get all asset requests (for HR/Admin)
exports.getAllRequests = async (req, res) => {
    try {
        const { companyId, role } = req.user;
        const { status, priority } = req.query;

        const where = { companyId };
        if (status) where.status = status;
        if (priority) where.priority = priority;

        const requests = await getSharedPrismaClient().assetRequest.findMany({
            where,
            include: {
                asset: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Attach requester data manually
        const userIds = [...new Set(requests.map(req => req.requestedBy))];
        const users = await getSharedPrismaClient().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });
        
        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        const requestsWithRequester = requests.map(req => ({
             ...req,
             requester: userMap[req.requestedBy] || null
        }));

        res.json({ success: true, data: requestsWithRequester });
    } catch (error) {
        console.error('Error fetching asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch requests' });
    }
};

// Get my requests (for employee)
exports.getMyRequests = async (req, res) => {
    try {
        const { id: userId, companyId } = req.user;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company context is missing' });
        }

        const requests = await getSharedPrismaClient().assetRequest.findMany({
            where: {
                companyId,
                requestedBy: userId
            },
            include: {
                asset: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        status: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const currentUser = await getSharedPrismaClient().user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, employeeNumber: true }
        });

        const requestsWithRequester = requests.map(req => ({
            ...req,
            requester: currentUser || null
        }));

        res.json({ success: true, data: requestsWithRequester });
    } catch (error) {
        console.error('❌ [BACKEND] Error fetching my asset requests:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your requests: ' + error.message });
    }
};

// Create new asset request
exports.createRequest = async (req, res) => {
    try {
        const { id: userId, companyId } = req.user;
        const { assetType, category, reason, priority } = req.body;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company context is missing' });
        }

        if (!assetType || !reason) {
            return res.status(400).json({
                success: false,
                message: 'نوع الأصل والسبب مطلوبان'
            });
        }

        const request = await getSharedPrismaClient().assetRequest.create({
            data: {
                companyId,
                requestedBy: userId,
                assetType,
                category: category || null,
                reason,
                priority: priority || 'NORMAL',
                status: 'PENDING'
            }
        });

        res.json({ success: true, data: request });
    } catch (error) {
        console.error('❌ [BACKEND] Error creating asset request:', error);
        res.status(500).json({ success: false, message: 'Failed to create request: ' + error.message });
    }
};

// Approve request
exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { notes } = req.body;

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Request already processed'
            });
        }

        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedBy: userId,
                approvedAt: new Date(),
                notes
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ success: false, message: 'Failed to approve request' });
    }
};

// Reject request
exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { rejectionReason } = req.body;

        if (!rejectionReason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Request already processed'
            });
        }

        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedBy: userId,
                rejectedAt: new Date(),
                rejectionReason
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
};

// Fulfill request (assign asset)
exports.fulfillRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, companyId } = req.user;
        const { assetId } = req.body;

        if (!assetId) {
            return res.status(400).json({
                success: false,
                message: 'Asset ID is required'
            });
        }

        const request = await getSharedPrismaClient().assetRequest.findFirst({
            where: { id, companyId }
        });

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: 'Request must be approved first'
            });
        }

        // Check if asset is available
        const asset = await getSharedPrismaClient().asset.findFirst({
            where: { id: assetId, companyId }
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        if (asset.status !== 'AVAILABLE') {
            return res.status(400).json({
                success: false,
                message: 'Asset is not available'
            });
        }

        // Update request
        const updated = await getSharedPrismaClient().assetRequest.update({
            where: { id },
            data: {
                status: 'FULFILLED',
                assetId,
                fulfilledBy: userId,
                fulfilledAt: new Date()
            }
        });

        // Assign asset to requester
        await getSharedPrismaClient().asset.update({
            where: { id: assetId },
            data: {
                status: 'IN_USE',
                assignedToId: request.requestedBy
            }
        });

        // Create custody history
        await getSharedPrismaClient().assetCustodyHistory.create({
            data: {
                assetId,
                userId: request.requestedBy,
                assignedBy: userId,
                action: 'ASSIGNED',
                assignedAt: new Date()
            }
        });

        // Create assignment record
        await getSharedPrismaClient().assetAssignment.create({
            data: {
                assetId,
                userId: request.requestedBy,
                assignedBy: userId,
                assignedAt: new Date()
            }
        });

        // TODO: Send notification to requester

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Error fulfilling request:', error);
        res.status(500).json({ success: false, message: 'Failed to fulfill request' });
    }
};

// Get request statistics
exports.getRequestStats = async (req, res) => {
    try {
        const { companyId } = req.user;

        const [total, pending, approved, rejected, fulfilled] = await Promise.all([
            getSharedPrismaClient().assetRequest.count({ where: { companyId } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'PENDING' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'APPROVED' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'REJECTED' } }),
            getSharedPrismaClient().assetRequest.count({ where: { companyId, status: 'FULFILLED' } })
        ]);

        res.json({
            success: true,
            data: {
                total,
                pending,
                approved,
                rejected,
                fulfilled
            }
        });
    } catch (error) {
        console.error('Error fetching request stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
};
