const { getSharedPrismaClient } = require("../services/sharedDatabase");

exports.getRules = async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });

    const rules = await getSharedPrismaClient().orderStatusAutoChangeRule.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(rules);
  } catch (error) {
    console.error("Error fetching status rules:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createRule = async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) return res.status(401).json({ message: "Unauthorized" });

    const { fromStatus, toStatus, waitTime, timeUnit } = req.body;

    if (!fromStatus || !toStatus || !waitTime || !timeUnit) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const rule = await getSharedPrismaClient().orderStatusAutoChangeRule.create({
      data: {
        companyId,
        fromStatus,
        toStatus,
        waitTime: parseInt(waitTime, 10),
        timeUnit,
      },
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error("Error creating status rule:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    if (!companyId) return res.status(401).json({ message: "Unauthorized" });

    const rule = await getSharedPrismaClient().orderStatusAutoChangeRule.findUnique({
      where: { id },
    });

    if (!rule || rule.companyId !== companyId) {
      return res.status(404).json({ message: "Rule not found" });
    }

    await getSharedPrismaClient().orderStatusAutoChangeRule.delete({
      where: { id },
    });

    res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting status rule:", error);
    res.status(500).json({ message: "Server error" });
  }
};
