const { errorResponse } = require('../utils/responseHelper');

/**
 * Centralized Application Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err);

  // File size limit error from Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'Uploaded file size exceeds the allowed limit (5MB)', 400);
  }

  // Multer unexpected field
  if (err.name === 'MulterError') {
    return errorResponse(res, `File upload error: ${err.message}`, 400);
  }

  // PostgreSQL specific error handling
  if (err.code === '23505') {
    return errorResponse(res, 'A record with this unique identifier already exists', 409);
  }
  if (err.code === '23503') {
    return errorResponse(res, 'Referenced parent record does not exist or has dependent associations', 400);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An unexpected internal server error occurred'
    : err.message || 'Internal server error';

  return errorResponse(res, message, statusCode);
};

module.exports = {
  errorHandler,
};
