import express from "express"
import User from "../models/User.js"
import Match from "../models/Match.js"

const router = express.Router()

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find()
      .select("username wins losses draws gamesPlayed totalScore")
      .sort({ wins: -1, totalScore: -1 })
      .limit(10)
    res.json(users)
  } catch (error) {
    console.error("Leaderboard fetch error:", error)
    res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
})

// Get user profile
router.get("/:userId/profile", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

export default router
