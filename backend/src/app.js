const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { errorHandler } = require('./middleware/errorHandler');
const { errorResponse } = require('./utils/responseHelper');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const studentRoutes = require('./routes/studentRoutes');
const parentRoutes = require('./routes/parentRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const accessRequestRoutes = require('./routes/accessRequestRoutes');

const app = express();

// 1. Security HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows CDN assets for Bootstrap, FontAwesome & Chart.js
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', globalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes for security reasons.',
  },
});
app.use('/api/auth/login', authLimiter);

// 4. Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Serve Frontend Static Assets
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// 6. Serve Generated PDFs securely
const pdfPath = path.resolve(__dirname, '../generated-pdfs');
app.use('/generated-pdfs', express.static(pdfPath));

// 7. API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: process.env.APP_NAME || 'Academic Department Assistance System',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 8. Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/request-access', accessRequestRoutes);

// 9. Root route fallback: serve frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 10. 404 Route Handler for undefined API routes
app.use('/api/*', (req, res) => {
  errorResponse(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
});

// 11. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
