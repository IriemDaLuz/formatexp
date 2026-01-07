
import mongoose from "mongoose";

const waitlistEntrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      default: ""
    },
    center: {
      type: String,
      default: ""
    },
    plan: {
      type: String,
      default: "personal"
    },
    consent: {
      type: Boolean,
      default: false
    },
    source: {
      type: String,
      default: "landing"
    }
  },
  {
    timestamps: true
  }
);

const WaitlistEntry = mongoose.model(
  "WaitlistEntry",
  waitlistEntrySchema
);

export default WaitlistEntry;
