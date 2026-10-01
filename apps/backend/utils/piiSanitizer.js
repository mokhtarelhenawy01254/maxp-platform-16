/**
 * PII Sanitizer for MaxP Super Admin API
 * 
 * Strict Enforcement:
 * - BANS all individual customer/user PII fields (name, phone, email, address).
 * - The ONLY exception is company/tenant name when the key has `admin:tenants:read` (or `*`).
 * - Deeply cleans nested objects, arrays, and string text patterns.
 */

// Normalized (lowercase alphanumeric) forbidden field names for individuals
const FORBIDDEN_INDIVIDUAL_FIELDS = new Set([
  'phone',
  'phonenumber',
  'customerphone',
  'telephone',
  'mobile',
  'whatsapp',
  'tel',
  'email',
  'customeremail',
  'useremail',
  'clientemail',
  'recipientemail',
  'mail',
  'address',
  'customeraddress',
  'shippingaddress',
  'billingaddress',
  'street',
  'streetaddress',
  'postalcode',
  'zipcode',
  'flat',
  'building',
  'floor',
  'customername',
  'clientname',
  'recipientname',
  'fullname',
  'firstname',
  'lastname',
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'secret'
]);

// Regular expressions to detect phone and email patterns embedded in strings
const PHONE_PATTERN = /(?:\+?20|0)?1[0125]\d{8}\b/g;
const GENERIC_INTL_PHONE_PATTERN = /\b\+?[1-9]\d{9,13}\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;

/**
 * Clean a string of any accidental emails or phone numbers
 */
function sanitizeStringValue(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(PHONE_PATTERN, '[REDACTED_PHONE]')
    .replace(GENERIC_INTL_PHONE_PATTERN, '[REDACTED_PHONE]');
}

/**
 * Deep recursive sanitizer
 * @param {any} data
 * @param {object} options
 * @param {boolean} options.allowCompanyName - Whether company/tenant names are permitted
 * @param {boolean} options.isTenantEntity - Internal context tracker
 * @returns {any}
 */
function sanitizePii(data, options = {}) {
  const { allowCompanyName = false } = options;

  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data === 'string') {
    return sanitizeStringValue(data);
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Handle Dates, RegExps, Buffers
  if (data instanceof Date || data instanceof RegExp || Buffer.isBuffer(data)) {
    return data;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePii(item, options));
  }

  // Handle Objects
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Check unconditionally forbidden individual keys
    if (FORBIDDEN_INDIVIDUAL_FIELDS.has(normalizedKey)) {
      continue; // Drop completely
    }

    // 2. Check generic 'name' property
    if (normalizedKey === 'name') {
      // Determine if this object represents a company / tenant
      const isCompanyObject = (
        data.slug !== undefined && data.isActive !== undefined && (data.customDomain !== undefined || data.totalUsers !== undefined || data.plan !== undefined)
      ) || data.__isTenant || data.companyId !== undefined && !data.customerId && !data.userId;

      // Allow name ONLY if it's a company and the caller has tenant scope
      if (isCompanyObject) {
        if (!allowCompanyName) {
          continue; // Strip even company name if no tenant scope
        }
      } else {
        // Safe named entities that are NOT people: products, coupons, plans, roles, apps, categories, templates
        const isSafeCatalogEntity = (
          data.sku !== undefined || data.price !== undefined || data.code !== undefined ||
          data.appSlug !== undefined || data.roleName !== undefined || data.domain !== undefined ||
          data.category !== undefined || data.planType !== undefined || data.status !== undefined && data.stock !== undefined
        );

        if (!isSafeCatalogEntity) {
          // If it could be a customer, patient, user, or person, drop it
          if (data.customerId || data.userId || data.customer || data.recipient || data.patientId) {
            continue;
          }
        }
      }
    }

    // 3. Drop customerId or replace with anonymized hash if needed
    if (normalizedKey === 'customerid') {
      // Retain only as an opaque count/reference or keep omitted
      continue;
    }

    // 4. Recursive clean
    const sanitizedVal = sanitizePii(value, options);
    if (sanitizedVal !== undefined) {
      cleaned[key] = sanitizedVal;
    }
  }

  return cleaned;
}

/**
 * Express middleware to automatically intercept all res.json() calls
 * on the Admin API and sanitize before sending to the client.
 */
const piiSanitizerMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const scopes = req.externalApi?.scopes || [];
    const allowCompanyName = (
      scopes.includes('*') ||
      scopes.includes('admin:*') ||
      scopes.includes('admin:tenants:read')
    );

    const sanitized = sanitizePii(body, { allowCompanyName });
    return originalJson(sanitized);
  };

  next();
};

/**
 * Automated PII Audit Function (for verification and test suites)
 * Traverses data and returns any detected PII infractions.
 * @param {any} data
 * @param {object} options
 * @returns {Array<{ path: string, issue: string, value: any }>}
 */
function auditForPii(data, options = {}) {
  const infractions = [];
  const { allowCompanyName = false } = options;

  function traverse(node, currentPath = '') {
    if (!node || typeof node !== 'object') {
      if (typeof node === 'string') {
        if (EMAIL_PATTERN.test(node)) {
          infractions.push({ path: currentPath, issue: 'Exposed email in string', value: node });
        }
        if (PHONE_PATTERN.test(node)) {
          infractions.push({ path: currentPath, issue: 'Exposed phone in string', value: node });
        }
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => traverse(item, `${currentPath}[${index}]`));
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (FORBIDDEN_INDIVIDUAL_FIELDS.has(normalizedKey)) {
        infractions.push({ path: fieldPath, issue: `Forbidden PII field: ${key}`, value });
      }

      if (normalizedKey === 'name') {
        const isCompany = node.slug !== undefined || node.plan !== undefined || node.__isTenant;
        if (isCompany && !allowCompanyName) {
          infractions.push({ path: fieldPath, issue: 'Company name exposed without admin:tenants:read', value });
        } else if (!isCompany && (node.customerId || node.userId || node.email || node.phone)) {
          infractions.push({ path: fieldPath, issue: 'Customer personal name exposed', value });
        }
      }

      traverse(value, fieldPath);
    }
  }

  traverse(data);
  return infractions;
}

module.exports = {
  sanitizePii,
  piiSanitizerMiddleware,
  auditForPii,
  FORBIDDEN_INDIVIDUAL_FIELDS
};
