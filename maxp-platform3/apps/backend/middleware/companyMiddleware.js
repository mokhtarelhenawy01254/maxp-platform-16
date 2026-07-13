/**
 * Company Identification & Infrastructure Middleware
 * Purely for cross-origin and shared identifier logic.
 */
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('./subdomainMiddleware');

/**
 * Middleware to add CORS headers for public routes (e.g. Landing Pages)
 */
const addPublicCORS = (req, res, next) => {
  const origin = req.get('origin');
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-cart-id, x-session-id, X-Company-Subdomain, X-Subdomain, x-subdomain, X-Company-Id, x-company-id, X-Company-Slug, x-company-slug, X-Request-ID, x-request-id');

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
};

module.exports = {
  addPublicCORS,
  extractSubdomainMiddleware,
  getCompanyFromSubdomain: extractSubdomainMiddleware,
  requireCompany,
};
