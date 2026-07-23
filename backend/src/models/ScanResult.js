import mongoose from "mongoose";

const scanResultSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      required: false,
      index: true,
    },
    resourceId: {
      type: String,
      required: false,
    },
    resourceName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ["S3", "EC2", "RDS", "IAM", "AWS S3", "EC2_SecurityGroup", "IAM_User"],
    },
    isViolating: {
      type: Boolean,
      required: true,
      default: false,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "None"],
      default: "None",
    },
    status: {
      type: String,
      default: "Unknown",
    },
    reason: {
      type: String,
      default: "",
    },
    rawCloudConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

scanResultSchema.index(
  { scanId: 1, resourceId: 1 },
  {
    unique: true,
    partialFilterExpression: { scanId: { $exists: true }, resourceId: { $exists: true } },
  }
);

export default mongoose.model("ScanResult", scanResultSchema);
