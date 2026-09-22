const { getSharedPrismaClient } = require('./sharedDatabase');

/**
 * Cloud-synchronized Table Tabs Service for Cafe & Restaurant Suite
 * Enables cross-device real-time sync for dine-in tables, takeaway tickets, and KOT fire.
 */

async function listActiveTabs(companyId) {
  const prisma = getSharedPrismaClient();
  const tabs = await prisma.cafeTableTab.findMany({
    where: {
      companyId,
      status: 'OPEN'
    },
    orderBy: { updatedAt: 'desc' }
  });

  return tabs.map((tab) => ({
    id: tab.id,
    tableName: tab.tableName,
    tableNumber: tab.tableNumber,
    serverName: tab.serverName,
    serviceType: tab.serviceType,
    status: tab.status,
    items: typeof tab.items === 'string' ? JSON.parse(tab.items) : tab.items,
    subtotal: Number(tab.subtotal || 0),
    tax: Number(tab.tax || 0),
    total: Number(tab.total || 0),
    kotPrintedAt: tab.kotPrintedAt,
    customerName: tab.customerName,
    customerPhone: tab.customerPhone,
    openedBy: tab.openedBy,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt
  }));
}

async function saveOrUpdateTab({
  companyId,
  tabId,
  tableName,
  tableNumber,
  serverName,
  serviceType = 'DINE_IN',
  items = [],
  subtotal = 0,
  tax = 0,
  total = 0,
  customerName,
  customerPhone,
  openedBy
}) {
  const prisma = getSharedPrismaClient();

  if (tabId) {
    const existing = await prisma.cafeTableTab.findFirst({
      where: { id: tabId, companyId }
    });

    if (existing) {
      return await prisma.cafeTableTab.update({
        where: { id: tabId },
        data: {
          tableName: tableName || existing.tableName,
          tableNumber: tableNumber !== undefined ? tableNumber : existing.tableNumber,
          serverName: serverName !== undefined ? serverName : existing.serverName,
          serviceType: serviceType || existing.serviceType,
          items: items,
          subtotal,
          tax,
          total,
          customerName: customerName !== undefined ? customerName : existing.customerName,
          customerPhone: customerPhone !== undefined ? customerPhone : existing.customerPhone,
          updatedAt: new Date()
        }
      });
    }
  }

  // Create new tab
  return await prisma.cafeTableTab.create({
    data: {
      companyId,
      tableName: tableName || 'طاولة جديدة',
      tableNumber,
      serverName,
      serviceType,
      status: 'OPEN',
      items: items,
      subtotal,
      tax,
      total,
      customerName,
      customerPhone,
      openedBy
    }
  });
}

async function markKotFired(companyId, tabId) {
  const prisma = getSharedPrismaClient();
  return await prisma.cafeTableTab.updateMany({
    where: { id: tabId, companyId },
    data: { kotPrintedAt: new Date() }
  });
}

async function closeTab(companyId, tabId) {
  const prisma = getSharedPrismaClient();
  return await prisma.cafeTableTab.updateMany({
    where: { id: tabId, companyId },
    data: { status: 'CLOSED' }
  });
}

async function deleteTab(companyId, tabId) {
  const prisma = getSharedPrismaClient();
  return await prisma.cafeTableTab.deleteMany({
    where: { id: tabId, companyId }
  });
}

module.exports = {
  listActiveTabs,
  saveOrUpdateTab,
  markKotFired,
  closeTab,
  deleteTab
};
