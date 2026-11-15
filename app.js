/**
 * StudySpot Cafe - Express Application
 * Configures middleware, API routes, and error handling.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const studentRoutes = require('./routes/studentRoutes');
const carrelRoutes = require('./routes/carrelRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Welcome / API Documentation root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'StudySpot Cafe – Study Carrel Booking System',
    description: 'Backend REST API for managing students, study carrels, and bookings without double-booking conflicts',
    version: '1.0.0',
    documentation: {
      students: '/api/students',
      carrels: '/api/carrels',
      carrel_search_by_zone: '/api/carrels?zone=A',
      bookings: '/api/bookings',
      bookings_join_details: '/api/bookings/details'
    },
    status: 'online'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Database reset endpoint (for Postman test runner and repeatability)
app.post('/api/reset', (req, res) => {
  const { resetDatabase } = require('./config/database');
  resetDatabase();
  res.status(200).json({
    message: 'Database reset to clean sample state successfully',
    status: 'success'
  });
});

// Mount modular API routes
app.use('/api/students', studentRoutes);
app.use('/api/carrels', carrelRoutes);
app.use('/api/bookings', bookingRoutes);

// Handle 404 Not Found
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;

