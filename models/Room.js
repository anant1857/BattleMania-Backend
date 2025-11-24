import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, default: "" },
  gameDuration: { type: Number, default: 300 }, // in seconds
  maxPlayers: { type: Number, default: 2 },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["waiting", "playing", "finished"], default: "waiting" },
  readyPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model("Room", roomSchema)
