const { AsyncLocalStorage } = require('async_hooks');

const BYPASS_FLAG = '__MAXP_BYPASS_TENANT__';

/**
 * TenantContext - Manages the current tenant's ID across the request lifecycle.
 * Enables automatic tenant isolation and safe cross-tenant operations.
 */
class TenantContext {
    constructor() {
        this.storage = new AsyncLocalStorage();
    }

    /**
     * Run a function within a specific tenant context
     */
    run(companyId, callback) {
        if (!companyId) {
            return callback();
        }
        return this.storage.run(companyId, callback);
    }

    /**
     * Run a function with tenant isolation explicitly bypassed (e.g. for superadmin or system jobs)
     */
    bypass(callback) {
        return this.storage.run(BYPASS_FLAG, callback);
    }

    /**
     * Check if the current context is explicitly bypassed
     */
    isBypassed() {
        return this.storage.getStore() === BYPASS_FLAG;
    }

    /**
     * Get the current companyId from the context
     */
    getCompanyId() {
        const store = this.storage.getStore();
        if (!store || store === BYPASS_FLAG) {
            return null;
        }
        return typeof store === 'object' ? store.companyId : store;
    }

    /**
     * Middleware for Express to set the tenant context from the user's token or session
     */
    middleware() {
        return (req, res, next) => {
            // Super admins can bypass tenant restriction if explicitly operating cross-company
            if (req.user && req.user.role === 'SUPER_ADMIN' && req.headers['x-bypass-tenant'] === 'true') {
                return this.bypass(next);
            }

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

