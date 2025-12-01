import express from "express"
import Match from "../models/Match.js"

const router = express.Router()

// Get user match history
router.get("/user/:userId", async (req, res) => {
  try {
    const matches = await Match.find({ players: req.params.userId })
      .populate("winner", "username")
      .populate("players", "username")
      .sort({ createdAt: -1 })
      .limit(20)
    res.json(matches)
  } catch (error) {
    console.error("Match history fetch error:", error)
    res.status(500).json({ error: "Failed to fetch match history" })
  }
})

// Get single match details
router.get("/:matchId", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("winner", "username")
      .populate("players", "username")
      .populate("room", "name")
    if (!match) {
      return res.status(404).json({ error: "Match not found" })
    }
    res.json(match)
  } catch (error) {
    console.error("Match fetch error:", error)
    res.status(500).json({ error: "Failed to fetch match" })
  }
})

export default router
