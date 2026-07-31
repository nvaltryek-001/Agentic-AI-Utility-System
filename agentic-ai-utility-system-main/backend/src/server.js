import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import faultRoutes from "./routes/faultRoutes.js";
import technicianRoutes from "./routes/technicianRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import simulationRoutes from "./routes/simulationRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { initializeLearning } from "./agents/learningAgent.js";
import { createRedisAdapter } from "./config/redis.js";
import { initializeProcessors, scheduleRecurringJobs, getQueueStatus } from "./services/queueService.js";
import logger, { requestLogger, eventLogger, metrics } from "./services/loggerService.js";

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io with Redis adapter for scaling
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? FRONTEND_URL
      : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Use Redis adapter if enabled
if (process.env.REDIS_ENABLED === 'true') {
  try {
    io.adapter(createRedisAdapter());
    logger.info('Redis adapter enabled for Socket.io');
  } catch (err) {
    logger.error('Failed to initialize Redis adapter:', err);
  }
}

global.io = io; // make globally accessible

// Request logging
app.use(requestLogger);

// Real-time Multi-Actor Event System
const activeUsers = new Map();
const activeTechnicians = new Map();
const activeAdmins = new Map();

// Validation helper functions
const isValidRole = (role) => ['citizen', 'technician', 'admin'].includes(role);
const isValidGPS = (location) => {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return false;
  }
  return location.lat >= -90 && location.lat <= 90 &&
    location.lng >= -180 && location.lng <= 180;
};

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  // User authentication and room joining
  socket.on("authenticate", (data) => {
    const { userId, role, location } = data;

    // Validate role
    if (!isValidRole(role)) {
      console.error(`❌ Invalid role attempted: ${role}`);
      return socket.emit('auth:error', { message: 'Invalid role' });
    }

    // Validate GPS if provided
    if (location && !isValidGPS(location)) {
      console.error(`❌ Invalid GPS coordinates: ${JSON.stringify(location)}`);
      return socket.emit('auth:error', { message: 'Invalid GPS coordinates' });
    }

    socket.userId = userId;
    socket.role = role;
    socket.location = location;

    // Join role-specific room
    socket.join(`role:${role}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join location-based room for city-wide updates
    if (location?.city) {
      socket.join(`city:${location.city}`);
    }

    // Track active users
    const userData = { socketId: socket.id, userId, role, location, connectedAt: Date.now() };

    if (role === 'technician') {
      activeTechnicians.set(userId, userData);
      io.emit('technician:online', { userId, location });
    } else if (role === 'admin') {
      activeAdmins.set(userId, userData);
    } else {
      activeUsers.set(userId, userData);
    }

    console.log(`✅ ${role} ${userId} authenticated and joined rooms`);

    // Send current system state
    socket.emit('system:state', {
      activeTechnicians: Array.from(activeTechnicians.values()),
      onlineUsers: activeUsers.size + activeTechnicians.size + activeAdmins.size
    });
  });

  // Technician location tracking
  socket.on("technician:location", (data) => {
    const { userId, location, heading, speed } = data;

    if (activeTechnicians.has(userId)) {
      const tech = activeTechnicians.get(userId);
      tech.location = location;
      tech.lastUpdate = Date.now();

      // Broadcast to relevant users
      socket.to(`city:${tech.location?.city}`).emit('technician:moving', {
        userId,
        location,
        heading,
        speed,
        timestamp: Date.now()
      });

      // Notify assigned fault reporters
      if (tech.assignedFault) {
        io.to(`user:${tech.assignedFault.reportedBy}`).emit('technician:approaching', {
          technicianId: userId,
          location,
          eta: tech.eta
        });
      }
    }
  });

  // Fault status updates
  socket.on("fault:statusUpdate", (data) => {
    const { faultId, status, updatedBy, timestamp } = data;

    // Broadcast to all relevant parties
    io.emit('fault:updated', {
      faultId,
      status,
      updatedBy,
      timestamp: timestamp || Date.now()
    });

    // Notify specific users
    io.to(`fault:${faultId}`).emit('fault:statusChanged', data);
  });

  // Technician accepts assignment
  socket.on("technician:accept", (data) => {
    const { faultId, technicianId, eta } = data;

    const tech = activeTechnicians.get(technicianId);
    if (tech) {
      tech.assignedFault = { faultId, acceptedAt: Date.now(), eta };
      tech.status = 'traveling';
    }

    io.emit('assignment:accepted', {
      faultId,
      technicianId,
      eta,
      timestamp: Date.now()
    });
  });

  // Technician status updates
  socket.on("technician:status", (data) => {
    const { technicianId, status, faultId, location } = data;

    const tech = activeTechnicians.get(technicianId);
    if (tech) {
      tech.status = status;
      tech.location = location || tech.location;
    }

    io.emit('technician:statusUpdate', {
      technicianId,
      status,
      faultId,
      location,
      timestamp: Date.now()
    });
  });

  // Join fault-specific room for updates
  socket.on("fault:subscribe", (faultId) => {
    socket.join(`fault:${faultId}`);
    console.log(`Socket ${socket.id} subscribed to fault ${faultId}`);
  });

  // Admin broadcast
  socket.on("admin:broadcast", (data) => {
    if (socket.role === 'admin') {
      io.emit('admin:announcement', {
        ...data,
        timestamp: Date.now()
      });
    }
  });

  // Handle disconnection and cleanup
  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);

    if (socket.userId) {
      if (socket.role === 'technician') {
        activeTechnicians.delete(socket.userId);
        // Notify all users that technician went offline
        io.emit('technician:offline', { userId: socket.userId, timestamp: Date.now() });
      } else if (socket.role === 'admin') {
        activeAdmins.delete(socket.userId);
      } else {
        activeUsers.delete(socket.userId);
      }
    }

    // Leave all rooms
    socket.leaveAll();

    // Emit disconnect metric
    eventLogger.socket.disconnect(socket.userId, socket.role);
  });
});

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/faults", faultRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/simulate", simulationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/upload", uploadRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Valtryek_001 API is running",
    version: "1.0.0",
    agents: ["FaultAnalysis", "PriorityDecision", "Assignment", "Rescheduler", "Learning"],
    features: ["Redis", "Queue System", "Monitoring", "Real-time"]
  });
});

// System status endpoint
app.get("/api/status", async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: metrics.getMetrics(),
    queues: await getQueueStatus()
  });
});

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Initialize queue processors (safe fallback if Redis disabled)
    initializeProcessors();
    logger.info('Queue processors initialized');

    // Schedule recurring jobs
    scheduleRecurringJobs();
    logger.info('Recurring jobs scheduled');

    // Initialize learning agent
    await initializeLearning();
    logger.info('Learning agent initialized');

    // Log system startup
    eventLogger.system.startup();

  } catch (err) {
    logger.error('Service initialization error:', err);
    console.error('⚠️ Some services failed to initialize, continuing...');
  }
};

// Start server
const PORT = process.env.PORT || 5000;

initializeServices().then(() => {
  server.listen(PORT, () => {
    console.log('\n' + '═'.repeat(50));
    console.log('🚀 Valtryek_001 Server Running');
    console.log('═'.repeat(50));
    console.log(`📡 API:     http://localhost:${PORT}`);
    console.log(`🔌 Socket:  ws://localhost:${PORT}`);
    console.log(`🔴 Redis:   ${process.env.REDIS_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
    console.log(`🌍 Mode:    ${process.env.NODE_ENV || 'development'}`);
    console.log('═'.repeat(50) + '\n');
  });
}).catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  eventLogger.system.shutdown('SIGTERM');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  eventLogger.system.shutdown('SIGINT');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
