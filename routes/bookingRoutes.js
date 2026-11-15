/**
 * StudySpot Cafe - Booking Routes
 * Endpoints for Bookings, 3-table SQL JOIN, and Return operations
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { validateBooking, validateBookingUpdate } = require('../middleware/validation');

// GET /api/bookings - Get all bookings
router.get('/', bookingController.getAllBookings);

// GET /api/bookings/details - IMPORTANT JOIN endpoint (3 related tables)
// Must be defined before /:id to avoid route collision
router.get('/details', bookingController.getBookingDetails);

// GET /api/bookings/:id - Get a booking by ID
router.get('/:id', bookingController.getBookingById);

// POST /api/bookings - Create a booking (enforces No Double-Booking Twist Rule)
router.post('/', validateBooking, bookingController.createBooking);

// PUT /api/bookings/:id/return - Return a booked carrel
router.put('/:id/return', bookingController.returnBooking);

// PUT /api/bookings/:id - Update a booking
router.put('/:id', validateBookingUpdate, bookingController.updateBooking);

// DELETE /api/bookings/:id - Delete a booking
router.delete('/:id', bookingController.deleteBooking);

module.exports = router;

