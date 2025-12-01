import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin only." })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Admin auth error:", error)
    res.status(401).json({ error: "Invalid token" })
  }
}
