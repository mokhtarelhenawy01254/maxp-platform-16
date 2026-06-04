const { AsyncLocalStorage } = require('async_hooks');

/**
 * TenantContext - Manages the current tenant's ID across the request lifecycle.
 * This allows the database layer to know which companyId to use for RLS.
 */
class TenantContext {
    constructor() {
        this.storage = new AsyncLocalStorage();
    }

    /**
     * Run a function within a specific tenant context
     */
    run(companyId, callback) {
        return this.storage.run(companyId, callback);
    }

    /**
     * Get the current companyId from the context
     */
    getCompanyId() {
        return this.storage.getStore();
    }

    /**
     * Middleware for Express to set the tenant context from the user's token or session
     */
    middleware() {
        return (req, res, next) => {
            // companyId is usually attached to req by the auth/verifyToken middleware
            const companyId = req.companyId || (req.user && req.user.companyId);

            if (companyId) {
                this.run(companyId, next);
            } else {
                next();
            }
        };
    }
}

module.exports = new TenantContext();
