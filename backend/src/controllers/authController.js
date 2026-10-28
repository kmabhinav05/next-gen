const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { comparePassword, hashPassword } = require('../utils/passwordHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Controller: User Login
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // 1. Fetch user by username or email (case-insensitive)
    const userRes = await query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active,
              s.id AS student_id, s.register_number, s.first_name AS student_first_name, s.last_name AS student_last_name, s.department_id AS student_dept_id,
              st.id AS staff_id, st.employee_id, st.first_name AS staff_first_name, st.last_name AS staff_last_name, st.designation, st.department_id AS staff_dept_id,
              p.id AS parent_id, p.first_name AS parent_first_name, p.last_name AS parent_last_name
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN staff st ON st.user_id = u.id
       LEFT JOIN parents p ON p.user_id = u.id
       WHERE LOWER(u.username) = LOWER($1) 
          OR LOWER(u.email) = LOWER($1)
          OR LOWER(s.register_number) = LOWER($1)
          OR LOWER(st.employee_id) = LOWER($1)`,
      [username]
    );

    if (userRes.rowCount === 0) {
      // Activity log failed attempt
      await query(
        `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
         VALUES (NULL, 'LOGIN_FAILED', $1, $2, $3)`,
        [ipAddress, userAgent, JSON.stringify({ attempted_username: username, reason: 'User not found' })]
      );
      return errorResponse(res, 'Invalid username or password', 401);
    }

    const user = userRes.rows[0];

    // 2. Check if account is active
    if (!user.is_active) {
      return errorResponse(res, 'This account is deactivated. Please contact the administrator', 403);
    }

    // 3. Verify bcrypt password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      await query(
        `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
         VALUES ($1, 'LOGIN_FAILED', $2, $3, $4)`,
        [user.id, ipAddress, userAgent, JSON.stringify({ reason: 'Incorrect password' })]
      );
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // 4. Update last_login
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // 5. Generate JWT token
    const secret = process.env.JWT_SECRET || 'super_secret_academic_jwt_token_key_change_in_production_2026';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
      staffId: user.staff_id,
      parentId: user.parent_id,
    };

    const token = jwt.sign(tokenPayload, secret, { expiresIn });

    // Determine dashboard redirect URL based on verified role
    let redirectUrl = '/';
    let profileDetails = {};

    switch (user.role) {
      case 'admin':
        redirectUrl = '/admin/index.html';
        profileDetails = { displayName: 'System Administrator' };
        break;
      case 'staff':
        redirectUrl = '/staff/index.html';
        profileDetails = {
          staffId: user.staff_id,
          employeeId: user.employee_id,
          displayName: `${user.staff_first_name} ${user.staff_last_name}`,
          designation: user.designation,
          departmentId: user.staff_dept_id,
        };
        break;
      case 'student':
        redirectUrl = '/student/index.html';
        profileDetails = {
          studentId: user.student_id,
          registerNumber: user.register_number,
          displayName: `${user.student_first_name} ${user.student_last_name}`,
          departmentId: user.student_dept_id,
        };
        break;
      case 'parent':
        redirectUrl = '/parent/index.html';
        profileDetails = {
          parentId: user.parent_id,
          displayName: `${user.parent_first_name} ${user.parent_last_name}`,
        };
        break;
    }

    // 6. Log successful login
    await query(
      `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
       VALUES ($1, 'LOGIN_SUCCESS', $2, $3, $4)`,
      [user.id, ipAddress, userAgent, JSON.stringify({ role: user.role })]
    );

    return successResponse(res, 'Authentication successful', {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        redirectUrl,
        profile: profileDetails,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Authenticated User Profile
 */
const getMe = async (req, res, next) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login,
              s.id AS student_id, s.register_number, s.first_name AS student_first_name, s.last_name AS student_last_name, s.dob, s.gender, s.phone AS student_phone, s.department_id AS student_dept_id,
              st.id AS staff_id, st.employee_id, st.first_name AS staff_first_name, st.last_name AS staff_last_name, st.designation, st.qualification, st.department_id AS staff_dept_id,
              p.id AS parent_id, p.first_name AS parent_first_name, p.last_name AS parent_last_name, p.phone AS parent_phone
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN staff st ON st.user_id = u.id
       LEFT JOIN parents p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const row = userRes.rows[0];
    let details = {};

    if (row.role === 'student') {
      details = {
        studentId: row.student_id,
        registerNumber: row.register_number,
        fullName: `${row.student_first_name} ${row.student_last_name}`,
        departmentId: row.student_dept_id,
        phone: row.student_phone,
      };
    } else if (row.role === 'staff') {
      details = {
        staffId: row.staff_id,
        employeeId: row.employee_id,
        fullName: `${row.staff_first_name} ${row.staff_last_name}`,
        designation: row.designation,
        qualification: row.qualification,
        departmentId: row.staff_dept_id,
      };
    } else if (row.role === 'parent') {
      // Also fetch linked wards/children
      const wardsRes = await query(
        `SELECT s.id, s.register_number, s.first_name, s.last_name, ps.relationship,
                d.name AS department_name, c.batch_name, c.section
         FROM parent_student ps
         JOIN students s ON s.id = ps.student_id
         JOIN departments d ON d.id = s.department_id
         LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.enrollment_status = 'active'
         LEFT JOIN classes c ON c.id = se.class_id
         WHERE ps.parent_id = $1`,
        [row.parent_id]
      );

      details = {
        parentId: row.parent_id,
        fullName: `${row.parent_first_name} ${row.parent_last_name}`,
        phone: row.parent_phone,
        children: wardsRes.rows,
      };
    }

    return successResponse(res, 'User profile retrieved', {
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        role: row.role,
        lastLogin: row.last_login,
        details,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Change Password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const isValid = await comparePassword(currentPassword, userRes.rows[0].password_hash);
    if (!isValid) {
      return errorResponse(res, 'Current password does not match', 400);
    }

    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    // Audit log password change
    await query(
      `INSERT INTO activity_logs (user_id, action_type, details)
       VALUES ($1, 'PASSWORD_CHANGE', $2)`,
      [userId, JSON.stringify({ timestamp: new Date().toISOString() })]
    );

    return successResponse(res, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Logout
 */
const logout = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      await query(
        `INSERT INTO activity_logs (user_id, action_type, details)
         VALUES ($1, 'LOGOUT', $2)`,
        [req.user.userId, JSON.stringify({ timestamp: new Date().toISOString() })]
      );
    }
    return successResponse(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Forgot Password Request
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const cleanId = (email || '').trim().toLowerCase();

    // Check if user exists by email or username
    const userRes = await query(
      `SELECT id, username, email, role, is_active FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [cleanId]
    );

    if (userRes.rowCount === 0) {
      // Don't leak whether user exists for security, return positive confirmation
      return successResponse(res, 'If an active institutional account is associated with this identifier, a password reset request has been logged.', {
        sent: true
      });
    }

    const user = userRes.rows[0];

    // Log the password reset request
    await query(
      `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
       VALUES ($1, 'PASSWORD_RESET_REQUESTED', $2, $3, $4)`,
      [user.id, req.ip || '', req.headers['user-agent'] || '', JSON.stringify({ email: user.email, username: user.username })]
    );

    return successResponse(res, `Password reset request verified for ${user.username}. You may now set your new password.`, {
      verified: true,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Reset Password with Verified Identifier
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const cleanId = (email || '').trim().toLowerCase();

    const userRes = await query(
      `SELECT id, username, email, is_active FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [cleanId]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, 'Institutional account not found.', 404);
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return errorResponse(res, 'This account is deactivated. Contact administrator.', 403);
    }

    const newHash = await hashPassword(newPassword);

    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, user.id]
    );

    await query(
      `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
       VALUES ($1, 'PASSWORD_RESET_COMPLETED', $2, $3, $4)`,
      [user.id, req.ip || '', req.headers['user-agent'] || '', JSON.stringify({ action: 'Password self-reset' })]
    );

    return successResponse(res, 'Your password has been successfully reset. You can now sign in with your new credentials.', {
      reset: true
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
  logout,
  forgotPassword,
  resetPassword,
};
