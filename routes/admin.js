import express from "express"
import User from "../models/User.js"
import Room from "../models/Room.js"
import Match from "../models/Match.js"
import { adminAuth } from "../middleware/adminAuth.js"

const router = express.Router()

// Apply admin authentication to all routes
router.use(adminAuth)

// ============ DASHBOARD STATS ============
router.get("/dashboard/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" })
    const totalRooms = await Room.countDocuments()
    const totalMatches = await Match.countDocuments()
    const activeRooms = await Room.countDocuments({ status: "playing" })
    
    const recentMatches = await Match.find()
      .populate("winner", "username")
      .populate("players", "username")
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({
      totalUsers,
      totalRooms,
      totalMatches,
      activeRooms,
      recentMatches
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    res.status(500).json({ error: "Failed to fetch dashboard stats" })
  }
})

// ============ USER MANAGEMENT ============
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    console.error("Fetch users error:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

router.get("/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    
    const userMatches = await Match.find({ players: req.params.userId })
      .populate("winner", "username")
      .populate("players", "username")
      .sort({ createdAt: -1 })
      .limit(20)

    res.json({ user, matches: userMatches })
  } catch (error) {
    console.error("Fetch user error:", error)
    res.status(500).json({ error: "Failed to fetch user details" })
  }
})

router.patch("/users/:userId/toggle-status", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    
    user.isActive = !user.isActive
    await user.save()
    
    res.json({ message: "User status updated", user })
  } catch (error) {
    console.error("Toggle user status error:", error)
    res.status(500).json({ error: "Failed to update user status" })
  }
})

router.delete("/users/:userId", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    
    await Match.deleteMany({ players: req.params.userId })
    
    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ error: "Failed to delete user" })
  }
})

// ============ ROOM MANAGEMENT ============
router.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("host", "username")
      .populate("players", "username")
      .sort({ createdAt: -1 })
    res.json(rooms)
  } catch (error) {
    console.error("Fetch rooms error:", error)
    res.status(500).json({ error: "Failed to fetch rooms" })
  }
})

router.get("/rooms/:roomId", async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("host", "username email")
      .populate("players", "username email")
      .populate("readyPlayers", "username")
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    const roomMatches = await Match.find({ room: req.params.roomId })
      .populate("winner", "username")
      .populate("players", "username")

    res.json({ room, matches: roomMatches })
  } catch (error) {
    console.error("Fetch room error:", error)
    res.status(500).json({ error: "Failed to fetch room details" })
  }
})

router.delete("/rooms/:roomId", async (req, res) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.roomId)
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }
    
    res.json({ message: "Room deleted successfully" })
  } catch (error) {
    console.error("Delete room error:", error)
    res.status(500).json({ error: "Failed to delete room" })
  }
})

// ============ MATCH MANAGEMENT ============
router.get("/matches", async (req, res) => {
  try {
    const matches = await Match.find()
      .populate("winner", "username")
      .populate("players", "username")
      .populate("room", "name")
      .sort({ createdAt: -1 })
    res.json(matches)
  } catch (error) {
    console.error("Fetch matches error:", error)
    res.status(500).json({ error: "Failed to fetch matches" })
  }
})

router.get("/matches/:matchId", async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId)
      .populate("winner", "username email")
      .populate("players", "username email")
      .populate("room", "name")
    
    if (!match) {
      return res.status(404).json({ error: "Match not found" })
    }

    res.json(match)
  } catch (error) {
    console.error("Fetch match error:", error)
    res.status(500).json({ error: "Failed to fetch match details" })
  }
})

router.delete("/matches/:matchId", async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.matchId)
    if (!match) {
      return res.status(404).json({ error: "Match not found" })
    }
    
    res.json({ message: "Match deleted successfully" })
  } catch (error) {
    console.error("Delete match error:", error)
    res.status(500).json({ error: "Failed to delete match" })
  }
})

export default router
