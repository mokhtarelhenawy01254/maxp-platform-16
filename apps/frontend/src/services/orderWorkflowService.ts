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

export interface AuditLogFilters {
    userId?: string;
    changeType?: string;
    orderNumber?: string;
    startDate?: string;
    endDate?: string;
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

    getGlobalAuditLogs: (limit: number = 20, offset: number = 0, filters?: AuditLogFilters | string) => {
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        params.append('offset', String(offset));

        if (typeof filters === 'string') {
            if (filters && filters !== 'ALL') params.append('userId', filters);
        } else if (filters && typeof filters === 'object') {
            if (filters.userId && filters.userId !== 'ALL') params.append('userId', filters.userId);
            if (filters.changeType && filters.changeType !== 'ALL') params.append('changeType', filters.changeType);
            if (filters.orderNumber && filters.orderNumber.trim()) params.append('orderNumber', filters.orderNumber.trim());
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
        }

        return api.get(`/order-workflow/audit-logs?${params.toString()}`).then(res => res.data);
    },
    getAuditLogs: (orderId: string) => api.get(`/order-workflow/audit-logs/${orderId}`).then(res => res.data),

    getAllowedTransitions: (currentStatusCode: string) =>
        api.get(`/order-workflow/allowed-transitions?currentStatusCode=${encodeURIComponent(currentStatusCode)}`).then(res => res.data),

    changeStatus: (orderId: string, statusId: string, reason?: string, isOverride: boolean = false) =>
        api.post('/order-workflow/change-status', { orderId, statusId, reason, isOverride }).then(res => res.data),

    seedDefaultStatuses: () => api.post('/order-workflow/statuses/seed-defaults').then(res => res.data),
};

export default orderWorkflowService;
