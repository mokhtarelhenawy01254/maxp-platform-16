const { getSharedPrismaClient } = require('./sharedDatabase');

class DeviceService {
  constructor() {
    this.prisma = null;
    this.tableEnsured = false;
  }

  getDb() {
    if (!this.prisma) {
      this.prisma = getSharedPrismaClient();
    }
    return this.prisma;
  }

  /**
   * Defensive DDL: Ensures user_devices table exists even before schema push
   */
  async ensureTable() {
    if (this.tableEnsured) return;
    try {
      const db = this.getDb();
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "user_devices" (
          "id" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "fingerprint" TEXT NOT NULL,
          "deviceName" TEXT NOT NULL,
          "deviceType" TEXT NOT NULL DEFAULT 'PERSONAL',
          "clientType" TEXT NOT NULL DEFAULT 'DESKTOP',
          "osVersion" TEXT,
          "appVersion" TEXT,
          "ipAddress" TEXT,
          "isApproved" BOOLEAN NOT NULL DEFAULT true,
          "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
        );
      `);

      await db.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "user_devices_companyId_fingerprint_key" 
        ON "user_devices" ("companyId", "fingerprint");
      `);

      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "user_devices_companyId_userId_idx" 
        ON "user_devices" ("companyId", "userId");
      `);

      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "user_devices_fingerprint_idx" 
        ON "user_devices" ("fingerprint");
      `);

      this.tableEnsured = true;
    } catch (err) {
      // Table already exists or permission constraint — log debug and continue
      if (process.env.NODE_ENV === 'development') {
        console.debug('[DeviceService] ensureTable notice:', err.message);
      }
      this.tableEnsured = true;
    }
  }

  /**
   * One-time or heartbeat registration of a user device
   */
  async registerDevice({
    companyId,
    userId,
    fingerprint,
    deviceName,
    clientType = 'DESKTOP',
    osVersion,
    appVersion,
    ipAddress,
  }) {
    if (!companyId || !userId || !fingerprint) {
      throw new Error('companyId, userId, and fingerprint are required');
    }

    await this.ensureTable();
    const db = this.getDb();
    const cleanFingerprint = String(fingerprint).trim();
    const cleanDeviceName = String(deviceName || 'جهاز غير مسمّى').slice(0, 100);

    const existing = await db.userDevice.findUnique({
      where: {
        companyId_fingerprint: {
          companyId,
          fingerprint: cleanFingerprint,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (existing) {
      const updated = await db.userDevice.update({
        where: { id: existing.id },
        data: {
          userId, // sync ownership in case employee account changed
          deviceName: cleanDeviceName || existing.deviceName,
          osVersion: osVersion ? String(osVersion).slice(0, 100) : existing.osVersion,
          appVersion: appVersion ? String(appVersion).slice(0, 50) : existing.appVersion,
          ipAddress: ipAddress || existing.ipAddress,
          clientType: clientType || existing.clientType,
          lastActiveAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        device: updated,
        isNew: false,
        deviceType: updated.deviceType,
        isApproved: updated.isApproved,
      };
    }

    // New device: default to PERSONAL for security
    const newDevice = await db.userDevice.create({
      data: {
        companyId,
        userId,
        fingerprint: cleanFingerprint,
        deviceName: cleanDeviceName,
        deviceType: 'PERSONAL',
        clientType: clientType || 'DESKTOP',
        osVersion: osVersion ? String(osVersion).slice(0, 100) : null,
        appVersion: appVersion ? String(appVersion).slice(0, 50) : null,
        ipAddress: ipAddress || null,
        isApproved: true,
        lastActiveAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      device: newDevice,
      isNew: true,
      deviceType: newDevice.deviceType,
      isApproved: newDevice.isApproved,
    };
  }

  /**
   * Look up device by company and fingerprint
   */
  async getDevice(companyId, fingerprint) {
    if (!companyId || !fingerprint) return null;
    await this.ensureTable();
    const db = this.getDb();
    try {
      return await db.userDevice.findUnique({
        where: {
          companyId_fingerprint: {
            companyId,
            fingerprint: String(fingerprint).trim(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * List all company devices with filtering and pagination
   */
  async listDevices({ companyId, userId, deviceType, search, page = 1, limit = 50 }) {
    if (!companyId) return { devices: [], total: 0, page: 1, limit };
    await this.ensureTable();
    const db = this.getDb();

    const where = { companyId };
    if (userId) where.userId = userId;
    if (deviceType && ['OFFICE', 'PERSONAL'].includes(deviceType.toUpperCase())) {
      where.deviceType = deviceType.toUpperCase();
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { deviceName: { contains: q, mode: 'insensitive' } },
        { fingerprint: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const skip = Math.max(0, (Number(page) - 1) * Number(limit));
    const take = Math.min(100, Math.max(1, Number(limit)));

    const [devices, total] = await Promise.all([
      db.userDevice.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastActiveAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      db.userDevice.count({ where }),
    ]);

    return {
      devices,
      total,
      page: Number(page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Update device type (OFFICE <-> PERSONAL) or status from Admin Dashboard
   */
  async updateDevice(companyId, deviceId, { deviceType, isApproved, deviceName }) {
    if (!companyId || !deviceId) {
      throw new Error('companyId and deviceId are required');
    }
    await this.ensureTable();
    const db = this.getDb();

    const existing = await db.userDevice.findFirst({
      where: { id: deviceId, companyId },
    });

    if (!existing) {
      throw new Error('الجهاز غير موجود أو لا يتبع لهذه الشركة');
    }

    const data = {};
    if (deviceType && ['OFFICE', 'PERSONAL'].includes(deviceType.toUpperCase())) {
      data.deviceType = deviceType.toUpperCase();
    }
    if (typeof isApproved === 'boolean') {
      data.isApproved = isApproved;
    }
    if (typeof deviceName === 'string' && deviceName.trim()) {
      data.deviceName = deviceName.trim().slice(0, 100);
    }

    const updated = await db.userDevice.update({
      where: { id: deviceId },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete / Unregister device
   */
  async deleteDevice(companyId, deviceId) {
    if (!companyId || !deviceId) {
      throw new Error('companyId and deviceId are required');
    }
    await this.ensureTable();
    const db = this.getDb();

    const existing = await db.userDevice.findFirst({
      where: { id: deviceId, companyId },
    });

    if (!existing) {
      throw new Error('الجهاز غير موجود');
    }

    return db.userDevice.delete({
      where: { id: deviceId },
    });
  }
}

module.exports = new DeviceService();
