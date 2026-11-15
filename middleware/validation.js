/**
 * StudySpot Cafe - Validation Middleware
 * Validates request payload for students, carrels, and bookings.
 */

const { db } = require('../config/database');

// Simple, effective email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate Student creation and update
 */
function validateStudent(req, res, next) {
  const { name, email } = req.body;
  const isPut = req.method === 'PUT';

  if (!isPut || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Student name is required and cannot be empty' });
    }
  }

  if (!isPut || email !== undefined) {
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
  }

  next();
}

/**
 * Validate Carrel creation and update
 */
function validateCarrel(req, res, next) {
  const { name, zone, status } = req.body;
  const isPut = req.method === 'PUT';

  if (!isPut || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Carrel name is required and cannot be empty' });
    }
  }

  if (!isPut || zone !== undefined) {
    if (!zone || typeof zone !== 'string' || zone.trim() === '') {
      return res.status(400).json({ error: 'Zone is required and cannot be empty' });
    }
  }

  if (status !== undefined) {
    const allowedStatuses = ['Available', 'Booked'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of the allowed values: ${allowedStatuses.join(', ')}`
      });
    }
  }

  next();
}

/**
 * Validate Booking creation
 */
function validateBooking(req, res, next) {
  const { student_id, carrel_id } = req.body;

  if (student_id === undefined || student_id === null || isNaN(Number(student_id))) {
    return res.status(400).json({ error: 'Valid student_id is required' });
  }

  if (carrel_id === undefined || carrel_id === null || isNaN(Number(carrel_id))) {
    return res.status(400).json({ error: 'Valid carrel_id is required' });
  }

  // Verify student exists in database
  const student = db.prepare('SELECT id, name FROM students WHERE id = ?').get(Number(student_id));
  if (!student) {
    return res.status(404).json({ error: `Student with ID ${student_id} not found` });
  }

  // Verify carrel exists in database
  const carrel = db.prepare('SELECT id, name, status FROM carrels WHERE id = ?').get(Number(carrel_id));
  if (!carrel) {
    return res.status(404).json({ error: `Carrel with ID ${carrel_id} not found` });
  }

  // Attach verified entities to request for controller efficiency
  req.student = student;
  req.carrel = carrel;

  next();
}

/**
 * Validate Booking update
 */
function validateBookingUpdate(req, res, next) {
  const { status, booking_date } = req.body;

  if (status !== undefined) {
    const allowedStatuses = ['Active', 'Returned'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Booking status must be one of: ${allowedStatuses.join(', ')}`
      });
    }
  }

  if (booking_date !== undefined) {
    const parsedDate = new Date(booking_date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid booking_date format' });
    }
  }

  next();
}

module.exports = {
  validateStudent,
  validateCarrel,
  validateBooking,
  validateBookingUpdate
};

