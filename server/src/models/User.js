// server/src/models/User.js
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
  lowercase: true,
  trim: true
}
,

    passwordHash: {
      type: String,
      required: true,
      select: false // nunca se devuelve por defecto
    },

    role: {
      type: String,
      enum: ["otros", "primaria", "secundaria", "universidad"],
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
      default: 0,
      min: 0
    },

    // =====================
    // Stripe (privado)
    // =====================
    stripeCustomerId: {
      type: String,
      default: "",
      select: false
    },

    stripeSubscriptionId: {
      type: String,
      default: "",
      select: false
    },

    subscriptionStatus: {
      type: String,
      enum: ["none", "active", "past_due", "canceled"],
      default: "none"
    }
  },
  {
    timestamps: true
  }
);

// Índice explícito para garantizar unicidad real
userSchema.index({ email: 1 }, { unique: true });

// Seguridad extra: nunca devolver passwordHash aunque se haga .toJSON()
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

export default User;
