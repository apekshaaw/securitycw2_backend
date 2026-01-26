const adminOnly = (req, res, next) => {
  if (req.userRole === "admin") return next();
  return res.status(403).json({ message: "Admin only" });
};

export default adminOnly;
