const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { getSharedPrismaClient, healthCheck: dbHealthCheck, checkModelIntegrity } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

function getBuildInfo() {
  let fileInfo = null;
  try {
    const buildInfoPath = path.resolve(__dirname, "../build-info.json");
    if (fs.existsSync(buildInfoPath)) {
      fileInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
    }
  } catch (_) {
    fileInfo = null;
  }

  const rawGitSha = process.env.GIT_SHA || fileInfo?.gitSha;
  const rawBuildTime = process.env.BUILD_TIME || fileInfo?.buildTime;

  return {
    gitSha: rawGitSha ? String(rawGitSha).trim() : null,
    buildTime: rawBuildTime ? String(rawBuildTime).trim() : null,
  };
}

router.get("/", async (req, res) => {
  const buildInfo = getBuildInfo();

  if (req.app?.get("isShuttingDown")) {
    return res.status(503).json({
      status: "SHUTTING_DOWN",
      message: "Server worker is draining in-flight connections",
      uptime: process.uptime(),
      build: buildInfo,
    });
  }

  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    security: "OK",
    version: "1.0.0",
    build: buildInfo,
  };

  try {
    // Use lightweight database health check (SELECT 1) instead of heavy query
    const dbStatus = await dbHealthCheck();

    if (dbStatus.status === 'ok') {
      healthCheck.database = "Connected";
      healthCheck.dbStats = {
        queryCount: dbStatus.queries || dbStatus.queryCount || 0,
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
      healthCheck.error = dbStatus.error || dbStatus.message;
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

