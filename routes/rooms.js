import express from "express"
import { verifyToken } from "../middleware/auth.js"
import Room from "../models/Room.js"
import User from "../models/User.js"

const router = express.Router()

router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find({ status: "waiting" }).populate("host", "username").populate("players", "username")
    res.json(rooms)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" })
  }
})

router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, password, gameDuration } = req.body
    const user = await User.findById(req.userId)

    const room = new Room({
      name,
      password: password || "",
      gameDuration: gameDuration || 300,
      host: req.userId,
      players: [req.userId],
      readyPlayers: [], // Empty - host is NOT auto-ready
    })
    await room.save()
    await room.populate("host", "username")
    await room.populate("players", "username")

    res.status(201).json(room)
  } catch (error) {
    res.status(500).json({ error: "Failed to create room" })
  }
})

router.post("/:roomId/join", verifyToken, async (req, res) => {
  try {
    const { password } = req.body
    const room = await Room.findById(req.params.roomId)
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }

    if (room.password && room.password !== password) {
      return res.status(403).json({ error: "Incorrect password" })
    }

    if (room.players.length >= room.maxPlayers) {
      return res.status(400).json({ error: "Room is full" })
    }

    if (!room.players.includes(req.userId)) {
      room.players.push(req.userId)
      await room.save()
    }

    await room.populate("players", "username")
    await room.populate("host", "username")
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: "Failed to join room" })
  }
})

router.get("/:roomId", async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId)
      .populate("host", "username")
      .populate("players", "username")
      .populate("readyPlayers", "username")
    if (!room) {
      return res.status(404).json({ error: "Room not found" })
    }
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch room" })
  }
})

export default router
