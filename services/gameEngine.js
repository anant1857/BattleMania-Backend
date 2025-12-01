const GAME_DURATION = 300
const TICK_RATE = 20
const UNIT_SPEED = 2
const ATTACK_RANGE = 50

const gameRooms = new Map()

export const setupGameSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("create_room", async (data) => {
      const playersMap = new Map();
      if (data.hostId && data.hostName) {
        playersMap.set(data.hostId, {
          id: data.hostId,
          name: data.hostName,
          isReady: false,
        });
      }

      gameRooms.set(data.roomId, {
        id: data.roomId,
        players: playersMap,
        units: [],
        scores: {},
        gameActive: false,
        startTime: null,
      });
      
      socket.join(data.roomId);
      console.log(`Room ${data.roomId} created`);

      try {
        const Room = await import("../models/Room.js").then((m) => m.default)
        const dbRoom = await Room.findById(data.roomId)
        if (dbRoom) {
          await dbRoom.populate("players", "username")
          await dbRoom.populate("host", "username")
          await dbRoom.populate("readyPlayers", "username")
          io.to(data.roomId).emit("room_updated", dbRoom)
        }
      } catch (err) {
        console.error("Error fetching room after creation:", err)
      }
    });

    socket.on("join_room", async (data) => {
      const { roomId, playerId, playerName } = data
      socket.join(roomId)

      const room = gameRooms.get(roomId)
      if (room) {
        if (!room.players.has(playerId)) {
          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            isReady: false,
          })
          room.scores[playerId] = 0
        }
      }

      try {
        const Room = await import("../models/Room.js").then((m) => m.default)
        const dbRoom = await Room.findById(roomId)
        if (dbRoom && !dbRoom.players.some(id => id.toString() === playerId)) {
          dbRoom.players.push(playerId)
          await dbRoom.save()
        }
        if (dbRoom) {
          await dbRoom.populate("players", "username")
          await dbRoom.populate("host", "username")
          await dbRoom.populate("readyPlayers", "username")
          io.to(roomId).emit("room_updated", dbRoom)
        }
      } catch (err) {
        console.error("Error updating/joining room in DB:", err)
      }
    })

    socket.on("toggle_ready", async (data) => {
      const { roomId, playerId } = data
      const room = gameRooms.get(roomId)
      
      if (!room) {
        console.error(`Room ${roomId} not found in gameRooms`)
        return
      }

      if (!room.players.has(playerId)) {
        console.error(`Player ${playerId} not found in room ${roomId}`)
        return
      }

      const player = room.players.get(playerId)
      player.isReady = !player.isReady

      try {
        const Room = await import("../models/Room.js").then((m) => m.default)
        const dbRoom = await Room.findById(roomId)
        
        if (dbRoom) {
          const isCurrentlyReady = dbRoom.readyPlayers.some(id => id.toString() === playerId.toString())
          
          if (player.isReady && !isCurrentlyReady) {
            dbRoom.readyPlayers.push(playerId)
          } else if (!player.isReady && isCurrentlyReady) {
            dbRoom.readyPlayers = dbRoom.readyPlayers.filter(id => id.toString() !== playerId.toString())
          }
          
          await dbRoom.save()
          await dbRoom.populate("players", "username")
          await dbRoom.populate("host", "username")
          await dbRoom.populate("readyPlayers", "username")
          
          console.log(`Player ${playerId} ready status: ${player.isReady}`)
          console.log(`Ready players in DB:`, dbRoom.readyPlayers.map(p => p._id.toString()))
          
          io.to(roomId).emit("room_updated", dbRoom)
        }
      } catch (err) {
        console.error("Error updating ready status in database:", err)
      }
    })

    socket.on("start_game", async (data) => {
      const { roomId } = data
      const room = gameRooms.get(roomId)
      if (room) {
        room.gameActive = true
        room.startTime = Date.now()
        room.units = []
        
        room.players.forEach((player) => {
          room.scores[player.id] = 0
        })

        io.to(roomId).emit("game_started")

        try {
          const Room = await import("../models/Room.js").then((m) => m.default)
          const dbRoom = await Room.findById(roomId)
          if (dbRoom) {
            dbRoom.status = "playing"
            dbRoom.startedAt = new Date()
            await dbRoom.save()
            await dbRoom.populate("players", "username")
            await dbRoom.populate("host", "username")
            await dbRoom.populate("readyPlayers", "username")
            io.to(roomId).emit("room_updated", dbRoom)
          }
        } catch (err) {
          console.error("Error updating room status in database:", err)
        }

        startGameLoop(io, roomId, room)
      }
    })

    socket.on("spawn_unit", (data) => {
      const { roomId, playerId, unitType, x, y } = data
      const room = gameRooms.get(roomId)
      if (room && room.gameActive) {
        const unit = {
          id: Math.random().toString(36).substr(2, 9),
          playerId,
          type: unitType,
          x,
          y,
          health: getUnitMaxHealth(unitType),
          maxHealth: getUnitMaxHealth(unitType),
          damage: getUnitDamage(unitType),
          speed: getUnitSpeed(unitType),
          attackRange: ATTACK_RANGE,
          targetX: x,
          targetY: y,
        }
        room.units.push(unit)
        io.to(roomId).emit("unit_spawned", unit)
      }
    })

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id)
    })
  })
}

const startGameLoop = (io, roomId, room) => {
  const interval = setInterval(async () => {
    if (!room.gameActive) {
      clearInterval(interval)
      return
    }

    const elapsed = (Date.now() - room.startTime) / 1000
    if (elapsed > GAME_DURATION) {
      room.gameActive = false
      
      // Determine winner
      const scores = Object.entries(room.scores)
      const winner = scores.reduce((a, b) => (a[1] > b[1] ? a : b))
      const isDraw = scores.every(([, score]) => score === winner[1])
      
      const gameEndData = {
        winner: isDraw ? null : winner[0],
        scores: room.scores,
        isDraw,
      }

      // Save match to database
      try {
        const Match = await import("../models/Match.js").then((m) => m.default)
        const User = await import("../models/User.js").then((m) => m.default)
        const Room = await import("../models/Room.js").then((m) => m.default)

        const dbRoom = await Room.findById(roomId)
        if (dbRoom) {
          // Create match record
          const match = new Match({
            room: roomId,
            players: Array.from(room.players.keys()),
            winner: isDraw ? null : winner[0],
            scores: room.scores,
            duration: Math.floor(elapsed),
            endedAt: new Date(),
          })
          await match.save()

          // Update room status
          dbRoom.status = "finished"
          dbRoom.finishedAt = new Date()
          await dbRoom.save()

          // Update user statistics
          for (const [playerId, score] of Object.entries(room.scores)) {
            await User.findByIdAndUpdate(playerId, {
              $inc: {
                gamesPlayed: 1,
                totalScore: score,
                wins: playerId === winner[0] && !isDraw ? 1 : 0,
                losses: playerId !== winner[0] && !isDraw ? 1 : 0,
                draws: isDraw ? 1 : 0,
              },
            })
          }
        }
      } catch (err) {
        console.error("Error saving match data:", err)
      }

      io.to(roomId).emit("game_ended", gameEndData)
      clearInterval(interval)
      return
    }

    // Update units
    for (let i = room.units.length - 1; i >= 0; i--) {
      const unit = room.units[i]

      const nearestEnemy = findNearestEnemy(unit, room.units)
      if (nearestEnemy) {
        const dx = nearestEnemy.x - unit.x
        const dy = nearestEnemy.y - unit.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > unit.attackRange) {
          unit.targetX = nearestEnemy.x
          unit.targetY = nearestEnemy.y
        }
      }

      const dx = unit.targetX - unit.x
      const dy = unit.targetY - unit.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > unit.speed) {
        unit.x += (dx / dist) * unit.speed
        unit.y += (dy / dist) * unit.speed
      }

      const target = findNearestEnemy(unit, room.units, unit.attackRange)
      if (target) {
        target.health -= unit.damage
        if (target.health <= 0) {
          room.units.splice(room.units.indexOf(target), 1)
          room.scores[unit.playerId] = (room.scores[unit.playerId] || 0) + 10
        }
      }
    }

    io.to(roomId).emit("game_tick", {
      units: room.units,
      scores: room.scores,
      timeRemaining: Math.max(0, GAME_DURATION - elapsed),
      gameActive: true,
    })
  }, 1000 / TICK_RATE)
}

const findNearestEnemy = (unit, units, maxDist = Number.POSITIVE_INFINITY) => {
  let nearest = null
  let minDist = maxDist

  for (const other of units) {
    if (other.playerId !== unit.playerId) {
      const dx = other.x - unit.x
      const dy = other.y - unit.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < minDist) {
        minDist = dist
        nearest = other
      }
    }
  }

  return nearest
}

const getUnitMaxHealth = (type) => {
  const stats = { soldier: 30, tank: 60, turret: 40 }
  return stats[type] || 30
}

const getUnitDamage = (type) => {
  const stats = { soldier: 5, tank: 8, turret: 6 }
  return stats[type] || 5
}

const getUnitSpeed = (type) => {
  const stats = { soldier: 2, tank: 1, turret: 0 }
  return stats[type] || 2
}
