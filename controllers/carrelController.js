/**
 * StudySpot Cafe - Carrel Controller
 * Handles CRUD operations and Zone search for study carrels.
 */

const { db } = require('../config/database');

/**
 * GET /api/carrels
 * Retrieve all carrels, with optional zone filtering:
 * Example: GET /api/carrels?zone=A
 */
function getAllCarrels(req, res, next) {
  try {
    const { zone } = req.query;

    let query = 'SELECT id, name, zone, status FROM carrels';
    const params = [];

    if (zone) {
      query += ' WHERE LOWER(zone) = LOWER(?)';
      params.push(zone.trim());
    }

    query += ' ORDER BY id ASC';

    const carrels = db.prepare(query).all(...params);
    res.status(200).json(carrels);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/carrels/:id
 * Retrieve a single carrel by ID
 */
function getCarrelById(req, res, next) {
  try {
    const { id } = req.params;
    const carrel = db.prepare('SELECT id, name, zone, status FROM carrels WHERE id = ?').get(Number(id));

    if (!carrel) {
      return res.status(404).json({ error: `Carrel with ID ${id} not found` });
    }

    res.status(200).json(carrel);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/carrels
 * Add a new study carrel
 */
function createCarrel(req, res, next) {
  try {
    const { name, zone, status = 'Available' } = req.body;

    const insert = db.prepare('INSERT INTO carrels (name, zone, status) VALUES (?, ?, ?)');
    const result = insert.run(name.trim(), zone.trim().toUpperCase(), status);

    const newCarrel = db.prepare('SELECT id, name, zone, status FROM carrels WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: 'Study carrel created successfully',
      carrel: newCarrel
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/carrels/:id
 * Update carrel details (name, zone, status)
 */
function updateCarrel(req, res, next) {
  try {
    const { id } = req.params;
    const carrel = db.prepare('SELECT id, name, zone, status FROM carrels WHERE id = ?').get(Number(id));

    if (!carrel) {
      return res.status(404).json({ error: `Carrel with ID ${id} not found` });
    }

    const name = req.body.name !== undefined ? req.body.name.trim() : carrel.name;
    const zone = req.body.zone !== undefined ? req.body.zone.trim().toUpperCase() : carrel.zone;
    const status = req.body.status !== undefined ? req.body.status : carrel.status;

    db.prepare('UPDATE carrels SET name = ?, zone = ?, status = ? WHERE id = ?').run(name, zone, status, Number(id));
    const updatedCarrel = db.prepare('SELECT id, name, zone, status FROM carrels WHERE id = ?').get(Number(id));

    res.status(200).json({
      message: 'Study carrel updated successfully',
      carrel: updatedCarrel
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/carrels/:id
 * Delete a study carrel
 */
function deleteCarrel(req, res, next) {
  try {
    const { id } = req.params;
    const carrel = db.prepare('SELECT id, name, zone, status FROM carrels WHERE id = ?').get(Number(id));

    if (!carrel) {
      return res.status(404).json({ error: `Carrel with ID ${id} not found` });
    }

    // Check if there is an active booking on this carrel
    const activeBooking = db.prepare("SELECT id FROM bookings WHERE carrel_id = ? AND status = 'Active'").get(Number(id));
    if (activeBooking) {
      return res.status(409).json({
        error: `Cannot delete '${carrel.name}' because it currently has an active booking`
      });
    }

    db.prepare('DELETE FROM carrels WHERE id = ?').run(Number(id));

    res.status(200).json({
      message: `Carrel '${carrel.name}' deleted successfully`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllCarrels,
  getCarrelById,
  createCarrel,
  updateCarrel,
  deleteCarrel
};

