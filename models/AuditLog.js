import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: null },

    action: { type: String, required: true }, // e.g. LOGIN_SUCCESS

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true } // createdAt, updatedAt
);

export default mongoose.model("AuditLog", auditLogSchema);
