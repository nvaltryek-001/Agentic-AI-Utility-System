import winston from 'winston';
import path from 'path';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'valtryek-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Request logs
    new winston.transports.File({
      filename: path.join(logsDir, 'requests.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // AI Agent logs
    new winston.transports.File({
      filename: path.join(logsDir, 'ai-agents.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logger.error('Unhandled Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });
  
  next(err);
};

// AI Agent logger
export const aiLogger = {
  decision: (agentName, decision, context) => {
    logger.info('AI Decision', {
      agent: agentName,
      decision,
      context,
      timestamp: new Date().toISOString()
    });
  },
  
  analysis: (agentName, analysis, duration) => {
    logger.info('AI Analysis', {
      agent: agentName,
      analysis,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  },
  
  learning: (agentName, learning) => {
    logger.info('AI Learning', {
      agent: agentName,
      learning,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (agentName, error, context) => {
    logger.error('AI Error', {
      agent: agentName,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance monitoring
export const performanceLogger = {
  start: (operation) => {
    return {
      operation,
      startTime: process.hrtime.bigint()
    };
  },
  
  end: (timer, metadata = {}) => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to milliseconds
    
    logger.info('Performance Metric', {
      operation: timer.operation,
      duration: `${duration.toFixed(2)}ms`,
      ...metadata
    });
    
    return duration;
  }
};

// Business event logger
export const eventLogger = {
  fault: {
    created: (fault, user) => {
      logger.info('Fault Created', {
        event: 'fault.created',
        faultId: fault._id,
        type: fault.type,
        severity: fault.severity,
        userId: user?.id,
        location: fault.location
      });
    },
    
    assigned: (fault, technician) => {
      logger.info('Fault Assigned', {
        event: 'fault.assigned',
        faultId: fault._id,
        technicianId: technician._id,
        technicianName: technician.name
      });
    },
    
    resolved: (fault, resolution) => {
      logger.info('Fault Resolved', {
        event: 'fault.resolved',
        faultId: fault._id,
        resolutionTime: resolution.time,
        rating: resolution.rating
      });
    }
  },
  
  user: {
    login: (user, ip) => {
      logger.info('User Login', {
        event: 'user.login',
        userId: user._id,
        email: user.email,
        role: user.role,
        ip
      });
    },
    
    logout: (user) => {
      logger.info('User Logout', {
        event: 'user.logout',
        userId: user._id
      });
    }
  },
  
  system: {
    startup: () => {
      logger.info('System Startup', {
        event: 'system.startup',
        version: process.env.npm_package_version,
        nodeVersion: process.version,
        platform: process.platform
      });
    },
    
    shutdown: (signal) => {
      logger.info('System Shutdown', {
        event: 'system.shutdown',
        signal
      });
    }
  }
};

// Metrics collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: { total: 0, errors: 0 },
      responseTime: [],
      activeUsers: 0,
      faults: { created: 0, resolved: 0 },
      aiDecisions: 0
    };
    this.startCollection();
  }
  
  startCollection() {
    // Log metrics every minute
    setInterval(() => {
      this.logMetrics();
    }, 60000);
  }
  
  recordRequest(duration, isError = false) {
    this.metrics.requests.total++;
    if (isError) this.metrics.requests.errors++;
    this.metrics.responseTime.push(duration);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }
  
  recordFaultCreated() {
    this.metrics.faults.created++;
  }
  
  recordFaultResolved() {
    this.metrics.faults.resolved++;
  }
  
  recordAIDecision() {
    this.metrics.aiDecisions++;
  }
  
  setActiveUsers(count) {
    this.metrics.activeUsers = count;
  }
  
  getAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    const sum = this.metrics.responseTime.reduce((a, b) => a + b, 0);
    return sum / this.metrics.responseTime.length;
  }
  
  logMetrics() {
    const avgResponseTime = this.getAverageResponseTime();
    const errorRate = this.metrics.requests.total > 0 
      ? (this.metrics.requests.errors / this.metrics.requests.total) * 100 
      : 0;
    
    logger.info('System Metrics', {
      requests: this.metrics.requests,
      avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
      errorRate: `${errorRate.toFixed(2)}%`,
      activeUsers: this.metrics.activeUsers,
      faults: this.metrics.faults,
      aiDecisions: this.metrics.aiDecisions
    });
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      avgResponseTime: this.getAverageResponseTime()
    };
  }
}

export const metrics = new MetricsCollector();

// Audit logger for compliance
export const auditLogger = {
  log: (action, entity, user, details) => {
    logger.info('Audit Log', {
      audit: true,
      action,
      entity: {
        type: entity.type,
        id: entity.id
      },
      user: {
        id: user.id,
        role: user.role
      },
      details,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;
