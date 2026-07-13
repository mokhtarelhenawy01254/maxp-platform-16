/**
 * Safe Database Helper - Prevents "TypeError: Cannot read properties of undefined"
 * 
 * This module provides safe wrappers for common Prisma operations.
 * Use these functions instead of calling Prisma directly to avoid connection issues.
 */

const { 
  getSharedPrismaClient,
  getSharedPrismaClientAsync,
  safeQuery,
  safePrismaOperation,
  safeFindFirst,
  executeWithRetry,
  healthCheck
} = require('../services/sharedDatabase');

/**
 * ✅ CORRECT PATTERN 1: Use safeQuery for most operations
 * This guarantees connection before executing the query
 */
async function findCustomerById(customerId) {
  return safeQuery(async (prisma) => {
    return await prisma.customer.findUnique({
      where: { id: customerId }
    });
  }, 'findCustomerById');
}

/**
 * ✅ CORRECT PATTERN 2: Use safeFindFirst for findFirst operations
 * Safe wrapper that prevents undefined errors
 */
async function findActiveConversation(customerId) {
  return safeFindFirst(
    'conversation', // Model name as string
    {
      where: { 
        customerId,
        status: 'ACTIVE'
      }
    },
    'findActiveConversation'
  );
}

/**
 * ✅ CORRECT PATTERN 3: Use getSharedPrismaClientAsync for guaranteed async access
 * This ensures connection is established before returning the client
 */
async function createNewOrder(orderData) {
  const prisma = await getSharedPrismaClientAsync();
  
  if (!prisma) {
    throw new Error('Failed to get Prisma client for createNewOrder');
  }
  
  return await prisma.order.create({
    data: orderData
  });
}

/**
 * ✅ CORRECT PATTERN 4: Use executeWithRetry for critical operations
 * Retries on connection errors
 */
async function updateCompanySettings(companyId, settings) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    
    if (!prisma) {
      throw new Error('Prisma client not available');
    }
    
    return await prisma.company.update({
      where: { id: companyId },
      data: settings
    });
  }, 3, 1000);
}

/**
 * ✅ CORRECT PATTERN 5: Use safePrismaOperation for custom operations
 * Generic wrapper for any Prisma operation
 */
async function getCompanyWithEmployees(companyId) {
  return safePrismaOperation(
    async (prisma) => {
      return await prisma.company.findUnique({
        where: { id: companyId },
        include: { employees: true }
      });
    },
    'getCompanyWithEmployees'
  );
}

/**
 * ❌ WRONG PATTERN: Direct usage without safe wrappers
 * This can cause "Cannot read properties of undefined" errors:
 * 
 * async function badExample(customerId) {
 *   const prisma = getSharedPrismaClient(); // May not be connected!
 *   return await prisma.customer.findFirst({ where: { id: customerId } }); // ERROR!
 * }
 */

/**
 * ❌ WRONG PATTERN: Creating new PrismaClient instances
 * This bypasses the shared connection and can cause connection issues:
 * 
 * async function badExample2() {
 *   const { PrismaClient } = require('@prisma/client');
 *   const prisma = new PrismaClient(); // NEW INSTANCE - BAD!
 *   return await prisma.user.findFirst();
 * }
 */

/**
 * ✅ CORRECT PATTERN 6: Check for Prisma availability before use
 */
async function safeGetUser(userId) {
  try {
    const prisma = getSharedPrismaClient();
    
    if (!prisma) {
      console.error('❌ Prisma client not available');
      return null;
    }
    
    // Verify the model exists before calling
    if (!prisma.user) {
      console.error('❌ User model not available on Prisma client');
      return null;
    }
    
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  } catch (error) {
    console.error('❌ Error in safeGetUser:', error.message);
    return null;
  }
}

/**
 * ✅ CORRECT PATTERN 7: Transaction with safety
 */
async function transferCustomerToCompany(customerId, companyId) {
  return safeQuery(async (prisma) => {
    return await prisma.$transaction(async (tx) => {
      // Update customer
      await tx.customer.update({
        where: { id: customerId },
        data: { companyId }
      });
      
      // Get updated customer
      return await tx.customer.findUnique({
        where: { id: customerId }
      });
    });
  }, 'transferCustomerToCompany');
}

/**
 * ✅ CORRECT PATTERN 8: Batch operations with safety
 */
async function bulkUpdateOrderStatus(orderIds, newStatus) {
  return executeWithRetry(async () => {
    const prisma = getSharedPrismaClient();
    
    if (!prisma) {
      throw new Error('Prisma client not available');
    }
    
    return await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: newStatus }
    });
  }, 3, 2000);
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  return await healthCheck();
}

module.exports = {
  // Safe wrappers
  findCustomerById,
  findActiveConversation,
  createNewOrder,
  updateCompanySettings,
  getCompanyWithEmployees,
  safeGetUser,
  transferCustomerToCompany,
  bulkUpdateOrderStatus,
  checkDatabaseHealth,
  
  // Re-export for convenience
  getSharedPrismaClient,
  getSharedPrismaClientAsync,
  safeQuery,
  safePrismaOperation,
  safeFindFirst,
  executeWithRetry,
  healthCheck
};
