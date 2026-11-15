/**
 * StudySpot Cafe - Server Entry Point
 * Starts HTTP server on configured port and ensures database is seeded.
 */

require('dotenv').config();
const app = require('./app');
const { seedDatabase } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Ensure database tables and initial sample data are ready
seedDatabase();

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`☕ StudySpot Cafe Server is running!`);
  console.log(`🔗 Localhost URL: http://localhost:${PORT}`);
  console.log(`📚 Health check:  http://localhost:${PORT}/api/health`);
  console.log(`📋 Bookings JOIN: http://localhost:${PORT}/api/bookings/details`);
  console.log(`====================================================`);
});

module.exports = server;

