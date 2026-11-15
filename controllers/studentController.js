/**
 * StudySpot Cafe - Student Controller
 * Handles CRUD operations for students.
 */

const { db } = require('../config/database');

/**
 * GET /api/students
 * Retrieve all students
 */
function getAllStudents(req, res, next) {
  try {
    const students = db.prepare('SELECT id, name, email FROM students ORDER BY id ASC').all();
    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/students/:id
 * Retrieve a specific student by ID
 */
function getStudentById(req, res, next) {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT id, name, email FROM students WHERE id = ?').get(Number(id));

    if (!student) {
      return res.status(404).json({ error: `Student with ID ${id} not found` });
    }

    res.status(200).json(student);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/students
 * Add a new student
 */
function createStudent(req, res, next) {
  try {
    const { name, email } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check for duplicate email
    const existing = db.prepare('SELECT id FROM students WHERE LOWER(email) = ?').get(trimmedEmail);
    if (existing) {
      return res.status(409).json({ error: `Student with email '${trimmedEmail}' already exists` });
    }

    const insert = db.prepare('INSERT INTO students (name, email) VALUES (?, ?)');
    const result = insert.run(trimmedName, trimmedEmail);

    const newStudent = db.prepare('SELECT id, name, email FROM students WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Student created successfully',
      student: newStudent
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/students/:id
 * Update student details
 */
function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT id, name, email FROM students WHERE id = ?').get(Number(id));

    if (!student) {
      return res.status(404).json({ error: `Student with ID ${id} not found` });
    }

    const name = req.body.name !== undefined ? req.body.name.trim() : student.name;
    const email = req.body.email !== undefined ? req.body.email.trim().toLowerCase() : student.email;

    // If email is changing, verify no other student has it
    if (email !== student.email) {
      const existing = db.prepare('SELECT id FROM students WHERE LOWER(email) = ? AND id != ?').get(email, Number(id));
      if (existing) {
        return res.status(409).json({ error: `Email '${email}' is already in use by another student` });
      }
    }

    db.prepare('UPDATE students SET name = ?, email = ? WHERE id = ?').run(name, email, Number(id));
    const updatedStudent = db.prepare('SELECT id, name, email FROM students WHERE id = ?').get(Number(id));

    res.status(200).json({
      message: 'Student updated successfully',
      student: updatedStudent
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/students/:id
 * Delete a student
 */
function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;
    const student = db.prepare('SELECT id, name FROM students WHERE id = ?').get(Number(id));

    if (!student) {
      return res.status(404).json({ error: `Student with ID ${id} not found` });
    }

    // Check if student has active bookings
    const activeBooking = db.prepare("SELECT id FROM bookings WHERE student_id = ? AND status = 'Active'").get(Number(id));
    if (activeBooking) {
      return res.status(409).json({
        error: `Cannot delete student '${student.name}' while they have an active carrel booking`
      });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(Number(id));

    res.status(200).json({
      message: `Student '${student.name}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};

