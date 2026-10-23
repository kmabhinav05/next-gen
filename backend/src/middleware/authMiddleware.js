const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware: Authenticate JWT Token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      } else {
        return errorResponse(res, 'Invalid authorization header format. Expected Bearer <token>', 401);
      }
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return errorResponse(res, 'Authentication token required', 401);
    }
    const secret = process.env.JWT_SECRET || 'super_secret_academic_jwt_token_key_change_in_production_2026';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token has expired. Please log in again', 401);
      }
      return errorResponse(res, 'Invalid or corrupted token', 401);
    }

    // Verify user exists and is active in database
    const userRes = await query(
      `SELECT u.id, u.username, u.email, u.role, u.is_active,
              s.id AS student_id, st.id AS staff_id, p.id AS parent_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN staff st ON st.user_id = u.id
       LEFT JOIN parents p ON p.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, 'User account no longer exists', 401);
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return errorResponse(res, 'User account has been deactivated. Contact the administrator', 403);
    }

    // Attach verified user information to request
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      studentId: user.student_id || null,
      staffId: user.staff_id || null,
      parentId: user.parent_id || null,
    };

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]:', err);
    return errorResponse(res, 'Internal authentication error', 500);
  }
};

module.exports = {
  authenticateToken,
};
