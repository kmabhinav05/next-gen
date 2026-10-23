const nodemailer = require('nodemailer');

/**
 * Creates and configures the email transporter.
 * Uses environment SMTP variables if provided, otherwise creates an ethereal/test transporter or logs to console.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fallback to JSON/Console stream for reliable local development & production safety
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

/**
 * Sends an email notification to site administrator when a new access request is submitted.
 *
 * @param {Object} accessRequest
 * @param {string} accessRequest.fullName
 * @param {string} accessRequest.email
 * @param {string} accessRequest.reason
 */
async function sendAccessRequestEmail({ fullName, email, reason }) {
  const transporter = createTransporter();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'admin@nextgen.edu';

  const mailOptions = {
    from: `"Next Gen Grading System" <${process.env.SMTP_FROM || 'no-reply@nextgen.edu'}>`,
    to: adminEmail,
    subject: `[Access Request] New Account Request from ${fullName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 30px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Next Gen Grading • Academic Department Assistance</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">New User Access Request Notification</p>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-top: 0;">
            A new user has submitted a request to gain access to the Academic Department Assistance System:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600; width: 140px;">Applicant Name:</td>
              <td style="padding: 12px 0; color: #0f172a; font-weight: 700;">${fullName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b; font-weight: 600;">Email Address:</td>
              <td style="padding: 12px 0;">
                <a href="mailto:${email}" style="color: #0d9488; text-decoration: none; font-weight: 600;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #64748b; font-weight: 600; vertical-align: top;">Reason / Project:</td>
              <td style="padding: 12px 0; color: #334155; line-height: 1.6; background: #f8fafc; border-radius: 8px; padding: 12px;">
                ${reason.replace(/\n/g, '<br>')}
              </td>
            </tr>
          </table>

          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">
              You can review, configure roles, and create accounts via the Administrator Portal:
            </p>
            <a href="http://localhost:5000/admin/users.html" style="background: #0d9488; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 13px; display: inline-block;">
              Open User Directory
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 16px 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9;">
          Academic Department Assistance System &bull; Automated Institutional Notification
        </div>
      </div>
    `,
    text: `New User Access Request\n\nName: ${fullName}\nEmail: ${email}\nReason / Project: ${reason}\n\nReview at: http://localhost:5000/admin/users.html`,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email Service] Access request notification forwarded to ${adminEmail}. MessageID: ${info.messageId || 'json-stream'}`);
  return info;
}

module.exports = {
  sendAccessRequestEmail,
};
