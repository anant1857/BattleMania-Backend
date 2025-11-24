import mongoose from "mongoose"
import User from "../models/User.js"
import dotenv from "dotenv"

dotenv.config()

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/battlegame")

    await User.deleteMany({})

    const users = [
      { username: "player1", email: "player1@test.com", password: "demo123", wins: 5, losses: 2 },
      { username: "player2", email: "player2@test.com", password: "demo123", wins: 3, losses: 4 },
      { username: "player3", email: "player3@test.com", password: "demo123", wins: 8, losses: 1 },
    ]

    await User.insertMany(users)
    console.log("Database seeded successfully")

    process.exit(0)
  } catch (error) {
    console.error("Seed failed:", error)
    process.exit(1)
  }
}

seedDatabase()
