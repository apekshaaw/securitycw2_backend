import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: null },

    action: { type: String, required: true }, 

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true } 
);

export default mongoose.model("AuditLog", auditLogSchema);
