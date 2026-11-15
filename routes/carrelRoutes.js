/**
 * StudySpot Cafe - Carrel Routes
 * Endpoints for Carrel CRUD operations and Zone search
 */

const express = require('express');
const router = express.Router();
const carrelController = require('../controllers/carrelController');
const { validateCarrel } = require('../middleware/validation');

// GET /api/carrels - Get all carrels (supports search by zone: ?zone=A)
router.get('/', carrelController.getAllCarrels);

// GET /api/carrels/:id - Get a carrel by ID
router.get('/:id', carrelController.getCarrelById);

// POST /api/carrels - Add a new study carrel
router.post('/', validateCarrel, carrelController.createCarrel);

// PUT /api/carrels/:id - Update carrel name, zone, or status
router.put('/:id', validateCarrel, carrelController.updateCarrel);

// DELETE /api/carrels/:id - Delete a carrel
router.delete('/:id', carrelController.deleteCarrel);

module.exports = router;

