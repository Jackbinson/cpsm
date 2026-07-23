import mongoose from "mongoose";

const scanRunSchema = new mongoose.Schema(
  {
    scanId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["queued", "running", "cancelling", "cancelled", "completed", "failed"],
      default: "queued",
      index: true,
    },
    idempotencyScope: {
      type: String,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    queueJobId: {
      type: String,
      default: null,
    },
    attempt: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 4,
      min: 1,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    progress: {
      stage: {
        type: String,
        enum: ["queued", "s3", "ec2", "iam", "finalizing", "done"],
        default: "queued",
      },
      processed: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
    },
    summary: {
      processed: { type: Number, default: 0 },
      violated: { type: Number, default: 0 },
      fixed: { type: Number, default: 0 },
    },
    error: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      stack: { type: String, select: false, default: null },
    },
    cancelRequestedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

scanRunSchema.index(
  { idempotencyScope: 1, idempotencyKey: 1 },
  { unique: true }
);
scanRunSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ScanRun", scanRunSchema);
