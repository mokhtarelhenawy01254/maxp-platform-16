const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const verifyToken = require("../utils/verifyToken");

router.use(verifyToken.authenticateToken);

const defaultReplies = [
  {
    id: "welcome",
    title: "ترحيب",
    content: "مرحباً بك! كيف يمكنني مساعدتك اليوم؟",
    category: "welcome",
    createdAt: new Date().toISOString(),
  },
  {
    id: "thanks",
    title: "شكر",
    content: "شكراً لتواصلك معنا. نقدر ثقتك بنا.",
    category: "thanks",
    createdAt: new Date().toISOString(),
  },
  {
    id: "apology",
    title: "اعتذار",
    content: "نعتذر عن أي إزعاج. سنعمل على حل المشكلة فوراً.",
    category: "apology",
    createdAt: new Date().toISOString(),
  },
];

const companyRepliesStore = new Map();

const getCompanyReplies = (companyId) => {
  if (!companyRepliesStore.has(companyId)) {
    companyRepliesStore.set(
      companyId,
      defaultReplies.map((reply) => ({ ...reply })),
    );
  }

  return companyRepliesStore.get(companyId);
};

router.get("/", (req, res) => {
  const companyId = req.user?.companyId || "default";
  res.json(getCompanyReplies(companyId));
});

router.post("/", (req, res) => {
  const companyId = req.user?.companyId || "default";
  const { title, content, category = "custom" } = req.body || {};

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: "Title and content are required",
    });
  }

  const reply = {
    id: crypto.randomUUID(),
    title,
    content,
    category,
    createdAt: new Date().toISOString(),
  };

  const replies = getCompanyReplies(companyId);
  replies.unshift(reply);
  res.status(201).json(reply);
});

router.delete("/:id", (req, res) => {
  const companyId = req.user?.companyId || "default";
  const replies = getCompanyReplies(companyId);
  const nextReplies = replies.filter((reply) => reply.id !== req.params.id);
  companyRepliesStore.set(companyId, nextReplies);
  res.status(204).send();
});

module.exports = router;
