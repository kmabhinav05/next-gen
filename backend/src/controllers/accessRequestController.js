const { query } = require('../config/db');
const { sendAccessRequestEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Controller: Submit Request for Access
 * POST /api/request-access
 */
const requestAccess = async (req, res, next) => {
  try {
    const { fullName, email, reason } = req.body;

    // 1. Sanitize string inputs (prevent script injection)
    const sanitizedFullName = (fullName || '').trim().replace(/<[^>]*>?/gm, '');
    const sanitizedEmail = (email || '').trim().toLowerCase();
    const sanitizedReason = (reason || '').trim().replace(/<[^>]*>?/gm, '');

    if (!sanitizedFullName || !sanitizedEmail || !sanitizedReason) {
      return errorResponse(res, 'All fields (Full Name, Email Address, Reason for Access) are required.', 400);
    }

    // 2. Persist request into PostgreSQL for administrative audit trail
    const insertRes = await query(
      `INSERT INTO access_requests (full_name, email, reason, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, full_name, email, status, created_at`,
      [sanitizedFullName, sanitizedEmail, sanitizedReason]
    );

    const savedRequest = insertRes.rows[0];

    // 3. Log action to activity_logs
    await query(
      `INSERT INTO activity_logs (user_id, action_type, ip_address, user_agent, details)
       VALUES (NULL, 'ACCESS_REQUEST_SUBMITTED', $1, $2, $3)`,
      [
        req.ip || '',
        req.headers['user-agent'] || '',
        JSON.stringify({
          requestId: savedRequest.id,
          name: sanitizedFullName,
          email: sanitizedEmail,
        }),
      ]
    );

    // 4. Send email notification to site administrator
    try {
      await sendAccessRequestEmail({
        fullName: sanitizedFullName,
        email: sanitizedEmail,
        reason: sanitizedReason,
      });
    } catch (emailErr) {
      console.warn('[Warning] Email notification dispatch error:', emailErr.message);
      // We do not fail the request if mail server is offline, since the DB record is secured
    }

    return successResponse(
      res,
      'Your request for access has been submitted successfully. The site administrator has been notified and will review your request shortly.',
      {
        requestId: savedRequest.id,
        fullName: savedRequest.full_name,
        email: savedRequest.email,
        createdAt: savedRequest.created_at,
      },
      201
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestAccess,
};
