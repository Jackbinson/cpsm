import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, "A valid email is required"],
  },
  password: {
    type: String,
    required: function passwordIsRequired() {
      return !this.googleId;
    },
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  avatarUrl: {
    type: String,
    trim: true,
    default: "",
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  sessionVersion: {
    type: Number,
    default: 0,
    select: false,
  },
}, {
  timestamps: true,
});

const User = mongoose.model("User", UserSchema);

export default User;