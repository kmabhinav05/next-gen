const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware: Enforce Role-Based Access Control (RBAC)
 * @param  {...string} allowedRoles - E.g. 'admin', 'staff', 'student', 'parent'
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 'Access denied. Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Forbidden. Access restricted to authorized role(s): [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRoles,
};
