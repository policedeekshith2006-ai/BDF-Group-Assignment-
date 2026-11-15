/**
 * StudySpot Cafe - Booking Controller
 * Manages bookings, JOIN operations, and implements the Twist Rule (Double-Booking Prevention).
 */

const { db } = require('../config/database');

/**
 * Transaction: Create Booking with strict double-booking prevention
 */
const executeCreateBooking = db.transaction((studentId, carrelId, bookingDate) => {
  // Query carrel directly inside transaction
  const carrel = db.prepare('SELECT id, name, status FROM carrels WHERE id = ?').get(carrelId);
  if (!carrel) {
    const err = new Error(`Carrel with ID ${carrelId} not found`);
    err.statusCode = 404;
    throw err;
  }

  // Check if carrel already has an active booking
  const activeBooking = db.prepare(
    "SELECT id, student_id FROM bookings WHERE carrel_id = ? AND status = 'Active'"
  ).get(carrelId);

  if (activeBooking || carrel.status === 'Booked') {
    // Exact requirement message: "Carrel 4 is already booked"
    const carrelDisplayName = carrel.name.toLowerCase().startsWith('carrel')
      ? carrel.name
      : `Carrel ${carrel.name}`;

    const err = new Error(`${carrelDisplayName} is already booked`);
    err.statusCode = 409;
    throw err;
  }

  // Insert active booking
  const insert = db.prepare(
    'INSERT INTO bookings (student_id, carrel_id, booking_date, status) VALUES (?, ?, ?, ?)'
  );
  const result = insert.run(studentId, carrelId, bookingDate, 'Active');

  // Update carrel status to 'Booked'
  db.prepare("UPDATE carrels SET status = 'Booked' WHERE id = ?").run(carrelId);

  return result.lastInsertRowid;
});

/**
 * Transaction: Return a booked carrel
 */
const executeReturnBooking = db.transaction((bookingId) => {
  const booking = db.prepare('SELECT id, student_id, carrel_id, status FROM bookings WHERE id = ?').get(bookingId);
  if (!booking) {
    const err = new Error(`Booking with ID ${bookingId} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (booking.status === 'Returned') {
    const err = new Error('Booking is already returned');
    err.statusCode = 400;
    throw err;
  }

  // Update booking status to 'Returned'
  db.prepare("UPDATE bookings SET status = 'Returned' WHERE id = ?").run(bookingId);

  // Update carrel status to 'Available'
  db.prepare("UPDATE carrels SET status = 'Available' WHERE id = ?").run(booking.carrel_id);

  return db.prepare('SELECT id, student_id, carrel_id, booking_date, status FROM bookings WHERE id = ?').get(bookingId);
});

/**
 * GET /api/bookings
 * Retrieve all bookings
 */
function getAllBookings(req, res, next) {
  try {
    const bookings = db.prepare('SELECT id, student_id, carrel_id, booking_date, status FROM bookings ORDER BY id DESC').all();
    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/details
 * Retrieve bookings with comprehensive SQL JOIN across students, carrels, and bookings
 */
function getBookingDetails(req, res, next) {
  try {
    const query = `
      SELECT 
        b.id AS booking_id,
        b.student_id,
        s.name AS student_name,
        s.email AS student_email,
        b.carrel_id,
        c.name AS carrel_name,
        c.zone AS carrel_zone,
        b.booking_date,
        b.status AS booking_status
      FROM bookings b
      JOIN students s ON b.student_id = s.id
      JOIN carrels c ON b.carrel_id = c.id
      ORDER BY b.id DESC;
    `;
    const details = db.prepare(query).all();
    res.status(200).json(details);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by ID
 */
function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const booking = db.prepare('SELECT id, student_id, carrel_id, booking_date, status FROM bookings WHERE id = ?').get(Number(id));

    if (!booking) {
      return res.status(404).json({ error: `Booking with ID ${id} not found` });
    }

    res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bookings
 * Create a new study carrel booking
 * Implements TWIST RULE: No double booking with transactions and HTTP 409
 */
function createBooking(req, res, next) {
  try {
    const { student_id, carrel_id, booking_date } = req.body;
    const effectiveDate = booking_date ? new Date(booking_date).toISOString() : new Date().toISOString();

    const newBookingId = executeCreateBooking(Number(student_id), Number(carrel_id), effectiveDate);

    // Fetch the created booking with joined student and carrel names for convenience
    const createdBooking = db.prepare(`
      SELECT 
        b.id,
        b.student_id,
        s.name AS student_name,
        b.carrel_id,
        c.name AS carrel_name,
        c.zone AS carrel_zone,
        b.booking_date,
        b.status
      FROM bookings b
      JOIN students s ON b.student_id = s.id
      JOIN carrels c ON b.carrel_id = c.id
      WHERE b.id = ?
    `).get(newBookingId);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: createdBooking
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * PUT /api/bookings/:id/return
 * Return a booked study carrel
 * Updates booking to 'Returned' and carrel to 'Available'
 */
function returnBooking(req, res, next) {
  try {
    const { id } = req.params;
    const updatedBooking = executeReturnBooking(Number(id));

    res.status(200).json({
      message: 'Carrel returned successfully',
      booking: updatedBooking
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * PUT /api/bookings/:id
 * Update booking status or date
 */
function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = db.prepare('SELECT id, student_id, carrel_id, booking_date, status FROM bookings WHERE id = ?').get(Number(id));

    if (!booking) {
      return res.status(404).json({ error: `Booking with ID ${id} not found` });
    }

    const status = req.body.status !== undefined ? req.body.status : booking.status;
    const booking_date = req.body.booking_date !== undefined
      ? new Date(req.body.booking_date).toISOString()
      : booking.booking_date;

    // If status changed to Returned, ensure carrel becomes Available
    if (booking.status === 'Active' && status === 'Returned') {
      db.prepare("UPDATE carrels SET status = 'Available' WHERE id = ?").run(booking.carrel_id);
    } else if (booking.status === 'Returned' && status === 'Active') {
      // Check if carrel is currently free
      const carrel = db.prepare('SELECT status, name FROM carrels WHERE id = ?').get(booking.carrel_id);
      if (carrel.status === 'Booked') {
        return res.status(409).json({ error: `${carrel.name} is already booked by another active session` });
      }
      db.prepare("UPDATE carrels SET status = 'Booked' WHERE id = ?").run(booking.carrel_id);
    }

    db.prepare('UPDATE bookings SET status = ?, booking_date = ? WHERE id = ?').run(status, booking_date, Number(id));
    const updated = db.prepare('SELECT id, student_id, carrel_id, booking_date, status FROM bookings WHERE id = ?').get(Number(id));

    res.status(200).json({
      message: 'Booking updated successfully',
      booking: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/bookings/:id
 * Delete a booking record
 */
function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = db.prepare('SELECT id, carrel_id, status FROM bookings WHERE id = ?').get(Number(id));

    if (!booking) {
      return res.status(404).json({ error: `Booking with ID ${id} not found` });
    }

    // If the deleted booking was Active, check if carrel should become Available
    if (booking.status === 'Active') {
      db.prepare("UPDATE carrels SET status = 'Available' WHERE id = ?").run(booking.carrel_id);
    }

    db.prepare('DELETE FROM bookings WHERE id = ?').run(Number(id));

    res.status(200).json({
      message: `Booking #${id} deleted successfully`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllBookings,
  getBookingDetails,
  getBookingById,
  createBooking,
  returnBooking,
  updateBooking,
  deleteBooking
};

