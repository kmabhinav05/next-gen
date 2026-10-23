const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Controller: Get Announcements for current user role
 */
const getAnnouncements = async (req, res, next) => {
  try {
    const role = req.user ? req.user.role : 'all';
    let result;

    if (role === 'admin') {
      result = await query(`
        SELECT a.id, a.title, a.content, a.target_role, a.is_pinned, a.created_at,
               d.name AS department_name, u.username AS author
        FROM announcements a
        LEFT JOIN departments d ON d.id = a.department_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.is_active = TRUE
        ORDER BY a.is_pinned DESC, a.created_at DESC
      `);
    } else {
      result = await query(`
        SELECT a.id, a.title, a.content, a.target_role, a.is_pinned, a.created_at,
               d.name AS department_name, u.username AS author
        FROM announcements a
        LEFT JOIN departments d ON d.id = a.department_id
        LEFT JOIN users u ON u.id = a.created_by_user_id
        WHERE a.is_active = TRUE AND (a.target_role = 'all' OR a.target_role = $1::announcement_target_enum)
        ORDER BY a.is_pinned DESC, a.created_at DESC
      `, [role]);
    }

    return successResponse(res, 'Announcements retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Announcement (Admin only)
 */
const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, targetRole, departmentId, isPinned } = req.body;
    if (!title || !content) {
      return errorResponse(res, 'Title and content are required', 400);
    }

    const result = await query(
      `INSERT INTO announcements (title, content, target_role, department_id, created_by_user_id, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, content, targetRole || 'all', departmentId || null, req.user.userId, isPinned || false]
    );

    return successResponse(res, 'Announcement created successfully', result.rows[0], 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
};
