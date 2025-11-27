import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, trim: true },
    center: { type: String, trim: true },
    plan: { type: String, trim: true },
    consent: { type: Boolean, default: false },
    source: { type: String, default: "landing" }
  },
  { timestamps: true }
);

waitlistSchema.index({ email: 1 }, { unique: false }); // permite duplicados controlados

export const WaitlistEntry = mongoose.model("WaitlistEntry", waitlistSchema);
