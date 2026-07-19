const express = require("express");
const router = express.Router();
const { getSharedPrismaClient, healthCheck: dbHealthCheck, checkModelIntegrity } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

router.get("/", async (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    security: "OK",
    version: "1.0.0",
  };

  try {
    // Use lightweight database health check (SELECT 1) instead of heavy query
    const dbStatus = await dbHealthCheck();

    if (dbStatus.status === 'ok') {
      healthCheck.database = "Connected";
      healthCheck.dbStats = {
        queryCount: dbStatus.queryCount,
        latency: dbStatus.latency,
        queue: dbStatus.queue,
        active: dbStatus.active
      };
    } else if (dbStatus.status === 'connection_limit') {
      healthCheck.database = "Limited";
      healthCheck.status = "DEGRADED";
      healthCheck.warning = "Connection pool in cooldown mode";
      healthCheck.dbStats = {
        poolStatus: dbStatus.connectionLimitStatus,
        cooldownEndsAt: dbStatus.cooldownEndsAt
      };
    } else {
      healthCheck.database = "Disconnected";
      healthCheck.status = "ERROR";
      healthCheck.error = dbStatus.error;
    }

    // Check Model Integrity
    const integrityStatus = await checkModelIntegrity();
    healthCheck.integrity = integrityStatus.status === 'ok' ? 'OK' : 'ERROR';
    if (integrityStatus.status !== 'ok') {
      healthCheck.status = "ERROR";
      healthCheck.missingModels = integrityStatus.missing;
    }
  } catch (error) {
    healthCheck.database = "Disconnected";
    healthCheck.status = "ERROR";
    healthCheck.error = error.message;
  }

  const statusCode = healthCheck.status === "OK" ? 200 :
    healthCheck.status === "DEGRADED" ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

module.exports = router;

