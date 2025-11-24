import mongoose from "mongoose"

const matchSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  scores: { type: Map, of: Number, default: new Map() },
  duration: { type: Number }, // in seconds
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.model("Match", matchSchema)
