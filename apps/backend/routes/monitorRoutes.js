const express = require("express");
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { webhookQueue } = require("../queues/webhookQueue");
const { getHistoricalMetrics } = require("../services/monitoringService");

/**
 * Get BullMQ Queue Statistics
 */
router.get(
  "/queues",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  async (req, res) => {
    try {
      const { type } = req.query;

      if (!webhookQueue) {
        return res.json({
          success: true,
          stats: {
            webhookProcessing: {
              active: 0,
              waiting: 0,
              completed: 0,
              failed: 0,
              delayed: 0,
              paused: 0,
            },
          },
          recentJobs: [],
          queueAvailable: false,
          timestamp: new Date(),
        });
      }

      const counts = await webhookQueue.getJobCounts(
        "active",
        "waiting",
        "completed",
        "failed",
        "delayed",
        "paused",
      );

      let recentJobs = [];

      // Strategy: If a specific type is requested (and it's not 'all'), we fetch a larger batch
      // from Redis to find the relevant jobs, skipping over the noise (like read-receipts).
      const SEARCH_DEPTH = 500; // Look through last 500 jobs

      if (type && type !== "all") {
        if (type === "failed") {
          recentJobs = await webhookQueue.getJobs(["failed"], 0, 10, false);
        } else {
          let jobNameFilter = null;
          if (type === "message") jobNameFilter = "facebook-message";
          else if (type === "comment") jobNameFilter = "facebook-comment";
          else if (type === "read") jobNameFilter = "facebook-read-receipt";

          if (jobNameFilter) {
            // Fetch a larger batch
            const candidates = await webhookQueue.getJobs(
              ["completed", "failed"],
              0,
              SEARCH_DEPTH,
              false,
            );
            // Filter in memory
            recentJobs = candidates
              .filter((job) => job.name === jobNameFilter)
              .slice(0, 10);
          } else {
            recentJobs = await webhookQueue.getJobs(
              ["completed", "failed"],
              0,
              10,
              false,
            );
          }
        }
      } else {
        // Default: just get the absolute latest 10 jobs
        recentJobs = await webhookQueue.getJobs(
          ["completed", "failed"],
          0,
          10,
          false,
        );
      }

      const formattedJobs = await Promise.all(
        recentJobs.map(async (job) => {
          let dataDisplay = "N/A";
          const status = await job.getState();

          try {
            if (job.name === "facebook-message") {
              dataDisplay = job.data?.mid || job.data?.messageId || "Message";
            } else if (job.name === "facebook-read-receipt") {
              const sender = job.data?.webhookEvent?.sender?.id;
              const watermark = job.data?.webhookEvent?.read?.watermark;
              dataDisplay = sender
                ? `Read by: ${sender.substring(0, 16)}`
                : "Read Receipt";
              if (watermark)
                dataDisplay += ` (${new Date(watermark).toLocaleTimeString()})`;
            } else if (job.name === "facebook-comment") {
              dataDisplay = job.data?.comment_id
                ? `Comment: ${job.data.comment_id}`
                : "Comment";
            } else {
              dataDisplay =
                job.data?.id ||
                job.data?.mid ||
                (typeof job.data === "object"
                  ? JSON.stringify(job.data).substring(0, 50) + "..."
                  : String(job.data));
            }
          } catch (e) {
            dataDisplay = "Error parsing data";
          }

          return {
            id: job.id,
            name: job.name,
            data: dataDisplay,
            status: status,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            rawPayload: job.data,
          };
        }),
      );

      res.json({
        success: true,
        stats: {
          webhookProcessing: counts,
        },
        recentJobs: formattedJobs,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(
        "❌ [MONITOR-API] Failed to fetch queue stats:",
        error.message,
      );
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

/**
 * Get Historical Queue Statistics
 */
router.get(
  "/history",
  verifyToken.authenticateToken,
  verifyToken.requireSuperAdmin,
  async (req, res) => {
    try {
      const { days } = req.query;
      const metrics = await getHistoricalMetrics(days ? parseInt(days) : 7);

      res.json({
        success: true,
        history: metrics,
      });
    } catch (error) {
      console.error("❌ [MONITOR-ROUTE] History fetch failed:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to fetch historical metrics",
      });
    }
  },
);

module.exports = router;
