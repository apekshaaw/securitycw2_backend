import AuditLog from "../models/AuditLog.js";

const getClientIp = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
};

export const logAction = async (req, action, extra = {}) => {
  try {
    const userId = req.user?._id || null;
    const email = req.user?.email || extra.email || null;

    await AuditLog.create({
      userId,
      email,
      action,
      metadata: {
        ip: getClientIp(req),
        userAgent: req.headers["user-agent"] || null,
        method: req.method,
        path: req.originalUrl,
        ...extra,
      },
    });
  } catch (e) {
  }
};
