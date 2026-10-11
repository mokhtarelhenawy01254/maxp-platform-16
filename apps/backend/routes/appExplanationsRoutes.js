const express = require("express");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { requireSuperAdmin, authenticateToken } = require("../middleware/superAdminMiddleware");

const router = express.Router();

const getPrisma = () => getSharedPrismaClient();

// Get all active explanations (public)
router.get("/public", async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma?.appExplanation) {
      return res.json({ success: true, explanations: [] });
    }
    const explanations = await prisma.appExplanation.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
    });
    res.json({ success: true, explanations });
  } catch (error) {
    console.error("Error fetching public app explanations:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get active explanations for a specific route (used by PageExplanations component)
router.get("/by-route", async (req, res) => {
  try {
    const { route } = req.query;
    if (!route) {
      return res.json({ success: true, explanations: [] });
    }

    const prisma = getPrisma();
    if (!prisma?.appExplanation) {
      return res.json({ success: true, explanations: [] });
    }

    // جلب الشروحات النشطة: ذات مسار محدد + شرح «كل الصفحات» (targetRoute فارغ
    // = يظهر كزر في كل صفحات التطبيق — قرار المنتج 2026-10-09)
    const explanations = await prisma.appExplanation.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: "asc",
      },
    });

    // Filter: match if the current route starts with the targetRoute —
    // targetRoute الفارغ يُعتبر مطابقًا لكل الصفحات
    const current = route.replace(/\/+$/, "");
    const matches = (explanations || []).filter((exp) => {
      const target = (exp.targetRoute || "").replace(/\/+$/, "");
      if (!target) return true;
      return current === target || current.startsWith(target + "/");
    });

    // لو فيه شرح مطابق للمسار بالظبط، نخفي شروحات الصفحات الأب (prefix match)
    // مثال: /orders/preparation كان بيوريك «أول أوردر» (من /orders) + «التجهيز» — بقى يوريك التجهيز بس
    const hasExactMatch = matches.some(
      (exp) => (exp.targetRoute || "").replace(/\/+$/, "") === current
    );
    const filtered = hasExactMatch
      ? matches.filter((exp) => {
          const target = (exp.targetRoute || "").replace(/\/+$/, "");
          return !target || target === current;
        })
      : matches;

    res.json({ success: true, explanations: filtered });
  } catch (error) {
    console.warn("⚠️ [AppExplanations] Error fetching explanations by route:", error.message);
    res.json({ success: true, explanations: [] });
  }
});

// Admin: get all explanations
router.get("/admin", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const explanations = await prisma.appExplanation.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json({ success: true, explanations });
  } catch (error) {
    console.error("Error fetching admin app explanations:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Get a single explanation by slug
router.get("/public/:slug", async (req, res) => {
  try {
    const prisma = getPrisma();
    const { slug } = req.params;
    const explanation = await prisma.appExplanation.findUnique({
      where: { slug },
    });
    
    if (!explanation) {
      return res.status(404).json({ success: false, message: "Explanation not found" });
    }
    
    res.json({ success: true, explanation });
  } catch (error) {
    console.error("Error fetching explanation by slug:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: create explanation
router.post("/admin", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { title, content, slug, targetRoute, videoUrl, isActive, order } = req.body;
    
    const newExplanation = await prisma.appExplanation.create({
      data: {
        title,
        content,
        slug,
        targetRoute: targetRoute || "",
        videoUrl: videoUrl || null,
        isActive: isActive !== undefined ? isActive : true,
        order: order || 0,
      },
    });
    
    res.status(201).json({ success: true, explanation: newExplanation });
  } catch (error) {
    console.error("Error creating app explanation:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: update explanation
router.put("/admin/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { title, content, slug, targetRoute, videoUrl, isActive, order } = req.body;
    
    const updatedExplanation = await prisma.appExplanation.update({
      where: { id },
      data: {
        title,
        content,
        slug,
        targetRoute,
        videoUrl,
        isActive,
        order,
      },
    });
    
    res.json({ success: true, explanation: updatedExplanation });
  } catch (error) {
    console.error("Error updating app explanation:", error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: "Slug already exists" });
    }
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Admin: delete explanation
router.delete("/admin/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    
    await prisma.appExplanation.delete({
      where: { id },
    });
    
    res.json({ success: true, message: "Explanation deleted successfully" });
  } catch (error) {
    console.error("Error deleting app explanation:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;
