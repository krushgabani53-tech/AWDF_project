const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/database');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');
const supportRoutes = require('./routes/support');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      // allow localhost and 127.0.0.1 on any port or matching CLIENT_URL
      if (
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        origin === CLIENT_URL
      ) {
        return callback(null, true);
      }
      callback(null, true); // Dev-friendly permissive
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'slate_cookie_secret_key_2026'));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/support', supportRoutes);

// Root fallback route
app.get('/', (req, res) => {
  res.json({
    name: 'Slate Workspace API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server & Test Database Connection
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`===============================================`);
  console.log(` Slate Workspace Backend running on port ${PORT}`);
  console.log(` Allowed Client Origin: ${CLIENT_URL}`);
  console.log(` Health Endpoint: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);

  await testConnection();
});

