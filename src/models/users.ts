import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: false,
  },
  googleId: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    default: "freelancer",
  },
  refreshToken: String,
  refreshTokenExpiration: Number,
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  timestamps: Date,
});

userSchema.index({ email: 1 }, { unique: true })

export default mongoose.model("User", userSchema);
