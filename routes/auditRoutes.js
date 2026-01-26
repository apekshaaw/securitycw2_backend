import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminOnly from "../middleware/adminOnly.js";
import AuditLog from "../models/AuditLog.js";

const router = express.Router();

// GET /api/admin/audit-logs
router.get("/audit-logs", authMiddleware, adminOnly, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);

    return res.json({ page, limit, total, items });
  } catch (err) {
    console.error("Audit logs error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
