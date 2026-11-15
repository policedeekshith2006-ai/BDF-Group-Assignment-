/**
 * StudySpot Cafe - Global Error Handling Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // Handle SQLite Unique constraint violations (e.g. duplicate email)
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({
      error: 'Conflict: A record with this unique value (such as email) already exists'
    });
  }

  // Handle SQLite Foreign key constraint violations
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({
      error: 'Foreign key constraint failed: Referenced entity does not exist'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

