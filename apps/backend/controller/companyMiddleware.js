/**
 * Company Identification Middleware
 * Extracts company information from subdomain for public storefront routes
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Middleware to identify company from subdomain
 * This should be applied to all public routes
 */
const getCompanyFromSubdomain = async (req, res, next) => {
  try {
    const prisma = getPrisma();
    let company = null;

    // Method 1: Try to get from subdomain (PRIMARY METHOD)
    const hostHeader = req.headers['x-subdomain'] || req.headers['host'];

    if (hostHeader) {
      // استخراج الـ subdomain من hostname
      const hostname = hostHeader.split(':')[0]; // إزالة port إن وجد
      const parts = hostname.split('.');

      // التحقق من وجود subdomain
      // مثال: storename.mokhtarelhenawy.online -> storename
      if (parts.length >= 3 && parts[0] !== 'www') {
        const subdomain = parts[0];

        console.log('🔍 [Company Middleware] Extracted subdomain:', subdomain);

        // البحث عن الشركة باستخدام slug
        company = await prisma.company.findFirst({
          where: {
            slug: subdomain,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            email: true,
            phone: true,
            website: true,
            currency: true
          }
        });

        if (company) {
          console.log('✅ [Company Middleware] Company found via subdomain:', company.name);
        }
      } else {
        // If main domain or WWW, use the domain name part as slug
        const domainSlug = parts[parts.length - 2];
        console.log('🔍 [Company Middleware] Main domain or WWW detected, trying slug:', domainSlug);

        company = await prisma.company.findFirst({
          where: {
            slug: domainSlug,
            isActive: true
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            email: true,
            phone: true,
            website: true,
            currency: true
          }
        });

        if (company) {
          console.log('✅ [Company Middleware] Company found via main domain slug:', company.name);
        }
      }
    }

    // Method 2: Fallback to companyId from query parameter (for backward compatibility)
    if (!company && req.query.companyId) {
      const companyId = req.query.companyId;
      console.log('🔍 [Company Middleware] Fallback to companyId from query:', companyId);

      company = await prisma.company.findFirst({
        where: {
          id: companyId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          settings: true,
          isActive: true,
          email: true,
          phone: true,
          website: true,
          currency: true
        }
      });

      if (company) {
        console.log('✅ [Company Middleware] Company found via companyId:', company.name);
      }
    }

    // إذا لم يتم العثور على الشركة
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'المتجر غير موجود أو غير نشط',
        hint: 'استخدم https://storename.mokhtarelhenawy.online أو أضف ?companyId=xxx'
      });
    }

    // Add company to request object
    req.company = company;
    req.companyId = company.id;

    next();
  } catch (error) {
    console.error('❌ [Company Middleware] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to validate company ownership for authenticated routes
 * Ensures the user belongs to the same company as the subdomain
 */
const validateCompanyOwnership = (req, res, next) => {
  try {
    // If no company identified yet, skip validation
    if (!req.company) {
      return next();
    }

    // If no user authenticated, skip validation
    if (!req.user) {
      return next();
    }

    // Check if user belongs to the identified company
    if (req.user.companyId !== req.company.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not belong to this company'
      });
    }

    next();
  } catch (error) {
    console.error('Error in company ownership validation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to add CORS headers for public routes
 * Allows cross-origin requests from the company's frontend
 */
const addPublicCORS = (req, res, next) => {
  try {
    const origin = req.get('origin');

    // Always set CORS headers for public routes
    if (origin) {
      // Check if origin is allowed
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isMokhtarDomain = origin.includes('mokhtarelhenawy.online');

      if (isLocalhost || isMokhtarDomain) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    const requestedHeaders = req.headers['access-control-request-headers'];
    const defaultAllowedHeaders = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-cart-id, x-session-id, X-Company-Subdomain, X-Subdomain, x-subdomain, X-Company-Id, x-company-id, X-Company-Slug, x-company-slug, X-Request-ID, x-request-id, baggage, sentry-trace, *';
    res.header('Access-Control-Allow-Headers', requestedHeaders ? `${requestedHeaders}, ${defaultAllowedHeaders}` : defaultAllowedHeaders);
    res.header('Access-Control-Max-Age', '86400');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  } catch (error) {
    console.error('Error in public CORS middleware:', error);
    next();
  }
};

module.exports = {
  getCompanyFromSubdomain,
  validateCompanyOwnership,
  addPublicCORS
};
