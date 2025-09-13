require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require('helmet');
const xss = require('xss-clean');
const { connectToDatabase } = require('../src/utils/db');

// Import routes
const { bookingRoutes, adminBookingRoutes } = require('../src/routes/booking.routes');
const tripRoutes = require('../src/routes/trip.routes');
const accommodationRoutes = require('../src/routes/accommodation.routes');
const cmsRoutes = require('../src/routes/cms.routes');
const newsletterRoutes = require('../src/routes/newsletter.routes');
const sheetsRoutes = require('../src/routes/sheets.routes');

const app = express();
const port = process.env.PORT || 5000;

// Validate environment variables on startup
if (!process.env.CLERK_SECRET_KEY) {
  console.error("FATAL ERROR: CLERK_SECRET_KEY not configured");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI is not defined in .env");
    process.exit(1);
}
if (!process.env.GOOGLE_SCRIPT_URL) {
  console.warn("WARNING: GOOGLE_SCRIPT_URL not configured. Google Sheets integration will be disabled.");
}

// Global Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://traveltrail-frontend.vercel.app",
      "https://trishelta.com",
      "https://www.trishelta.com",
      "http://trishelta.com",
      "http://www.trishelta.com",
      "https://trishelta.vercel.app",
      "http://trishelta.vercel.app",
      "https://www.trishelta.vercel.app"
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(helmet());
app.use(xss());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api', sheetsRoutes); // sheets-proxy is directly under /api

// Start Server
async function startServer() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();