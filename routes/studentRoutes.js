/**
 * StudySpot Cafe - Student Routes
 * Endpoints for Student CRUD operations
 */

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { validateStudent } = require('../middleware/validation');

// GET /api/students - Get all students
router.get('/', studentController.getAllStudents);

// GET /api/students/:id - Get student by ID
router.get('/:id', studentController.getStudentById);

// POST /api/students - Add a new student
router.post('/', validateStudent, studentController.createStudent);

// PUT /api/students/:id - Update student details
router.put('/:id', validateStudent, studentController.updateStudent);

// DELETE /api/students/:id - Delete a student
router.delete('/:id', studentController.deleteStudent);

module.exports = router;

