import express from "express"
import User from "../models/User.js"

const router = express.Router()

router.get("/leaderboard", async (req, res) => {
  try {
    const users = await User.find().sort({ wins: -1, totalScore: -1 }).limit(10)
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" })
  }
})

router.get("/:userId/profile", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" })
  }
})

export default router
