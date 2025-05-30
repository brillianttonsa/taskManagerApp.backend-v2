import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'

// Import configurations
import { setupEmail } from "./config/email.js"

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js"

import authRoutes from "./routes/authRoutes.js"
import taskRoutes from "./routes/taskRoutes.js"
import familyRoutes from "./routes/familyRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"

// Load environment variables
dotenv.config()


// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

console.log("🚀 Starting TaskFlow Server...")
console.log("📦 Node.js version:", process.version)


//express middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

await setupEmail()


console.log("🔧 Setting up routes...")
// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "TaskFlow Server is running",
    timestamp: new Date().toISOString(),
    node_version: process.version,
    uptime: process.uptime(),
  })
})

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "TaskFlow API Server",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/*",
      tasks: "/api/tasks/*",
      family: "/api/family/*",
      dashboard: "/api/dashboard/*",
    },
  })
})


// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/tasks", taskRoutes)
app.use("/api/family", familyRoutes)
app.use("/api/dashboard", dashboardRoutes)


// Error handling middleware
app.use(errorHandler)

// 404 handler



app.listen(PORT, () => {
  console.log(`🚀 TaskFlow Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🌐 API Base URL: http://localhost:${PORT}`)
  console.log(`📚 Available endpoints:`)
  console.log(`   🔐 Auth: /api/auth/register, /api/auth/login`)
  console.log(`   📋 Tasks: /api/tasks (GET, POST, PUT, DELETE)`)
  console.log(`   👨‍👩‍👧‍👦 Family: /api/family/* (info, create, join, members, tasks)`)
  console.log(`   📊 Dashboard: /api/dashboard/stats`)
  console.log(`✅ Server startup complete!`)
})
