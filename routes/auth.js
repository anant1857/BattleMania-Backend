import express from "express"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

const router = express.Router()

// Regular user registration
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    const user = new User({ username, email, password, role: "user" })
    await user.save()

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    )

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Registration failed" })
  }
})

// Login (handles both admin and regular users)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if credentials match admin from .env
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Admin login via environment variables
      let adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL })

      // Create admin user if doesn't exist
      if (!adminUser) {
        adminUser = new User({
          username: "admin",
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD,
          role: "admin",
        })
        await adminUser.save()
      }

      const token = jwt.sign(
        { id: adminUser._id, role: "admin" },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      )

      return res.json({
        token,
        user: {
          id: adminUser._id,
          username: adminUser.username,
          email: adminUser.email,
          role: "admin",
        },
      })
    }

    // Regular user login
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is deactivated" })
    }

    const isValidPassword = await user.comparePassword(password)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    )

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
})

export default router
