import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ""
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: "otros"
    },

    center: {
      type: String,
      default: ""
    },

    plan: {
      type: String,
      enum: ["personal", "pro", "academia"],
      default: "personal"
    },

    creditsUsed: {
      type: Number,
      default: 0
    },

    // Stripe
    stripeCustomerId: {
      type: String,
      default: ""
    },

    stripeSubscriptionId: {
      type: String,
      default: ""
    },

    subscriptionStatus: {
      type: String,
      default: "none"
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model("User", userSchema);

export default User;
