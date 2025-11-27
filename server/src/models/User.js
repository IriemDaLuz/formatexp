import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["maestro", "secundaria", "universidad", "formador", "academia", "otros"],
      default: "otros"
    },
    center: { type: String, trim: true },
    plan: {
      type: String,
      enum: ["personal", "pro", "academia"],
      default: "personal"
    },
    credits: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
