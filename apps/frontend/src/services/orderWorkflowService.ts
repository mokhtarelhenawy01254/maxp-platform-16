import api from './api';

export interface OrderWorkflowConfig {
    id: string;
    companyId: string;
    enabled: boolean;
    enforceTransitions: boolean;
    requireApprovalByDefault: boolean;
    allowOverride: boolean;
    overrideRoles: string;
}

export interface OrderStatusDefinition {
    id: string;
    name: string;
    code: string;
    color: string;
    isTerminal: boolean;
    lockAfterEntry: boolean;
    requiresApprovalToExit: boolean;
    sortOrder: number;
    description?: string;
    notifyCustomer?: boolean;
}

export interface OrderWorkflowTransition {
    id: string;
    fromStatusId: string;
    toStatusId: string;
    allowedRoles: string; // JSON string [role, role]
    requiresApproval: boolean;
    allowOverride: boolean;
    restrictBackward: boolean;
}

const orderWorkflowService = {
    getConfig: () => api.get('/order-workflow/config').then(res => res.data),
    updateConfig: (data: Partial<OrderWorkflowConfig>) => api.put('/order-workflow/config', data).then(res => res.data),

    getStatuses: () => api.get('/order-workflow/statuses').then(res => res.data),
    upsertStatus: (data: Partial<OrderStatusDefinition>) => api.post('/order-workflow/statuses', data).then(res => res.data),
    deleteStatus: (id: string) => api.delete(`/order-workflow/statuses/${id}`).then(res => res.data),

    getTransitions: () => api.get('/order-workflow/transitions').then(res => res.data),
    upsertTransition: (data: Partial<OrderWorkflowTransition>) => api.post('/order-workflow/transitions', data).then(res => res.data),
    deleteTransition: (id: string) => api.delete(`/order-workflow/transitions/${id}`).then(res => res.data),

    getPendingApprovals: (limit: number = 20, offset: number = 0) => api.get(`/order-workflow/approvals/pending?limit=${limit}&offset=${offset}`).then(res => res.data),
    reviewApproval: (id: string, action: 'approve' | 'reject', reason?: string) =>
        api.post(`/order-workflow/approvals/${id}/review`, { action, reason }).then(res => res.data),

    getGlobalAuditLogs: (limit: number = 20, offset: number = 0, userId?: string) => {
        const userQuery = userId && userId !== 'ALL' ? `&userId=${encodeURIComponent(userId)}` : '';
        return api.get(`/order-workflow/audit-logs?limit=${limit}&offset=${offset}${userQuery}`).then(res => res.data);
    },
    getAuditLogs: (orderId: string) => api.get(`/order-workflow/audit-logs/${orderId}`).then(res => res.data),

    getAllowedTransitions: (currentStatusCode: string) =>
        api.get(`/order-workflow/allowed-transitions?currentStatusCode=${encodeURIComponent(currentStatusCode)}`).then(res => res.data),

    changeStatus: (orderId: string, statusId: string, reason?: string, isOverride: boolean = false) =>
        api.post('/order-workflow/change-status', { orderId, statusId, reason, isOverride }).then(res => res.data),

    seedDefaultStatuses: () => api.post('/order-workflow/statuses/seed-defaults').then(res => res.data),
};

export default orderWorkflowService;
