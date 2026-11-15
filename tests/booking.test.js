/**
 * StudySpot Cafe - Automated Test Suite
 * Includes the 3 Mandatory Double-Booking Test Scenarios,
 * plus comprehensive tests for CRUD, JOINs, Validations, and Zone search.
 */

const request = require('supertest');
const app = require('../app');
const { db, resetDatabase } = require('../config/database');

describe('StudySpot Cafe - Study Carrel Booking System Test Suite', () => {
  beforeEach(() => {
    // Reset database to known sample state before each test suite
    resetDatabase();
  });

  afterAll(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  });

  // =========================================================================
  // MANDATORY THREE TEST CASES (SECTION 8 OF REQUIREMENTS)
  // =========================================================================

  describe('8. Mandatory Double-Booking Prevention Scenarios', () => {
    test('TEST 1 – Successful Booking: Book Carrel 4 to Asha', async () => {
      // Find Asha's student ID
      const asha = db.prepare("SELECT id, name FROM students WHERE name = 'Asha'").get();
      expect(asha).toBeDefined();

      // Find Carrel 4's ID
      const carrel4 = db.prepare("SELECT id, name, status FROM carrels WHERE name = 'Carrel 4'").get();
      expect(carrel4).toBeDefined();
      expect(carrel4.status).toBe('Available');

      // Book Carrel 4 to Asha
      const response = await request(app)
        .post('/api/bookings')
        .send({
          student_id: asha.id,
          carrel_id: carrel4.id
        });

      // Verify HTTP 201 Created
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Booking created successfully');
      expect(response.body.booking).toHaveProperty('student_id', asha.id);
      expect(response.body.booking).toHaveProperty('carrel_id', carrel4.id);
      expect(response.body.booking).toHaveProperty('status', 'Active');

      // Verify Carrel 4 status in database became 'Booked'
      const updatedCarrel = db.prepare('SELECT status FROM carrels WHERE id = ?').get(carrel4.id);
      expect(updatedCarrel.status).toBe('Booked');

      // Verify Asha is the active student for Carrel 4
      const activeBooking = db.prepare(
        "SELECT student_id, status FROM bookings WHERE carrel_id = ? AND status = 'Active'"
      ).get(carrel4.id);
      expect(activeBooking).toBeDefined();
      expect(activeBooking.student_id).toBe(asha.id);
    });

    test('TEST 2 – Prevent Double Booking: Try booking Carrel 4 to Ravi while Asha booking is active', async () => {
      const asha = db.prepare("SELECT id FROM students WHERE name = 'Asha'").get();
      const ravi = db.prepare("SELECT id FROM students WHERE name = 'Ravi'").get();
      const carrel4 = db.prepare("SELECT id FROM carrels WHERE name = 'Carrel 4'").get();

      // Step 1: Asha books Carrel 4
      const ashaBookingRes = await request(app)
        .post('/api/bookings')
        .send({ student_id: asha.id, carrel_id: carrel4.id });
      expect(ashaBookingRes.status).toBe(201);

      // Step 2: Ravi attempts to book the SAME Carrel 4
      const raviBookingRes = await request(app)
        .post('/api/bookings')
        .send({ student_id: ravi.id, carrel_id: carrel4.id });

      // Verify HTTP 409 Conflict
      expect(raviBookingRes.status).toBe(409);
      // Verify exact error message required by twist rule
      expect(raviBookingRes.body).toHaveProperty('error', 'Carrel 4 is already booked');

      // Verify no second active booking exists in database
      const allActiveBookings = db.prepare(
        "SELECT * FROM bookings WHERE carrel_id = ? AND status = 'Active'"
      ).all(carrel4.id);
      expect(allActiveBookings).toHaveLength(1);
      expect(allActiveBookings[0].student_id).toBe(asha.id);
    });

    test('TEST 3 – Return and Rebook: Return Asha booking, then book Carrel 4 to Ravi', async () => {
      const asha = db.prepare("SELECT id FROM students WHERE name = 'Asha'").get();
      const ravi = db.prepare("SELECT id FROM students WHERE name = 'Ravi'").get();
      const carrel4 = db.prepare("SELECT id FROM carrels WHERE name = 'Carrel 4'").get();

      // Step 1: Asha books Carrel 4
      const ashaBookingRes = await request(app)
        .post('/api/bookings')
        .send({ student_id: asha.id, carrel_id: carrel4.id });
      expect(ashaBookingRes.status).toBe(201);
      const bookingId = ashaBookingRes.body.booking.id;

      // Step 2: Asha returns the carrel
      const returnRes = await request(app)
        .put(`/api/bookings/${bookingId}/return`);

      expect(returnRes.status).toBe(200);
      expect(returnRes.body).toHaveProperty('message', 'Carrel returned successfully');
      expect(returnRes.body.booking.status).toBe('Returned');

      // Verify Carrel 4 status reverted to 'Available'
      const carrelAfterReturn = db.prepare('SELECT status FROM carrels WHERE id = ?').get(carrel4.id);
      expect(carrelAfterReturn.status).toBe('Available');

      // Step 3: Ravi now books Carrel 4
      const raviBookingRes = await request(app)
        .post('/api/bookings')
        .send({ student_id: ravi.id, carrel_id: carrel4.id });

      // Verify Ravi's booking succeeds with HTTP 201 Created
      expect(raviBookingRes.status).toBe(201);
      expect(raviBookingRes.body.booking.student_id).toBe(ravi.id);
      expect(raviBookingRes.body.booking.status).toBe('Active');

      // Verify Carrel 4 is now booked by Ravi
      const finalCarrel = db.prepare('SELECT status FROM carrels WHERE id = ?').get(carrel4.id);
      expect(finalCarrel.status).toBe('Booked');
    });
  });

  // =========================================================================
  // SQL JOIN ENDPOINT TESTS (SECTION 5)
  // =========================================================================

  describe('5. SQL JOIN Details Endpoint', () => {
    test('GET /api/bookings/details returns complete joined data across 3 tables', async () => {
      const asha = db.prepare("SELECT id FROM students WHERE name = 'Asha'").get();
      const carrel4 = db.prepare("SELECT id FROM carrels WHERE name = 'Carrel 4'").get();

      // Create a booking
      await request(app)
        .post('/api/bookings')
        .send({ student_id: asha.id, carrel_id: carrel4.id });

      const response = await request(app).get('/api/bookings/details');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const record = response.body[0];
      // Verify all required JOIN fields
      expect(record).toHaveProperty('booking_id');
      expect(record).toHaveProperty('student_id', asha.id);
      expect(record).toHaveProperty('student_name', 'Asha');
      expect(record).toHaveProperty('student_email', 'asha@studyspot.com');
      expect(record).toHaveProperty('carrel_id', carrel4.id);
      expect(record).toHaveProperty('carrel_name', 'Carrel 4');
      expect(record).toHaveProperty('carrel_zone', 'B');
      expect(record).toHaveProperty('booking_date');
      expect(record).toHaveProperty('booking_status', 'Active');
    });
  });

  // =========================================================================
  // CARREL SEARCH & ZONE FILTERING (SECTION 4)
  // =========================================================================

  describe('4. Carrels Search by Zone', () => {
    test('GET /api/carrels?zone=A returns only Zone A carrels', async () => {
      const response = await request(app).get('/api/carrels?zone=A');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      response.body.forEach((carrel) => {
        expect(carrel.zone).toBe('A');
      });
    });

    test('GET /api/carrels returns all carrels when no query is passed', async () => {
      const response = await request(app).get('/api/carrels');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(5);
    });
  });

  // =========================================================================
  // STUDENTS CRUD & VALIDATION
  // =========================================================================

  describe('Students CRUD and Validation', () => {
    test('GET /api/students returns all students', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(4);
    });

    test('GET /api/students/:id returns single student or 404', async () => {
      const res = await request(app).get('/api/students/1');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Asha');

      const notFoundRes = await request(app).get('/api/students/9999');
      expect(notFoundRes.status).toBe(404);
    });

    test('POST /api/students creates student and validates input', async () => {
      // Empty name validation
      const emptyNameRes = await request(app)
        .post('/api/students')
        .send({ name: '', email: 'test@example.com' });
      expect(emptyNameRes.status).toBe(400);

      // Invalid email validation
      const invalidEmailRes = await request(app)
        .post('/api/students')
        .send({ name: 'Sam', email: 'not-an-email' });
      expect(invalidEmailRes.status).toBe(400);

      // Duplicate email conflict (409)
      const dupRes = await request(app)
        .post('/api/students')
        .send({ name: 'Asha Clone', email: 'asha@studyspot.com' });
      expect(dupRes.status).toBe(409);

      // Valid student creation
      const validRes = await request(app)
        .post('/api/students')
        .send({ name: 'Priya', email: 'priya@studyspot.com' });
      expect(validRes.status).toBe(201);
      expect(validRes.body.student.name).toBe('Priya');
    });

    test('PUT /api/students/:id updates student', async () => {
      const res = await request(app)
        .put('/api/students/1')
        .send({ name: 'Asha Sharma' });
      expect(res.status).toBe(200);
      expect(res.body.student.name).toBe('Asha Sharma');
    });

    test('DELETE /api/students/:id deletes student', async () => {
      const res = await request(app).delete('/api/students/4');
      expect(res.status).toBe(200);

      const check = await request(app).get('/api/students/4');
      expect(check.status).toBe(404);
    });
  });

  // =========================================================================
  // CARRELS CRUD & VALIDATION
  // =========================================================================

  describe('Carrels CRUD and Validation', () => {
    test('POST /api/carrels validates and creates carrel', async () => {
      const invalidRes = await request(app)
        .post('/api/carrels')
        .send({ name: '', zone: '' });
      expect(invalidRes.status).toBe(400);

      const validRes = await request(app)
        .post('/api/carrels')
        .send({ name: 'Carrel 6', zone: 'C', status: 'Available' });
      expect(validRes.status).toBe(201);
      expect(validRes.body.carrel.name).toBe('Carrel 6');
    });

    test('PUT /api/carrels/:id updates carrel details', async () => {
      const res = await request(app)
        .put('/api/carrels/1')
        .send({ name: 'Carrel 1 Premium', zone: 'A' });
      expect(res.status).toBe(200);
      expect(res.body.carrel.name).toBe('Carrel 1 Premium');
    });

    test('DELETE /api/carrels/:id deletes carrel', async () => {
      const res = await request(app).delete('/api/carrels/5');
      expect(res.status).toBe(200);

      const check = await request(app).get('/api/carrels/5');
      expect(check.status).toBe(404);
    });
  });
});

