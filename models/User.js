import mongoose from "mongoose"
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  gamesPlayed: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password)
}

userSchema.virtual('winRate').get(function() {
  if (this.gamesPlayed === 0) return 0
  return ((this.wins / this.gamesPlayed) * 100).toFixed(2)
})

userSchema.virtual('averageScore').get(function() {
  if (this.gamesPlayed === 0) return 0
  return (this.totalScore / this.gamesPlayed).toFixed(2)
})

userSchema.set('toJSON', { virtuals: true })
userSchema.set('toObject', { virtuals: true })

export default mongoose.model("User", userSchema)
