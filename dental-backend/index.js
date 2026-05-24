require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');
const db         = require('./db');
const SlotManager = require('./slot-manager');
const { startScheduler } = require('./scheduler');

const app    = express();
const SECRET = process.env.JWT_SECRET;

// ─── RATE LIMITERS ────────────────────────────────────────────────────────────
// Shared window: 15 minutes

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in a moment.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please try again in 15 minutes.' },
});

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please try again later.' },
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 bookings per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many booking attempts. Please try again in 1 hour.' },
  skip: (req) => {
    // TESTING: Skip rate limiting for all requests during development
    return true;
  }
});

// ─── EMAIL TRANSPORTER ────────────────────────────────────────────────────────
// Auto-creates a free Ethereal test account if no real SMTP is configured.
// Ethereal emails are NOT delivered — they appear in a web inbox you can view.
// To use real Gmail: set EMAIL_USER and EMAIL_PASS in .env

let transporter;
let etherealUser = '';
let etherealPass = '';
let etherealReady = false;

async function getTransporter() {
  // If real credentials are set, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS &&
      !process.env.EMAIL_USER.includes('your-gmail')) {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
        port:   parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,  // 10 second connection timeout
        greetingTimeout:   10000,
        socketTimeout:     15000,
      });
    }
    return transporter;
  }

  // Otherwise auto-create a free Ethereal test account
  if (!etherealReady) {
    const testAccount = await nodemailer.createTestAccount();
    etherealUser = testAccount.user;
    etherealPass = testAccount.pass;
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: etherealUser, pass: etherealPass },
      connectionTimeout: 10000,
      greetingTimeout:   10000,
      socketTimeout:     15000,
    });
    etherealReady = true;
    console.log('\n[Email] ✓ Ethereal test account ready.');
    console.log(`[Email]   User: ${etherealUser}`);
    console.log('[Email]   View sent emails at: https://ethereal.email/messages\n');
  }
  return transporter;
}

async function sendVerificationEmail(toEmail, firstName, token) {
  const baseUrl   = process.env.FRONTEND_URL || 'http://localhost:4200';
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Code Smiles Account</title>
</head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">

        <!-- Header stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>

        <!-- Logo / Brand -->
        <tr><td align="center" style="padding:32px 32px 0;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(180deg,#1b67a9,#0e2742);display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;font-weight:900;line-height:1;">&#129463;</span>
            </div>
            <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">Code Smiles</span>
          </div>
        </td></tr>

        <!-- Title -->
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#0e2742;letter-spacing:-0.02em;">Verify Your Email</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${firstName}</strong>, welcome to Code Smiles Dental Portal!<br/>
            Please verify your email address to activate your account.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>

        <!-- CTA Button -->
        <tr><td align="center" style="padding:8px 32px 24px;">
          <a href="${verifyUrl}"
             style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0e2742 0%,#1b67a9 52%,#46b3ff 100%);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:999px;letter-spacing:0.02em;box-shadow:0 12px 28px rgba(27,103,170,0.32);">
            ✓ &nbsp; Verify My Email
          </a>
        </td></tr>

        <!-- Expiry notice -->
        <tr><td align="center" style="padding:0 32px 8px;">
          <div style="background:#f0f7ff;border:1px solid rgba(27,103,170,0.14);border-radius:12px;padding:14px 20px;">
            <p style="margin:0;font-size:13px;color:#5a7a9a;line-height:1.6;">
              ⏱ &nbsp;This link expires in <strong style="color:#0e2742;">24 hours</strong>.<br/>
              If you did not create this account, you can safely ignore this email.
            </p>
          </div>
        </td></tr>

        <!-- Fallback link -->
        <tr><td align="center" style="padding:16px 32px 8px;">
          <p style="margin:0;font-size:12px;color:#8aa1b8;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${verifyUrl}" style="color:#1b67a9;word-break:break-all;">${verifyUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;line-height:1.7;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus, Misamis Oriental<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>

        <!-- Bottom stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || etherealUser || 'noreply@codesmiles.com'}>`,
    to:      toEmail,
    subject: 'Verify Your Code Smiles Account',
    html,
    // Improve deliverability — plain text version reduces spam score
    text: `Hi ${firstName},\n\nWelcome to Code Smiles Dental Portal!\n\nPlease verify your email address by clicking the link below:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.\n\nCode Smiles Dental Clinic`,
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Code Smiles Dental Portal',
    },
  };

  // Always log the verify URL to the console — useful if email goes to spam
  console.log(`\n[Email] Sending verification email to: ${toEmail}`);
  console.log(`[Email] 🔗 Verify URL (use this if email goes to spam): ${verifyUrl}\n`);

  const t = await getTransporter();
  const info = await t.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] ✓ Sent via Ethereal — 👉 View at: ${previewUrl}`);
  } else {
    console.log(`[Email] ✓ Verification email delivered to ${toEmail}`);
    console.log(`[Email]   Message ID: ${info.messageId}`);
  }
}

// ─── APPOINTMENT CONFIRMATION EMAIL ────────────────────────────────────────────
async function sendAppointmentConfirmationEmail(toEmail, patientName, appointmentDetails) {
  const { treatment, appointment_date, appointment_time, dentist_name, duration_minutes, status } = appointmentDetails;
  
  // Format date for display
  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Calculate end time
  const [hours, minutes] = appointment_time.split(':').map(Number);
  const endMinutes = (hours * 60 + minutes) + duration_minutes;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

  // Determine title and message based on status
  const isApproved = status === 'Approved';
  const emailTitle = isApproved ? '✓ Appointment Confirmed' : '📋 Appointment Under Review';
  const emailSubject = isApproved 
    ? `Appointment Confirmed - ${treatment} on ${formattedDate}`
    : `Appointment Pending Review - ${treatment} on ${formattedDate}`;
  const statusMessage = isApproved
    ? 'Your appointment has been confirmed by our staff!'
    : 'Your appointment request has been received and is under review. We will send you a confirmation email once approved.';
  const statusColor = isApproved ? '#10b981' : '#f59e0b'; // green for approved, amber for pending

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailTitle} - Code Smiles</title>
</head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">

        <!-- Header stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>

        <!-- Logo / Brand -->
        <tr><td align="center" style="padding:32px 32px 0;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(180deg,#1b67a9,#0e2742);display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;font-weight:900;line-height:1;">&#129463;</span>
            </div>
            <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">Code Smiles</span>
          </div>
        </td></tr>

        <!-- Title -->
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#0e2742;letter-spacing:-0.02em;">${emailTitle}</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${patientName}</strong>, ${statusMessage}
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>

        <!-- Status Badge -->
        <tr><td align="center" style="padding:16px 32px;">
          <div style="display:inline-block;background:${statusColor};color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            ${isApproved ? 'CONFIRMED' : 'PENDING APPROVAL'}
          </div>
        </td></tr>

        <!-- Appointment Details -->
        <tr><td style="padding:24px 32px;">
          <div style="background:#f0f7ff;border-left:4px solid #1b67a9;border-radius:8px;padding:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#5a7a9a;font-weight:600;">SERVICE</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${treatment}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#5a7a9a;font-weight:600;">DATE</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#5a7a9a;font-weight:600;">TIME</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${appointment_time} - ${endTime}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#5a7a9a;font-weight:600;">DENTIST</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${dentist_name || 'To be assigned'}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Important Info -->
        <tr><td style="padding:0 32px;">
          <div style="background:#fff3cd;border:1px solid rgba(255,193,7,0.3);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#856404;line-height:1.6;">
              <strong>📌 Please arrive 10 minutes early</strong> to complete any necessary paperwork and allow time for check-in.
            </p>
          </div>
        </td></tr>

        <!-- Status-specific message -->
        ${!isApproved ? `
        <tr><td style="padding:0 32px;">
          <div style="background:#e0f2fe;border:1px solid rgba(3,102,214,0.3);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#0369a1;line-height:1.6;">
              <strong>⏳ What's next?</strong><br/>
              Our staff will review your appointment request and send you a confirmation email within 24 hours. You can also check your appointment status in your patient portal.
            </p>
          </div>
        </td></tr>
        ` : ''}

        <!-- Cancellation Info -->
        <tr><td style="padding:0 32px;">
          <div style="background:#f8f9fa;border:1px solid rgba(20,70,120,0.08);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#5a7a9a;line-height:1.6;">
              <strong style="color:#0e2742;">Need to reschedule or cancel?</strong><br/>
              Contact us at least 24 hours before your appointment. Call or visit our clinic for assistance.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;line-height:1.7;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus, Misamis Oriental<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>

        <!-- Bottom stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || etherealUser || 'noreply@codesmiles.com'}>`,
    to:      toEmail,
    subject: emailSubject,
    html,
    text: `Hi ${patientName},\n\n${statusMessage}\n\nService: ${treatment}\nDate: ${formattedDate}\nTime: ${appointment_time} - ${endTime}\nDentist: ${dentist_name || 'To be assigned'}\nStatus: ${isApproved ? 'CONFIRMED' : 'PENDING APPROVAL'}\n\nPlease arrive 10 minutes early.\n\nIf you need to reschedule or cancel, contact us at least 24 hours before your appointment.\n\nCode Smiles Dental Clinic`,
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Code Smiles Dental Portal',
    },
  };

  console.log(`\n[Email] Sending appointment ${isApproved ? 'confirmation' : 'notification'} to: ${toEmail}`);
  
  const t = await getTransporter();
  const info = await t.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] ✓ Sent via Ethereal — 👉 View at: ${previewUrl}`);
  } else {
    console.log(`[Email] ✓ Email delivered to ${toEmail}`);
    console.log(`[Email]   Message ID: ${info.messageId}`);
  }
}

// ─── APPOINTMENT CANCELLATION EMAIL ────────────────────────────────────────────
async function sendAppointmentCancellationEmail(toEmail, patientName, appointmentDetails, cancelledBy) {
  const { treatment, appointment_date, appointment_time, reason } = appointmentDetails;
  
  // Format date for display
  const dateObj = new Date(appointment_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Cancelled - Code Smiles</title>
</head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">

        <!-- Header stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>

        <!-- Logo / Brand -->
        <tr><td align="center" style="padding:32px 32px 0;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(180deg,#1b67a9,#0e2742);display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;font-weight:900;line-height:1;">&#129463;</span>
            </div>
            <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">Code Smiles</span>
          </div>
        </td></tr>

        <!-- Title -->
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#0e2742;letter-spacing:-0.02em;">⚠️ Appointment Cancelled</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${patientName}</strong>, your appointment has been cancelled.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>

        <!-- Status Badge -->
        <tr><td align="center" style="padding:16px 32px;">
          <div style="display:inline-block;background:#ef4444;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            CANCELLED
          </div>
        </td></tr>

        <!-- Cancelled Appointment Details -->
        <tr><td style="padding:24px 32px;">
          <div style="background:#fee2e2;border-left:4px solid #ef4444;border-radius:8px;padding:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#7f1d1d;font-weight:600;">SERVICE</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${treatment}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#7f1d1d;font-weight:600;">DATE</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#7f1d1d;font-weight:600;">TIME</td>
                <td align="right" style="padding:8px 0;font-size:15px;color:#0e2742;font-weight:700;">${appointment_time}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Cancellation Reason -->
        ${reason ? `
        <tr><td style="padding:0 32px;">
          <div style="background:#f8f9fa;border:1px solid rgba(20,70,120,0.08);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#5a7a9a;line-height:1.6;">
              <strong style="color:#0e2742;">Reason for Cancellation:</strong><br/>
              ${reason}
            </p>
          </div>
        </td></tr>
        ` : ''}

        <!-- Next Steps -->
        <tr><td style="padding:0 32px;">
          <div style="background:#e0f2fe;border:1px solid rgba(3,102,214,0.3);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#0369a1;line-height:1.6;">
              <strong>📅 Need to reschedule?</strong><br/>
              You can book a new appointment through your patient portal or contact us directly for assistance.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;line-height:1.7;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus, Misamis Oriental<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>

        <!-- Bottom stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || etherealUser || 'noreply@codesmiles.com'}>`,
    to:      toEmail,
    subject: `Appointment Cancelled - ${treatment} on ${formattedDate}`,
    html,
    text: `Hi ${patientName},\n\nYour appointment has been cancelled.\n\nService: ${treatment}\nDate: ${formattedDate}\nTime: ${appointment_time}\n${reason ? `\nReason: ${reason}` : ''}\n\nIf you need to reschedule, you can book a new appointment through your patient portal or contact us directly.\n\nCode Smiles Dental Clinic`,
    headers: {
      'X-Priority': '2',
      'X-Mailer': 'Code Smiles Dental Portal',
    },
  };

  console.log(`\n[Email] Sending cancellation email to: ${toEmail}`);
  
  const t = await getTransporter();
  const info = await t.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] ✓ Sent via Ethereal — 👉 View at: ${previewUrl}`);
  } else {
    console.log(`[Email] ✓ Cancellation email delivered to ${toEmail}`);
    console.log(`[Email]   Message ID: ${info.messageId}`);
  }
}

// ─── APPOINTMENT RESCHEDULE EMAIL ────────────────────────────────────────────────
async function sendAppointmentRescheduleEmail(toEmail, patientName, appointmentDetails) {
  const { treatment, old_date, old_time, new_date, new_time, reason } = appointmentDetails;
  
  // Format dates for display
  const oldDateObj = new Date(old_date);
  const newDateObj = new Date(new_date);
  const formattedOldDate = oldDateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedNewDate = newDateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Rescheduled - Code Smiles</title>
</head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">

        <!-- Header stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>

        <!-- Logo / Brand -->
        <tr><td align="center" style="padding:32px 32px 0;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(180deg,#1b67a9,#0e2742);display:flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:18px;font-weight:900;line-height:1;">&#129463;</span>
            </div>
            <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">Code Smiles</span>
          </div>
        </td></tr>

        <!-- Title -->
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#0e2742;letter-spacing:-0.02em;">📅 Appointment Rescheduled</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${patientName}</strong>, your appointment has been rescheduled.
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>

        <!-- Status Badge -->
        <tr><td align="center" style="padding:16px 32px;">
          <div style="display:inline-block;background:#f59e0b;color:#fff;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            RESCHEDULED
          </div>
        </td></tr>

        <!-- Old Appointment -->
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 12px;font-size:13px;color:#5a7a9a;font-weight:600;">PREVIOUS APPOINTMENT</p>
          <div style="background:#f3f4f6;border-left:4px solid #9ca3af;border-radius:8px;padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#6b7280;">Date:</td>
                <td align="right" style="padding:4px 0;font-size:13px;color:#0e2742;font-weight:600;">${formattedOldDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#6b7280;">Time:</td>
                <td align="right" style="padding:4px 0;font-size:13px;color:#0e2742;font-weight:600;">${old_time}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Arrow -->
        <tr><td align="center" style="padding:8px 32px;">
          <div style="font-size:20px;color:#1b67a9;">↓</div>
        </td></tr>

        <!-- New Appointment -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 12px;font-size:13px;color:#5a7a9a;font-weight:600;">NEW APPOINTMENT</p>
          <div style="background:#dbeafe;border-left:4px solid #0284c7;border-radius:8px;padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#0369a1;font-weight:600;">Service:</td>
                <td align="right" style="padding:4px 0;font-size:13px;color:#0e2742;font-weight:700;">${treatment}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#0369a1;font-weight:600;">Date:</td>
                <td align="right" style="padding:4px 0;font-size:13px;color:#0e2742;font-weight:700;">${formattedNewDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#0369a1;font-weight:600;">Time:</td>
                <td align="right" style="padding:4px 0;font-size:13px;color:#0e2742;font-weight:700;">${new_time}</td>
              </tr>
            </table>
          </div>
        </td></tr>

        <!-- Reschedule Reason -->
        ${reason ? `
        <tr><td style="padding:0 32px;">
          <div style="background:#f8f9fa;border:1px solid rgba(20,70,120,0.08);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#5a7a9a;line-height:1.6;">
              <strong style="color:#0e2742;">Reason:</strong><br/>
              ${reason}
            </p>
          </div>
        </td></tr>
        ` : ''}

        <!-- Reminder -->
        <tr><td style="padding:0 32px;">
          <div style="background:#fff3cd;border:1px solid rgba(255,193,7,0.3);border-radius:12px;padding:14px 20px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#856404;line-height:1.6;">
              <strong>📌 Please arrive 10 minutes early</strong> to complete any necessary paperwork and allow time for check-in.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;line-height:1.7;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus, Misamis Oriental<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>

        <!-- Bottom stripe -->
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || etherealUser || 'noreply@codesmiles.com'}>`,
    to:      toEmail,
    subject: `Appointment Rescheduled - ${treatment}`,
    html,
    text: `Hi ${patientName},\n\nYour appointment has been rescheduled.\n\nPrevious: ${formattedOldDate} at ${old_time}\nNew: ${formattedNewDate} at ${new_time}\nService: ${treatment}\n${reason ? `\nReason: ${reason}` : ''}\n\nPlease arrive 10 minutes early.\n\nCode Smiles Dental Clinic`,
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Code Smiles Dental Portal',
    },
  };

  console.log(`\n[Email] Sending reschedule email to: ${toEmail}`);
  
  const t = await getTransporter();
  const info = await t.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] ✓ Sent via Ethereal — 👉 View at: ${previewUrl}`);
  } else {
    console.log(`[Email] ✓ Reschedule email delivered to ${toEmail}`);
    console.log(`[Email]   Message ID: ${info.messageId}`);
  }
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  'vscode-webview://', // Allow VS Code integrated browser
  ...(process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'http://localhost:4200'
    ? [process.env.FRONTEND_URL]
    : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and listed origins
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(express.json());

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'No token provided.' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// ─── AVATAR / PROFILE PHOTO ──────────────────────────────────────────────────

// Ensure avatar_url column exists on users table
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`)
  .catch(err => console.error('Avatar column error:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS patient_vault_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    record_type VARCHAR(60) NOT NULL,
    category VARCHAR(60) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size VARCHAR(80) NOT NULL DEFAULT 'Pending review',
    preview_kind VARCHAR(30) NOT NULL DEFAULT 'document',
    source VARCHAR(30) NOT NULL DEFAULT 'Patient',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('Patient vault table error:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS vault_file_sharing (
    id SERIAL PRIMARY KEY,
    vault_record_id INTEGER NOT NULL REFERENCES patient_vault_records(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_dentist_name VARCHAR(255) NOT NULL,
    shared_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    permission_level VARCHAR(30) NOT NULL DEFAULT 'view',
    shared_at TIMESTAMP NOT NULL DEFAULT NOW(),
    access_revoked_at TIMESTAMP,
    UNIQUE(vault_record_id, shared_with_dentist_name)
  )
`).catch(err => console.error('Vault file sharing table error:', err.message));

app.get('/patient-vault-records/:patientId', authMiddleware, async (req, res) => {
  const isOwner = String(req.user.id) === String(req.params.patientId);
  const isPrivileged = ['Staff', 'Dentist'].includes(req.user.role);
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const result = await db.query(
      `SELECT
         id, patient_id, title, description, record_type, category,
         file_name, file_size, preview_kind, source,
         TO_CHAR(created_at, 'Mon DD, YYYY') AS display_date,
         EXTRACT(EPOCH FROM created_at) AS added_rank
       FROM patient_vault_records
       WHERE patient_id = $1
       ORDER BY created_at DESC, id DESC`,
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Patient vault fetch error:', err.message);
    res.status(500).json({ message: 'Failed to load vault records.' });
  }
});

app.post('/patient-vault-records', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Patient') {
    return res.status(403).json({ message: 'Only patients can upload vault records.' });
  }

  const { title, description, record_type, category, file_name, file_size, preview_kind } = req.body;
  if (!title?.trim() || !record_type || !category || !file_name?.trim()) {
    return res.status(400).json({ message: 'Title, type, category, and file name are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO patient_vault_records
         (patient_id, title, description, record_type, category, file_name, file_size, preview_kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING
         id, patient_id, title, description, record_type, category,
         file_name, file_size, preview_kind, source,
         TO_CHAR(created_at, 'Mon DD, YYYY') AS display_date,
         EXTRACT(EPOCH FROM created_at) AS added_rank`,
      [
        req.user.id,
        title.trim(),
        description?.trim() || 'Patient-uploaded document',
        record_type,
        category,
        file_name.trim(),
        file_size || 'Pending review',
        preview_kind || 'document',
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Patient vault upload error:', err.message);
    res.status(500).json({ message: 'Failed to save vault record.' });
  }
});

// SHARE a vault file with a dentist
app.post('/patient-vault-records/:recordId/share', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Patient') {
    return res.status(403).json({ message: 'Only patients can share vault records.' });
  }

  const { recordId } = req.params;
  const { dentist_name } = req.body;

  if (!dentist_name?.trim()) {
    return res.status(400).json({ message: 'Dentist name is required.' });
  }

  try {
    // Verify the record belongs to this patient
    const recordCheck = await db.query(
      'SELECT id FROM patient_vault_records WHERE id = $1 AND patient_id = $2',
      [recordId, req.user.id]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found or access denied.' });
    }

    // Find the dentist user - handle both "Dr. Name" and "Name" formats
    let dentistName = dentist_name.trim();
    if (dentistName.startsWith('Dr. ')) {
      dentistName = dentistName.substring(4); // Remove "Dr. " prefix
    }
    
    const dentistCheck = await db.query(
      'SELECT id FROM users WHERE first_name || \' \' || last_name = $1 AND role = $2',
      [dentistName, 'Admin']
    );

    const dentistUserId = dentistCheck.rows.length > 0 ? dentistCheck.rows[0].id : null;

    // Insert or update sharing record
    const result = await db.query(
      `INSERT INTO vault_file_sharing 
         (vault_record_id, patient_id, shared_with_dentist_name, shared_with_user_id, permission_level, shared_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (vault_record_id, shared_with_dentist_name) 
       DO UPDATE SET access_revoked_at = NULL, shared_at = NOW()
       RETURNING id, vault_record_id, shared_with_dentist_name, shared_at`,
      [recordId, req.user.id, dentist_name.trim(), dentistUserId, 'view']
    );

    res.status(201).json({
      message: `File shared with ${dentist_name}`,
      sharing: result.rows[0]
    });
  } catch (err) {
    console.error('File sharing error:', err.message);
    res.status(500).json({ message: 'Failed to share file.' });
  }
});

// GET vault records shared with a specific dentist
app.get('/dentist/vault-records', async (req, res) => {
  console.log('\n=== GET /dentist/vault-records ===');
  console.log('Headers:', req.headers);
  
  try {
    // For now, get dentist ID from query param for testing
    const dentistId = req.query.dentistId || req.user?.id;
    
    if (!dentistId) {
      console.log('ERROR: No dentist ID provided');
      return res.status(400).json({ message: 'Dentist ID required.' });
    }

    console.log('Dentist ID:', dentistId);

    // Get the dentist's full name from the database
    const dentistUser = await db.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [dentistId]
    );

    console.log('Dentist user query result:', dentistUser.rows);

    if (dentistUser.rows.length === 0) {
      console.log('ERROR: Dentist user not found in database');
      return res.status(404).json({ message: 'User not found.' });
    }

    const { first_name, last_name } = dentistUser.rows[0];
    const dentistFullName = `${first_name} ${last_name}`;
    const dentistFullNameWithDr = `Dr. ${first_name} ${last_name}`;
    
    console.log('Dentist full name:', dentistFullName);
    console.log('Dentist full name with Dr:', dentistFullNameWithDr);
    
    const result = await db.query(
      `SELECT DISTINCT
         pvr.id, pvr.patient_id, pvr.title, pvr.description, pvr.record_type, 
         pvr.category, pvr.file_name, pvr.file_size, pvr.preview_kind, pvr.source,
         TO_CHAR(pvr.created_at, 'Mon DD, YYYY') AS display_date,
         EXTRACT(EPOCH FROM pvr.created_at) AS added_rank,
         u.first_name, u.last_name, u.email,
         vfs.shared_at, vfs.permission_level
       FROM patient_vault_records pvr
       JOIN vault_file_sharing vfs ON vfs.vault_record_id = pvr.id
       JOIN users u ON u.id = pvr.patient_id
       WHERE (vfs.shared_with_dentist_name = $1 OR vfs.shared_with_dentist_name = $2)
         AND vfs.access_revoked_at IS NULL
       ORDER BY vfs.shared_at DESC`,
      [dentistFullName, dentistFullNameWithDr]
    );

    console.log('Query returned', result.rows.length, 'files');
    console.log('Sending response...');
    res.json(result.rows);
  } catch (err) {
    console.error('ERROR in /dentist/vault-records:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Failed to load shared vault records.' });
  }
});

// REVOKE access to a shared file
app.post('/patient-vault-records/:recordId/revoke-share', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Patient') {
    return res.status(403).json({ message: 'Only patients can revoke sharing.' });
  }

  const { recordId } = req.params;
  const { dentist_name } = req.body;

  if (!dentist_name?.trim()) {
    return res.status(400).json({ message: 'Dentist name is required.' });
  }

  try {
    // Verify the record belongs to this patient
    const recordCheck = await db.query(
      'SELECT id FROM patient_vault_records WHERE id = $1 AND patient_id = $2',
      [recordId, req.user.id]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found or access denied.' });
    }

    // Revoke access
    const result = await db.query(
      `UPDATE vault_file_sharing 
       SET access_revoked_at = NOW()
       WHERE vault_record_id = $1 AND shared_with_dentist_name = $2
       RETURNING id`,
      [recordId, dentist_name.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sharing record not found.' });
    }

    res.json({ message: `Access revoked for ${dentist_name}` });
  } catch (err) {
    console.error('Revoke sharing error:', err.message);
    res.status(500).json({ message: 'Failed to revoke access.' });
  }
});

// GET user profile (name, email, phone, avatar)
// Auth: user can only view their own profile; Staff/Admin can view any
app.get('/user/profile/:userId', authMiddleware, async (req, res) => {
  const isOwner = String(req.user.id) === String(req.params.userId);
  const isPrivileged = ['Staff', 'Dentist'].includes(req.user.role);
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, status, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.params.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update avatar (base64 image string)
// Auth: user can only update their own avatar
app.put('/user/avatar/:userId', authMiddleware, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { avatar_url } = req.body;
  if (!avatar_url) return res.status(400).json({ message: 'No image provided.' });
  // Limit size to ~2MB (base64 ~2.7MB raw)
  if (avatar_url.length > 2800000) return res.status(400).json({ message: 'Image too large. Max 2MB.' });
  try {
    await db.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [avatar_url, req.params.userId]);
    res.json({ message: 'Avatar updated!', avatar_url });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update user profile (name, phone)
// Auth: user can only update their own profile
app.put('/user/profile/:userId', authMiddleware, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { first_name, last_name, phone } = req.body;
  try {
    await db.query(
      `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone) WHERE id = $4`,
      [first_name || null, last_name || null, phone || null, req.params.userId]
    );
    const updated = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, avatar_url FROM users WHERE id = $1`,
      [req.params.userId]
    );
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT change password — verifies current password before updating
app.put('/user/change-password/:userId', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(new_password)) {
    return res.status(400).json({ message: 'Password must include uppercase, lowercase, and a number.' });
  }
  try {
    const result = await db.query('SELECT password FROM users WHERE id = $1', [req.params.userId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found.' });

    const match = await bcrypt.compare(current_password, result.rows[0].password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.params.userId]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── FORGOT / RESET PASSWORD ──────────────────────────────────────────────────

// Ensure reset token columns exist on startup
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128)`).catch(() => {});
db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP`).catch(() => {});

// POST /auth/forgot-password — generate reset token and send email
app.post('/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const result = await db.query(
      `SELECT id, first_name, role FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (result.rowCount === 0) {
      return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
    }

    const user = result.rows[0];

    // Cooldown: block if a token was issued less than 60 seconds ago
    const cooldownCheck = await db.query(
      `SELECT reset_token_expires_at FROM users WHERE id = $1`,
      [user.id]
    );
    if (cooldownCheck.rows[0]?.reset_token_expires_at) {
      const issuedAt = new Date(cooldownCheck.rows[0].reset_token_expires_at).getTime() - 60 * 60 * 1000;
      const secondsSince = (Date.now() - issuedAt) / 1000;
      if (secondsSince < 60) {
        const wait = Math.ceil(60 - secondsSince);
        return res.status(429).json({
          message: `Please wait ${wait} seconds before requesting another reset email.`,
          wait,
        });
      }
    }

    const token   = crypto.randomBytes(48).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3`,
      [token, expires, user.id]
    );

    // Send reset email
    const baseUrl  = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>
        <tr><td align="center" style="padding:32px 32px 0;">
          <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">&#129463; Code Smiles</span>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0e2742;">Reset Your Password</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${user.first_name}</strong>,<br/>
            We received a request to reset your Code Smiles password.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:8px 32px 24px;">
          <a href="${resetUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0e2742 0%,#1b67a9 52%,#46b3ff 100%);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:999px;box-shadow:0 12px 28px rgba(27,103,170,0.32);">
            🔑 &nbsp; Reset My Password
          </a>
        </td></tr>
        <tr><td align="center" style="padding:0 32px 8px;">
          <div style="background:#f0f7ff;border:1px solid rgba(27,103,170,0.14);border-radius:12px;padding:14px 20px;">
            <p style="margin:0;font-size:13px;color:#5a7a9a;line-height:1.6;">
              ⏱ &nbsp;This link expires in <strong style="color:#0e2742;">1 hour</strong>.<br/>
              If you did not request a password reset, you can safely ignore this email.
            </p>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:16px 32px 8px;">
          <p style="margin:0;font-size:12px;color:#8aa1b8;">
            If the button doesn't work, copy and paste this link:<br/>
            <a href="${resetUrl}" style="color:#1b67a9;word-break:break-all;">${resetUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;line-height:1.7;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus, Misamis Oriental<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const mailOptions = {
      from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || 'noreply@codesmiles.com'}>`,
      to:      email.trim(),
      subject: 'Reset Your Code Smiles Password',
      html,
    };

    // Respond immediately — email is sent asynchronously after response
    res.json({ message: 'If that email is registered, a password reset link has been sent.' });

    // Send reset email after response is already sent
    setImmediate(() => {
      if (process.env.EMAIL_PREVIEW === 'true') {
        console.log('\n[Email] Password Reset Preview ─────────────────────');
        console.log(`To:        ${email}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log('─────────────────────────────────────────────────────\n');
      } else {
        getTransporter().then(t => t.sendMail(mailOptions)).then(info => {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          if (previewUrl) {
            console.log(`[Email] ✓ Password reset email sent (Ethereal)`);
            console.log(`[Email]   👉 View email: ${previewUrl}`);
            console.log(`[Email]   🔗 Reset URL: ${resetUrl}\n`);
          } else {
            console.log(`[Email] ✓ Password reset email sent to ${email}`);
          }
        }).catch(err => {
          console.error('[Email] Failed to send reset email:', err.message);
        });
      }
    });

  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /auth/reset-password — validate token and set new password
app.post('/auth/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(new_password)) {
    return res.status(400).json({ message: 'Password must include uppercase, lowercase, and a number.' });
  }

  try {
    const result = await db.query(
      `SELECT id, reset_token_expires_at FROM users WHERE reset_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset link.', code: 'invalid' });
    }

    const user = result.rows[0];

    if (new Date() > new Date(user.reset_token_expires_at)) {
      return res.status(400).json({ message: 'This reset link has expired. Please request a new one.', code: 'expired' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query(
      `UPDATE users
       SET password = $1,
           reset_token = NULL,
           reset_token_expires_at = NULL,
           is_verified = TRUE,
           verification_token = NULL,
           verification_token_expires_at = NULL
       WHERE id = $2`,
      [hashed, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// GET /auth/validate-reset-token?token=xxx — check if token is valid before showing form
app.get('/auth/validate-reset-token', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, code: 'missing' });

  try {
    const result = await db.query(
      `SELECT id, reset_token_expires_at FROM users WHERE reset_token = $1`,
      [token]
    );
    if (result.rowCount === 0) return res.json({ valid: false, code: 'invalid' });
    if (new Date() > new Date(result.rows[0].reset_token_expires_at)) {
      return res.json({ valid: false, code: 'expired' });
    }
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ valid: false, code: 'error' });
  }
});

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

// Staff dashboard stats
app.get('/staff/dashboard-stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [total, pending, approved, cancelled, todayAppts, patients, recentAppts] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM appointments`),
      db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Pending'`),
      db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Approved'`),
      db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Cancelled'`),
      db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1`, [today]),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'Patient'`),
      db.query(`
        SELECT id, patient_name, treatment, services,
               TO_CHAR(appointment_date,'YYYY-MM-DD') AS appointment_date,
               TO_CHAR(appointment_time,'HH24:MI') AS appointment_time,
               status, dentist_name
        FROM appointments
        ORDER BY created_at DESC LIMIT 5`),
    ]);
    res.json({
      total:      parseInt(total.rows[0].count),
      pending:    parseInt(pending.rows[0].count),
      approved:   parseInt(approved.rows[0].count),
      cancelled:  parseInt(cancelled.rows[0].count),
      today:      parseInt(todayAppts.rows[0].count),
      patients:   parseInt(patients.rows[0].count),
      recentAppointments: recentAppts.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dentist dashboard stats
app.get('/dentist/dashboard-stats', async (req, res) => {
  try {
    const { dentist } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let todayAppts, upcoming, completed, patients, recentAppts;

    if (dentist) {
      [todayAppts, upcoming, completed, patients, recentAppts] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'Approved' AND dentist_name = $2`, [today, dentist]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date > $1 AND status = 'Approved' AND dentist_name = $2`, [today, dentist]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Completed' AND dentist_name = $1`, [dentist]),
        db.query(`SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE patient_id IS NOT NULL AND dentist_name = $1`, [dentist]),
        db.query(`
          SELECT id, patient_name, treatment, services,
                 TO_CHAR(appointment_date,'YYYY-MM-DD') AS appointment_date,
                 TO_CHAR(appointment_time,'HH24:MI') AS appointment_time,
                 status, phone
          FROM appointments
          WHERE status IN ('Approved','Completed') AND dentist_name = $1
          ORDER BY appointment_date ASC, appointment_time ASC LIMIT 5`, [dentist]),
      ]);
    } else {
      [todayAppts, upcoming, completed, patients, recentAppts] = await Promise.all([
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'Approved'`, [today]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date > $1 AND status = 'Approved'`, [today]),
        db.query(`SELECT COUNT(*) FROM appointments WHERE status = 'Completed'`),
        db.query(`SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE patient_id IS NOT NULL`),
        db.query(`
          SELECT id, patient_name, treatment, services,
                 TO_CHAR(appointment_date,'YYYY-MM-DD') AS appointment_date,
                 TO_CHAR(appointment_time,'HH24:MI') AS appointment_time,
                 status, phone
          FROM appointments
          WHERE status IN ('Approved','Completed')
          ORDER BY appointment_date ASC, appointment_time ASC LIMIT 5`),
      ]);
    }

    res.json({
      today:     parseInt(todayAppts.rows[0].count),
      upcoming:  parseInt(upcoming.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      patients:  parseInt(patients.rows[0].count),
      recentAppointments: recentAppts.rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Patient dashboard stats
app.get('/patient/dashboard-stats/:patientId', async (req, res) => {
  try {
    const id = req.params.patientId;
    const today = new Date().toISOString().split('T')[0];
    const [pending, upcoming, completed, nextAppt] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM appointments WHERE patient_id=$1 AND status='Pending'`, [id]),
      db.query(`SELECT COUNT(*) FROM appointments WHERE patient_id=$1 AND status='Approved' AND appointment_date >= $2`, [id, today]),
      db.query(`SELECT COUNT(*) FROM appointments WHERE patient_id=$1 AND status='Completed'`, [id]),
      db.query(`
        SELECT id, treatment, services,
               TO_CHAR(appointment_date,'YYYY-MM-DD') AS appointment_date,
               TO_CHAR(appointment_time,'HH24:MI') AS appointment_time,
               status, dentist_name
        FROM appointments
        WHERE patient_id=$1 AND status IN ('Approved','Pending') AND appointment_date >= $2
        ORDER BY appointment_date ASC, appointment_time ASC LIMIT 1`, [id, today]),
    ]);
    res.json({
      pending:   parseInt(pending.rows[0].count),
      upcoming:  parseInt(upcoming.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      nextAppointment: nextAppt.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GOOGLE AUTH ─────────────────────────────────────────────────────────────
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /auth/google — verify Google ID token, create or find user, return JWT
// ACID: Atomicity — user creation + patient_profile creation in one transaction
app.post('/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'Google credential is required.' });
  }

  try {
    // 1. Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: 'Invalid Google token.' });
    }

    const { email, given_name, family_name, name, picture } = payload;
    const normalizedEmail = email?.trim().toLowerCase();
    const firstName = given_name || (name ? name.split(' ')[0] : 'Patient');
    const lastName  = family_name || (name ? name.split(' ').slice(1).join(' ') : '');

    // 2. Check if user already exists
    const existing = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);

    if (existing.rowCount > 0) {
      // Existing user — log them in directly
      const user = existing.rows[0];

      // Only allow Patient role via Google login
      if (user.role !== 'Patient') {
        return res.status(403).json({
          message: 'Staff and dentist accounts cannot use Google Sign-In. Please use email and password.'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        id:         user.id,
        email:      user.email,
        role:       user.role,
        first_name: user.first_name,
        last_name:  user.last_name,
        avatar_url: picture || user.avatar_url || null,
      });
    }

    // 3. New user — create account + patient profile in one transaction
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Use a cryptographically random placeholder password (Google users never use it)
      const placeholderPassword = crypto.randomBytes(32).toString('hex');

      const result = await client.query(
        `INSERT INTO users (first_name, last_name, email, phone, password, role, avatar_url, is_verified)
         VALUES ($1, $2, $3, NULL, $4, 'Patient', $5, TRUE)
         RETURNING id`,
        [firstName, lastName, normalizedEmail, placeholderPassword, picture || null]
      );
      const newUserId = result.rows[0].id;

      // Create empty patient profile
      await client.query(
        'INSERT INTO patient_profiles (user_id) VALUES ($1)',
        [newUserId]
      );

      await client.query('COMMIT');

      const token = jwt.sign(
        { id: newUserId, email: normalizedEmail, role: 'Patient' },
        SECRET,
        { expiresIn: '8h' }
      );

      return res.status(201).json({
        token,
        id:         newUserId,
        email: normalizedEmail,
        role:       'Patient',
        first_name: firstName,
        last_name:  lastName,
        avatar_url: picture || null,
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('Google auth transaction rolled back:', txErr.message);
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// NOTE: Auth column migrations run synchronously in startServer() below
// before the server begins accepting connections.

// POST /auth/register  — patients only
// ACID: Atomicity — user row + patient_profile row created together or both rolled back
app.post('/auth/register', registerLimiter, async (req, res) => {
  const { first_name, last_name, email, phone, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Validate password complexity on the backend (frontend validation can be bypassed)
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return res.status(400).json({ message: 'Password must include uppercase, lowercase, and a number.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query('SELECT 1 FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Generate secure verification token (expires in 24 hours)
    const token   = crypto.randomBytes(48).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const hashed = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users
         (first_name, last_name, email, phone, password, role,
          is_verified, verification_token, verification_token_expires_at)
       VALUES ($1, $2, $3, $4, $5, 'Patient', FALSE, $6, $7)
       RETURNING id`,
      [first_name, last_name, normalizedEmail, phone, hashed, token, expires]
    );

    const userId = result.rows[0].id;

    await client.query(
      'INSERT INTO patient_profiles (user_id) VALUES ($1)',
      [userId]
    );

    // INSERT INTO PATIENTS TABLE - CRITICAL FOR NEW PATIENT REGISTRATIONS
    await client.query(
      `INSERT INTO patients (user_id, first_name, last_name, email, contact_number, status)
       VALUES ($1, $2, $3, $4, $5, 'Active')`,
      [userId, first_name, last_name, normalizedEmail, phone]
    );

    await client.query('COMMIT');

    // Respond immediately — email is sent asynchronously after response
    res.status(201).json({ message: 'Account created! Please check your email to verify your account.' });

    // Send verification email after response is already sent
    setImmediate(() => {
      sendVerificationEmail(normalizedEmail, first_name, token).catch(err => {
        console.error('[Email] Failed to send verification email:', err.message);
      });
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register transaction rolled back:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /verify-email?token=xxx — verify email token
app.get('/verify-email', verifyEmailLimiter, async (req, res) => {
  const base  = process.env.FRONTEND_URL || 'http://localhost:4200';
  const { token } = req.query;
  if (!token) {
    return res.redirect(`${base}/verify-email-result?status=invalid`);
  }

  try {
    const result = await db.query(
      `SELECT id, email, first_name, is_verified, verification_token_expires_at
       FROM users WHERE verification_token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.redirect(`${base}/verify-email-result?status=invalid`);
    }

    const user = result.rows[0];
    const emailParam = `&email=${encodeURIComponent(user.email)}`;

    if (user.is_verified) {
      return res.redirect(`${base}/verify-email-result?status=already`);
    }

    if (new Date() > new Date(user.verification_token_expires_at)) {
      return res.redirect(`${base}/verify-email-result?status=expired${emailParam}`);
    }

    await db.query(
      `UPDATE users
       SET is_verified = TRUE, verification_token = NULL, verification_token_expires_at = NULL
       WHERE id = $1`,
      [user.id]
    );

    return res.redirect(`${base}/verify-email-result?status=success`);
  } catch (err) {
    console.error('Email verification error:', err.message);
    return res.redirect(`${base}/verify-email-result?status=error`);
  }
});

// POST /auth/resend-verification — resend verification email with 60s cooldown
app.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await db.query(
      `SELECT id, first_name, is_verified, verification_token_expires_at FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      // Don't reveal whether email exists
      return res.json({ message: 'If that email is registered, a new verification link has been sent.' });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ message: 'This account is already verified. Please sign in.' });
    }

    // Cooldown: if token was issued less than 60 seconds ago, block resend
    if (user.verification_token_expires_at) {
      const issuedAt = new Date(user.verification_token_expires_at).getTime() - 24 * 60 * 60 * 1000;
      const secondsSinceIssue = (Date.now() - issuedAt) / 1000;
      if (secondsSinceIssue < 60) {
        const wait = Math.ceil(60 - secondsSinceIssue);
        return res.status(429).json({ message: `Please wait ${wait} seconds before requesting another email.`, wait });
      }
    }

    // Generate new token
    const newToken   = crypto.randomBytes(48).toString('hex');
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE users SET verification_token = $1, verification_token_expires_at = $2 WHERE id = $3`,
      [newToken, newExpires, user.id]
    );

    // Respond immediately — email sent asynchronously after response
    res.json({ message: 'Verification email sent! Please check your inbox.' });

    setImmediate(() => {
      sendVerificationEmail(normalizedEmail, user.first_name, newToken).catch(err => {
        console.error('[Email] Resend failed:', err.message);
      });
    });
  } catch (err) {
    console.error('Resend verification error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /auth/login
app.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required.' });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    if (user.role !== role) {
      return res.status(401).json({ message: `This account is not registered as ${role}.` });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Block unverified patients (Staff/Admin accounts skip verification)
    if (user.role === 'Patient' && user.is_verified === false) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        unverified: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      id:         user.id,
      email:      user.email,
      role:       user.role,
      first_name: user.first_name,
      last_name:  user.last_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// ─── PATIENT ROUTES ───────────────────────────────────────────────────────────

// Auth: Staff and Admin only
// Returns all patients enriched with profile data (gender, DOB) and
// appointment summary (last completed visit + next upcoming appointment)
app.get('/staff/patients-enriched', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        pp.gender,
        pp.date_of_birth,
        pp.home_address,
        pp.reliability_score,
        -- Last completed visit date
        (
          SELECT TO_CHAR(MAX(a.appointment_date), 'YYYY-MM-DD')
          FROM appointments a
          WHERE a.patient_id = u.id
            AND a.status = 'Completed'
        ) AS last_visit,
        -- Next upcoming approved appointment
        (
          SELECT TO_CHAR(MIN(a.appointment_date), 'YYYY-MM-DD')
          FROM appointments a
          WHERE a.patient_id = u.id
            AND a.status = 'Approved'
            AND a.appointment_date >= CURRENT_DATE
        ) AS next_appointment,
        -- Total appointment counts for context
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = u.id) AS total_appointments
      FROM users u
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'Patient'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auth: Staff and Dentist only
app.get('/list-patients', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, status, created_at
       FROM users WHERE role = 'Patient' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auth: Staff and Dentist only
app.post('/add-patient', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { first_name, last_name, phone } = req.body;
  try {
    // Generate a secure random password for the new patient
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const placeholderEmail = `patient_${Date.now()}@codesmiles.local`;
    
    await db.query(
      `INSERT INTO users (first_name, last_name, phone, email, password, role)
       VALUES ($1, $2, $3, $4, $5, 'Patient')`,
      [first_name, last_name, phone, placeholderEmail, hashedPassword]
    );
    res.json({ 
      message: 'Patient added successfully!',
      tempPassword: tempPassword,
      email: placeholderEmail,
      note: 'Patient must use forgot-password to set their own password on first login'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auth: Staff and Dentist only
app.delete('/delete-patient/:id', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [req.params.id, 'Patient']);
    res.send('Patient deleted successfully!');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update patient basic info (name, phone, gender, address)
app.put('/update-patient/:id', authMiddleware, async (req, res) => {
  const { first_name, last_name, phone, gender, home_address } = req.body;
  if (!first_name || !last_name) {
    return res.status(400).json({ message: 'First and last name are required.' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update core user fields
    await client.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = COALESCE($3, phone)
       WHERE id = $4 AND role = 'Patient'`,
      [first_name.trim(), last_name.trim(), phone?.trim() || null, req.params.id]
    );

    // Upsert profile fields (gender, address) into patient_profiles
    if (gender !== undefined || home_address !== undefined) {
      await client.query(
        `INSERT INTO patient_profiles (user_id, gender, home_address)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE
           SET gender       = COALESCE(EXCLUDED.gender,       patient_profiles.gender),
               home_address = COALESCE(EXCLUDED.home_address, patient_profiles.home_address)`,
        [req.params.id, gender || null, home_address?.trim() || null]
      );
    }

    await client.query('COMMIT');

    const updated = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
              pp.gender, pp.home_address
       FROM users u
       LEFT JOIN patient_profiles pp ON pp.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (updated.rowCount === 0) return res.status(404).json({ message: 'Patient not found.' });
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// ─── APPOINTMENT ROUTES ───────────────────────────────────────────────────────

app.get('/check-availability/:date', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT TO_CHAR(appointment_time, 'HH24:MI') AS appointment_time
       FROM appointments WHERE appointment_date = $1`,
      [req.params.date]
    );
    res.json(result.rows.map((r) => r.appointment_time));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/list-appointments', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         a.id AS appointment_id,
         a.patient_name,
         a.email,
         a.phone,
         TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
         TO_CHAR(a.appointment_time, 'HH24:MI')    AS appointment_time,
         a.treatment,
         a.status,
         a.notes,
         a.duration_minutes,
         a.created_at
       FROM appointments a
       ORDER BY a.appointment_date ASC, a.appointment_time ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Patient submits a booking
// ACID: Atomicity — appointment insert + staff notifications committed together or rolled back
app.post('/add-appointment', bookingLimiter, async (req, res) => {
  console.log('=== BOOKING REQUEST RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { full_name, phone, email, treatment, appointment_date, appointment_time,
          services, duration_minutes, notes, patient_id, booking_type } = req.body;

  // ── INPUT VALIDATION ───────────────────────────────────────────────────────
  // Validate required fields
  if (!full_name || !full_name.trim()) {
    console.log('ERROR: Missing patient name');
    return res.status(400).json({ message: 'Patient name is required.' });
  }

  if (!phone || !phone.trim()) {
    console.log('ERROR: Missing phone');
    return res.status(400).json({ message: 'Phone number is required.' });
  }

  if (!email || !email.trim()) {
    console.log('ERROR: Missing email');
    return res.status(400).json({ message: 'Email is required.' });
  }

  if (!treatment || !treatment.trim()) {
    console.log('ERROR: Missing treatment');
    return res.status(400).json({ message: 'Treatment/service is required.' });
  }

  if (!appointment_date || !appointment_date.trim()) {
    console.log('ERROR: Missing appointment date');
    return res.status(400).json({ message: 'Appointment date is required.' });
  }

  if (!appointment_time || !appointment_time.trim()) {
    console.log('ERROR: Missing appointment time');
    return res.status(400).json({ message: 'Appointment time is required.' });
  }

  // Validate format of date (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment_date.trim())) {
    console.log('ERROR: Invalid date format');
    return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format.' });
  }

  // Validate format of time (HH:MM)
  if (!/^\d{2}:\d{2}$/.test(appointment_time.trim())) {
    console.log('ERROR: Invalid time format');
    return res.status(400).json({ message: 'Time must be in HH:MM format.' });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    console.log('ERROR: Invalid email format');
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // Validate phone format (basic check for digits)
  if (!/^\d{10,}$/.test(phone.trim().replace(/\D/g, ''))) {
    console.log('ERROR: Invalid phone format');
    return res.status(400).json({ message: 'Phone number must contain at least 10 digits.' });
  }

  // Validate date is not in the past
  const bookingDate = new Date(appointment_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    console.log('ERROR: Appointment date is in the past');
    return res.status(400).json({ message: 'Appointment date cannot be in the past.' });
  }

  // Validate time is within operating hours
  const [hours, minutes] = appointment_time.split(':').map(Number);
  const appointmentDateObj = new Date(appointment_date);
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = daysOfWeek[appointmentDateObj.getDay()]; // Get day name from 0-6 (Sun-Sat)
  const { CLINIC_CONFIG } = require('./scheduling-engine');
  const operatingHours = CLINIC_CONFIG.operating_hours[dayOfWeek];
  
  if (!operatingHours) {
    console.log('ERROR: Clinic closed on this day');
    return res.status(400).json({ message: 'The clinic is closed on this day.' });
  }
  
  const appointmentTimeInMinutes = hours * 60 + minutes;
  const closingTimeInMinutes = operatingHours.end;
  const closingHour = Math.floor(closingTimeInMinutes / 60);
  const closingMinute = closingTimeInMinutes % 60;
  const closingTimeStr = `${String(closingHour % 12 || 12).padStart(2, '0')}:${String(closingMinute).padStart(2, '0')} ${closingHour >= 12 ? 'PM' : 'AM'}`;
  
  if (appointmentTimeInMinutes < operatingHours.start || appointmentTimeInMinutes >= closingTimeInMinutes) {
    console.log('ERROR: Appointment time outside operating hours');
    return res.status(400).json({ message: `Appointments must be between 8:00 AM and ${closingTimeStr}.` });
  }

  // Validate not during lunch break (12:00 PM - 1:00 PM)
  if (hours === 12) {
    console.log('ERROR: Appointment during lunch break');
    return res.status(400).json({ message: 'Appointments cannot be scheduled during lunch break (12:00 PM - 1:00 PM).' });
  }

  // ── VALIDATE END TIME DOESN'T GO PAST CLOSING ──────────────────────────────
  // Import helper to calculate end time
  const { timeToMinutes: timeToMinutesHelper, minutesToTime: minutesToTimeHelper, getServiceDuration } = require('./scheduling-engine');
  
  // Get service duration (will be used to calculate end time)
  const serviceDuration = getServiceDuration(treatment);
  const totalDuration = serviceDuration + 10; // +10 min buffer
  
  // Calculate end time in minutes
  const startTimeMinutes = timeToMinutesHelper(appointment_time);
  const endTimeMinutes = startTimeMinutes + totalDuration;
  
  // Get clinic closing time for this day
  const closingTimeMinutes = operatingHours.end;
  
  if (endTimeMinutes > closingTimeMinutes) {
    const endTime = minutesToTimeHelper(endTimeMinutes);
    const closingTime = minutesToTimeHelper(closingTimeMinutes);
    console.log(`ERROR: Appointment end time (${endTime}) goes past clinic closing time (${closingTime})`);
    return res.status(400).json({ 
      message: `Appointment would end at ${endTime}, which is after clinic closing time (${closingTime}). Please select an earlier time.`,
      details: {
        start_time: appointment_time,
        end_time: endTime,
        service_duration: serviceDuration,
        buffer_time: 10,
        total_duration: totalDuration,
        clinic_closing: closingTime
      }
    });
  }

  // Determine status based on booking type
  // 'Walk-in' appointments are automatically approved
  // 'Registered patient' appointments are pending approval
  // Default to 'Registered patient' if not specified (for backward compatibility with patient bookings)
  const normalizedBookingType = booking_type || 'Registered patient';
  const status = normalizedBookingType === 'Walk-in' ? 'Approved' : 'Pending';
  const confirmation_status = normalizedBookingType === 'Walk-in' ? 'Confirmed' : 'Not Confirmed';

  console.log(`Booking type: ${normalizedBookingType}, Status: ${status}, Confirmation: ${confirmation_status}`);

  const client = await db.connect();
  try {
    // ── BEGIN TRANSACTION ──────────────────────────────────────────────────
    await client.query('BEGIN');
    
    // ── SET SERIALIZABLE ISOLATION LEVEL ───────────────────────────────────
    // CRITICAL FIX: Prevents race condition double-booking bug
    // Default PostgreSQL isolation (READ COMMITTED) allows phantom reads:
    // Two concurrent requests can both pass the overlap check
    // SERIALIZABLE ensures: if txns conflict, one rolls back automatically
    // Side effect: May get occasional serialization failures, handled by retry logic
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    // ── DYNAMIC DURATION CALCULATION ───────────────────────────────────────
    // Import scheduling engine helpers
    const { getServiceDuration, findDentistForService, timeToMinutes, minutesToTime } = require('./scheduling-engine');
    
    // Calculate duration: service duration + 10 min buffer
    let calculatedDuration = duration_minutes;
    if (!calculatedDuration && treatment) {
      const serviceDuration = getServiceDuration(treatment);
      calculatedDuration = serviceDuration + 10; // +10 min buffer
      console.log(`Calculated duration for "${treatment}": ${serviceDuration} + 10 = ${calculatedDuration} min`);
    }

    // ── WALK-IN DENTIST ASSIGNMENT ─────────────────────────────────────────
    // For walk-in appointments, resolve dentist based on treatment category
    let assignedDentistId = null;
    let assignedDentistName = null;

    if (normalizedBookingType === 'Walk-in' && treatment) {
      const dentist = findDentistForService(treatment);
      if (dentist) {
        assignedDentistId = dentist.dbId;
        assignedDentistName = dentist.name;
        console.log(`Walk-in: Assigned to ${assignedDentistName} (ID: ${assignedDentistId})`);
      }
    }

    // ── OVERLAP CHECKING ───────────────────────────────────────────────────
    // Check if this appointment overlaps with existing appointments (Pending or Approved)
    // This prevents double-booking the same slot
    // NOTE: For registered patient appointments, we need to check if a dentist was specified
    // If no dentist specified, we'll check all dentists for this service
    
    let dentistToCheck = assignedDentistId;
    
    // If no dentist assigned (registered patient), find one based on treatment
    if (!dentistToCheck && treatment) {
      const dentist = findDentistForService(treatment);
      if (dentist) {
        dentistToCheck = dentist.dbId;
        console.log(`Registered patient: Will check availability for ${dentist.name} (ID: ${dentist.dbId})`);
      }
    }

    // Parse the appointment time - handle both HH:MM and HH:MM:SS formats
    const timeStr = appointment_time.trim();
    const timeParts = timeStr.split(':');
    if (timeParts.length < 2) {
      console.error(`[OVERLAP CHECK] ERROR: Invalid time format: ${timeStr}`);
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid time format' });
    }
    
    const appointmentHours = parseInt(timeParts[0], 10);
    const appointmentMinutes = parseInt(timeParts[1], 10);
    const appointmentStartMin = appointmentHours * 60 + appointmentMinutes;
    const appointmentEndMin = appointmentStartMin + calculatedDuration;
    
    console.log(`[OVERLAP CHECK] Proposed: ${appointmentHours}:${String(appointmentMinutes).padStart(2, '0')} (${appointmentStartMin} - ${appointmentEndMin} min)`);

    if (dentistToCheck) {
      console.log(`[OVERLAP CHECK] Checking for conflicts with dentist ${dentistToCheck}...`);
      console.log(`[OVERLAP CHECK] Date: ${appointment_date}, Time: ${appointment_time}, Duration: ${calculatedDuration} min`);

      // Query existing appointments for this dentist on this date (Pending or Approved)
      const existingAppointments = await client.query(
        `SELECT id, appointment_time, duration_minutes, treatment, status, dentist_id, dentist_name
         FROM appointments
         WHERE appointment_date = $1
           AND dentist_id = $2
           AND status IN ('Pending', 'Approved')
         ORDER BY appointment_time ASC`,
        [appointment_date, dentistToCheck]
      );

      console.log(`[OVERLAP CHECK] Found ${existingAppointments.rows.length} existing appointments for dentist ${dentistToCheck}`);

      // Check for overlaps
      for (const existing of existingAppointments.rows) {
        const existTimeStr = existing.appointment_time.trim();
        const existTimeParts = existTimeStr.split(':');
        
        if (existTimeParts.length < 2) {
          console.error(`[OVERLAP CHECK] ERROR: Invalid existing time format: ${existTimeStr}`);
          continue;
        }
        
        const existHours = parseInt(existTimeParts[0], 10);
        const existMinutes = parseInt(existTimeParts[1], 10);
        const existStartMin = existHours * 60 + existMinutes;
        const existEndMin = existStartMin + existing.duration_minutes;

        console.log(`[OVERLAP CHECK] Existing: ${existHours}:${String(existMinutes).padStart(2, '0')} (${existStartMin} - ${existEndMin} min, ${existing.treatment}, ${existing.status})`);

        // Overlap rule: start1 < end2 AND end1 > start2
        if (appointmentStartMin < existEndMin && appointmentEndMin > existStartMin) {
          console.log(`[OVERLAP CHECK] ❌ CONFLICT DETECTED!`);
          console.log(`  Proposed: ${appointmentStartMin}-${appointmentEndMin}`);
          console.log(`  Existing: ${existStartMin}-${existEndMin}`);
          
          await client.query('ROLLBACK');
          return res.status(409).json({ 
            message: `Time slot conflict! This dentist already has an appointment from ${existHours}:${String(existMinutes).padStart(2, '0')} to ${Math.floor(existEndMin / 60)}:${String(existEndMin % 60).padStart(2, '0')} on this date.`,
            conflict: {
              existing_time: `${existHours}:${String(existMinutes).padStart(2, '0')}`,
              existing_end: `${Math.floor(existEndMin / 60)}:${String(existEndMin % 60).padStart(2, '0')}`,
              existing_treatment: existing.treatment,
              existing_status: existing.status,
              proposed_time: timeStr,
              proposed_end: `${Math.floor(appointmentEndMin / 60)}:${String(appointmentEndMin % 60).padStart(2, '0')}`
            }
          });
        }
      }

      console.log(`[OVERLAP CHECK] ✓ No conflicts found for dentist ${dentistToCheck}. Proceeding with booking.`);
    } else {
      // FALLBACK: If we can't determine a specific dentist, check ALL appointments on this date/time
      // This prevents double-booking even when dentist assignment fails
      console.log(`[OVERLAP CHECK] ⚠️ Could not determine specific dentist. Checking ALL appointments on this date/time...`);
      
      const allAppointments = await client.query(
        `SELECT id, appointment_time, duration_minutes, treatment, status, dentist_id, dentist_name
         FROM appointments
         WHERE appointment_date = $1
           AND status IN ('Pending', 'Approved')
         ORDER BY appointment_time ASC`,
        [appointment_date]
      );

      console.log(`[OVERLAP CHECK] Found ${allAppointments.rows.length} total appointments on ${appointment_date}`);

      // Check for overlaps with ANY appointment on this date
      for (const existing of allAppointments.rows) {
        const existTimeStr = existing.appointment_time.trim();
        const existTimeParts = existTimeStr.split(':');
        
        if (existTimeParts.length < 2) {
          console.error(`[OVERLAP CHECK] ERROR: Invalid existing time format: ${existTimeStr}`);
          continue;
        }
        
        const existHours = parseInt(existTimeParts[0], 10);
        const existMinutes = parseInt(existTimeParts[1], 10);
        const existStartMin = existHours * 60 + existMinutes;
        const existEndMin = existStartMin + existing.duration_minutes;

        console.log(`[OVERLAP CHECK] Existing: ${existHours}:${String(existMinutes).padStart(2, '0')} (${existStartMin} - ${existEndMin} min, ${existing.treatment}, ${existing.status}, Dentist: ${existing.dentist_name || 'Unknown'})`);

        // Overlap rule: start1 < end2 AND end1 > start2
        if (appointmentStartMin < existEndMin && appointmentEndMin > existStartMin) {
          console.log(`[OVERLAP CHECK] ❌ CONFLICT DETECTED!`);
          console.log(`  Proposed: ${appointmentStartMin}-${appointmentEndMin}`);
          console.log(`  Existing: ${existStartMin}-${existEndMin}`);
          
          await client.query('ROLLBACK');
          return res.status(409).json({ 
            message: `Time slot conflict! There is already an appointment from ${existHours}:${String(existMinutes).padStart(2, '0')} to ${Math.floor(existEndMin / 60)}:${String(existEndMin % 60).padStart(2, '0')} on this date.`,
            conflict: {
              existing_time: `${existHours}:${String(existMinutes).padStart(2, '0')}`,
              existing_end: `${Math.floor(existEndMin / 60)}:${String(existEndMin % 60).padStart(2, '0')}`,
              existing_treatment: existing.treatment,
              existing_status: existing.status,
              existing_dentist: existing.dentist_name,
              proposed_time: timeStr,
              proposed_end: `${Math.floor(appointmentEndMin / 60)}:${String(appointmentEndMin % 60).padStart(2, '0')}`
            }
          });
        }
      }

      console.log(`[OVERLAP CHECK] ✓ No conflicts found. Proceeding with booking.`);
    }

    console.log('Inserting appointment into database...');
    
    // Use the dentist that was checked for overlaps
    let finalDentistId = assignedDentistId || dentistToCheck;
    let finalDentistName = assignedDentistName;
    
    // If still no dentist found, try to find one based on treatment
    if (!finalDentistId && treatment) {
      const { findDentistForService, DENTISTS } = require('./scheduling-engine');
      const dentist = findDentistForService(treatment);
      if (dentist) {
        finalDentistId = dentist.dbId;
        finalDentistName = dentist.name;
        console.log(`Fallback: Assigned to ${finalDentistName} (ID: ${finalDentistId}) based on treatment`);
      }
    }
    
    // If we still don't have a dentist, this is an error
    if (!finalDentistId) {
      console.error(`ERROR: Could not find a dentist for treatment: ${treatment}`);
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `No dentist available for the selected treatment: ${treatment}. Please contact the clinic.`
      });
    }
    
    const result = await client.query(
      `INSERT INTO appointments
         (patient_id, patient_name, phone, email, treatment, services,
          appointment_date, appointment_time, duration_minutes, notes, status, 
          confirmation_status, dentist_id, dentist_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [patient_id || null, full_name, phone, email, treatment,
       services || [], appointment_date, appointment_time,
       calculatedDuration || 60, notes || '', status, confirmation_status,
       finalDentistId, finalDentistName]
    );
    const appointmentId = result.rows[0].id;
    console.log('Appointment created with ID:', appointmentId);

    // Notify all staff — part of the same transaction
    const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
    for (const staff of staffUsers.rows) {
      const notificationTitle = normalizedBookingType === 'Walk-in' 
        ? 'Walk-in Appointment Confirmed' 
        : 'New Appointment Request';
      const notificationDetail = normalizedBookingType === 'Walk-in'
        ? `✓ Walk-in: ${full_name} confirmed for ${treatment} on ${appointment_date} at ${appointment_time}.`
        : `${full_name} requested a ${treatment} appointment on ${appointment_date} at ${appointment_time}.`;
      
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level)
         VALUES ($1, $2, $3, $4)`,
        [
          staff.id,
          notificationTitle,
          notificationDetail,
          normalizedBookingType === 'Walk-in' ? 'Update' : 'New'
        ]
      );
    }

    // ── COMMIT TRANSACTION ─────────────────────────────────────────────────
    await client.query('COMMIT');
    console.log('SUCCESS: Booking transaction committed. ID:', appointmentId);
    
    // Send confirmation email asynchronously (don't wait for it)
    if (email) {
      setImmediate(() => {
        sendAppointmentConfirmationEmail(email, full_name, {
          treatment,
          appointment_date,
          appointment_time,
          dentist_name: finalDentistName,
          duration_minutes: calculatedDuration || 60,
          status: status  // Pass the status (Pending or Approved)
        }).catch(err => {
          console.error('[Email] Failed to send appointment notification:', err.message);
        });
      });
    }
    
    res.json({ 
      message: normalizedBookingType === 'Walk-in' 
        ? 'Walk-in appointment confirmed!' 
        : 'Appointment request submitted!', 
      id: appointmentId,
      status,
      booking_type: normalizedBookingType,
      dentist_id: assignedDentistId,
      dentist_name: assignedDentistName,
      duration_minutes: calculatedDuration || 60
    });
  } catch (err) {
    // ── ROLLBACK — appointment AND notifications are both undone ───────────
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback error:', rollbackErr.message);
    }
    
    console.error('Booking transaction rolled back:', err.message);
    
    // Handle serialization conflicts (from SERIALIZABLE isolation)
    // Error code 40001 = serialization_failure
    if (err.code === '40001') {
      console.warn('⚠️ Serialization conflict detected. Another booking was concurrent.');
      return res.status(409).json({ 
        message: 'The appointment slot was just booked. Please try another time.',
        code: 'SERIALIZATION_CONFLICT'
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: err.message || 'Failed to book appointment. Please try again.' 
    });
  } finally {
    client.release();
  }
});

// Get appointments for a specific patient
app.get('/my-appointments/:patientId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id, patient_name, email, phone, treatment, services,
         TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
         TO_CHAR(appointment_time, 'HH24:MI:SS') AS appointment_time,
         duration_minutes, status, confirmation_status, notes, dentist_name,
         rescheduled_by, created_at, updated_at
       FROM appointments
       WHERE patient_id = $1
       ORDER BY appointment_date DESC, appointment_time DESC`,
      [req.params.patientId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dentist: get their own appointments
app.get('/dentist/appointments', async (req, res) => {
  try {
    const { dentist } = req.query;
    let query = `
      SELECT
        a.id, a.patient_id, a.patient_name, a.email, a.phone,
        a.treatment, a.services,
        TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time, 'HH24:MI')    AS appointment_time,
        a.duration_minutes, a.status, a.notes,
        a.dentist_name, a.urgency, a.created_at, a.updated_at
      FROM appointments a
      WHERE a.status IN ('Approved','Completed','Rescheduled','Cancelled')
    `;
    const params = [];
    if (dentist) {
      query += ` AND a.dentist_name = $1`;
      params.push(dentist);
    }
    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Dentist/Staff: update appointment status (Completed, No-show, etc.)
app.put('/staff/appointments/:id/status', authMiddleware, async (req, res) => {
  const { status, notes } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE appointments SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3`,
      [status, notes || null, req.params.id]
    );
    const appt = await client.query('SELECT patient_id, treatment FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]?.patient_id && status === 'Completed') {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
        [appt.rows[0].patient_id, 'Appointment Completed',
         `Your ${appt.rows[0].treatment} appointment has been completed.`]
      );
    }
    await client.query('COMMIT');
    res.json({ message: `Appointment status updated to ${status}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Staff: get a single appointment by ID
app.get('/staff/appointments/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        a.id, a.patient_id, a.patient_name, a.email, a.phone, a.treatment,
        COALESCE(a.services, ARRAY[]::TEXT[]) AS services,
        TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time, 'HH24:MI')    AS appointment_time,
        a.duration_minutes, a.status, a.confirmation_status, a.notes,
        a.dentist_name, a.urgency,
        TO_CHAR(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at,
        TO_CHAR(a.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at,
        COALESCE(pp.reliability_score, 0) AS reliability_score
      FROM appointments a
      LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Appointment not found.' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Staff: get all appointments
app.get('/staff/appointments', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT
        a.id, a.patient_id, a.patient_name, a.email, a.phone, a.treatment,
        COALESCE(a.services, ARRAY[]::TEXT[]) AS services,
        TO_CHAR(a.appointment_date, 'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time, 'HH24:MI')    AS appointment_time,
        a.duration_minutes, a.status, a.confirmation_status, a.notes,
        a.dentist_name, a.urgency, a.created_at,
        COALESCE(pp.reliability_score, 0) AS reliability_score
      FROM appointments a
      LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
    `;
    const params = [];
    if (status) {
      query += ` WHERE a.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Staff: approve an appointment
// DYNAMIC TIMELINE: Resolves dentist_id from dentist_name and saves both
// ACID: Atomicity — status update + patient notification + billing record all committed together
app.put('/staff/appointments/:id/approve', authMiddleware, async (req, res) => {
  const { dentist_name, notes } = req.body;
  const client = await db.connect();
  try {
    // ── BEGIN TRANSACTION ──────────────────────────────────────────────────
    await client.query('BEGIN');

    // ── RESOLVE DENTIST ID FROM NAME ───────────────────────────────────────
    let dentistId = null;
    if (dentist_name) {
      // Try to find dentist by full name (first_name + last_name)
      const dentistQuery = await client.query(
        `SELECT id FROM users 
         WHERE (first_name || ' ' || last_name = $1 OR first_name || ' ' || last_name = $2)
         AND role = 'Admin'`,
        [dentist_name, dentist_name.replace('Dr. ', '')]
      );
      if (dentistQuery.rows.length > 0) {
        dentistId = dentistQuery.rows[0].id;
        console.log(`Resolved dentist "${dentist_name}" to ID: ${dentistId}`);
      }
    }

    await client.query(
      `UPDATE appointments
       SET status = 'Approved', dentist_name = $1, dentist_id = $2, notes = $3, updated_at = NOW()
       WHERE id = $4`,
      [dentist_name || null, dentistId, notes || null, req.params.id]
    );

    const appt = await client.query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    const a = appt.rows[0];

    if (!a) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Notify patient — same transaction
    if (a.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
        [a.patient_id, 'Appointment Approved',
         `Your ${a.treatment} appointment has been approved by the clinic.`]
      );
    }

    // ── COMMIT TRANSACTION ─────────────────────────────────────────────────
    await client.query('COMMIT');
    
    // Send approval confirmation email asynchronously
    if (a.email) {
      setImmediate(() => {
        sendAppointmentConfirmationEmail(a.email, a.patient_name, {
          treatment: a.treatment,
          appointment_date: a.appointment_date,
          appointment_time: a.appointment_time,
          dentist_name: dentist_name || a.dentist_name,
          duration_minutes: a.duration_minutes,
          status: 'Approved'  // Now it's approved!
        }).catch(err => {
          console.error('[Email] Failed to send approval confirmation:', err.message);
        });
      });
    }
    
    res.json({ 
      message: 'Appointment approved!',
      dentist_id: dentistId,
      dentist_name: dentist_name
    });
  } catch (err) {
    // ── ROLLBACK — approval, notification, and billing all undone ──────────
    await client.query('ROLLBACK');
    console.error('Approve transaction rolled back:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Staff: reject/cancel an appointment
// Staff: reject/cancel an appointment
// ACID: Atomicity — status update + patient notification committed together
app.put('/staff/appointments/:id/cancel', authMiddleware, async (req, res) => {
  const { reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get appointment details BEFORE cancelling (need date/time for slot management)
    const apptBefore = await client.query('SELECT appointment_date, appointment_time FROM appointments WHERE id = $1', [req.params.id]);
    const appointmentDate = apptBefore.rows[0]?.appointment_date;
    const appointmentTime = apptBefore.rows[0]?.appointment_time;

    await client.query(
      `UPDATE appointments SET status = 'Cancelled by Staff', notes = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'Cancelled by staff', req.params.id]
    );

    const appt = await client.query('SELECT patient_id, patient_name, email, treatment, appointment_date, appointment_time FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]?.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
        [appt.rows[0].patient_id, 'Appointment Cancelled by Clinic',
         `Your ${appt.rows[0].treatment} appointment was cancelled by the clinic. Reason: ${reason || 'No reason provided.'}`]
      );
    }

    await client.query('COMMIT');
    
    // Free up the slot AFTER transaction commits (outside transaction)
    if (appointmentDate && appointmentTime) {
      setImmediate(() => {
        SlotManager.increaseSlot(appointmentDate, appointmentTime).catch(err => {
          console.error('[SlotManager] Failed to increase slot:', err.message);
        });
      });
    }
    
    // Send cancellation email asynchronously
    if (appt.rows[0]?.email) {
      setImmediate(() => {
        sendAppointmentCancellationEmail(appt.rows[0].email, appt.rows[0].patient_name, {
          treatment: appt.rows[0].treatment,
          appointment_date: appt.rows[0].appointment_date,
          appointment_time: appt.rows[0].appointment_time,
          reason: reason || 'No reason provided'
        }, 'Staff').catch(err => {
          console.error('[Email] Failed to send cancellation email:', err.message);
        });
      });
    }
    
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancel transaction rolled back:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Staff: reschedule an appointment
// ACID: Atomicity — reschedule update + patient notification committed together
app.put('/staff/appointments/:id/reschedule', authMiddleware, async (req, res) => {
  const { appointment_date, appointment_time, reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Ensure rescheduled_by column exists (idempotent)
    await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_by VARCHAR(30)`);

    // Get old appointment details before updating
    const oldAppt = await client.query('SELECT appointment_date, appointment_time FROM appointments WHERE id = $1', [req.params.id]);
    const oldDate = oldAppt.rows[0]?.appointment_date;
    const oldTime = oldAppt.rows[0]?.appointment_time;

    await client.query(
      `UPDATE appointments
       SET status = 'Approved', appointment_date = $1,
           appointment_time = $2, notes = $3, rescheduled_by = 'Staff', updated_at = NOW()
       WHERE id = $4`,
      [appointment_date, appointment_time, reason || 'Rescheduled by staff', req.params.id]
    );

    const appt = await client.query('SELECT patient_id, patient_name, email, treatment FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]?.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
        [appt.rows[0].patient_id, 'Appointment Rescheduled by Clinic',
         `Your ${appt.rows[0].treatment} appointment has been rescheduled to ${appointment_date} at ${appointment_time}.`]
      );
    }

    await client.query('COMMIT');
    
    // Manage slots AFTER transaction commits (outside transaction)
    // Free up the OLD slot
    if (oldDate && oldTime) {
      setImmediate(() => {
        SlotManager.increaseSlot(oldDate, oldTime).catch(err => {
          console.error('[SlotManager] Failed to increase old slot:', err.message);
        });
      });
    }
    
    // Book the NEW slot
    if (appointment_date && appointment_time) {
      setImmediate(() => {
        SlotManager.decreaseSlot(appointment_date, appointment_time).catch(err => {
          console.error('[SlotManager] Failed to decrease new slot:', err.message);
        });
      });
    }
    
    // Send reschedule email asynchronously
    if (appt.rows[0]?.email) {
      setImmediate(() => {
        sendAppointmentRescheduleEmail(appt.rows[0].email, appt.rows[0].patient_name, {
          treatment: appt.rows[0].treatment,
          old_date: oldDate,
          old_time: oldTime,
          new_date: appointment_date,
          new_time: appointment_time,
          reason: reason || 'Rescheduled by clinic'
        }).catch(err => {
          console.error('[Email] Failed to send reschedule email:', err.message);
        });
      });
    }
    
    res.json({ message: 'Appointment rescheduled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reschedule transaction rolled back:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Patient: cancel their own appointment
app.put('/appointments/:id/cancel', authMiddleware, async (req, res) => {
  const { reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Get appointment details BEFORE cancelling (need date/time for slot management)
    const apptBefore = await client.query('SELECT appointment_date, appointment_time FROM appointments WHERE id = $1', [req.params.id]);
    const appointmentDate = apptBefore.rows[0]?.appointment_date;
    const appointmentTime = apptBefore.rows[0]?.appointment_time;

    await client.query(
      `UPDATE appointments SET status = 'Cancelled by Patient', notes = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'Cancelled by patient', req.params.id]
    );

    // Notify all staff
    const appt = await client.query('SELECT patient_name, treatment, email FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]) {
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
          [staff.id, 'Appointment Cancelled by Patient',
           `${appt.rows[0].patient_name} cancelled their ${appt.rows[0].treatment} appointment. Reason: ${reason || 'No reason provided.'}`]
        );
      }
    }

    await client.query('COMMIT');
    
    // Free up the slot AFTER transaction commits (outside transaction)
    if (appointmentDate && appointmentTime) {
      setImmediate(() => {
        SlotManager.increaseSlot(appointmentDate, appointmentTime).catch(err => {
          console.error('[SlotManager] Failed to increase slot:', err.message);
        });
      });
    }
    
    // Send cancellation email asynchronously
    if (appt.rows[0]?.email) {
      setImmediate(() => {
        sendAppointmentCancellationEmail(appt.rows[0].email, appt.rows[0].patient_name, {
          treatment: appt.rows[0].treatment,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason: reason || 'Cancelled by patient'
        }, 'Patient').catch(err => {
          console.error('[Email] Failed to send cancellation email:', err.message);
        });
      });
    }
    
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Patient: request a reschedule (does NOT change date yet — staff must approve)
app.put('/appointments/:id/request-reschedule', authMiddleware, async (req, res) => {
  const { preferred_date, preferred_time, reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const note = `Patient requested reschedule to ${preferred_date || 'TBD'} at ${preferred_time || 'TBD'}. Reason: ${reason || 'Not specified.'}`;
    await client.query(
      `UPDATE appointments SET status = 'Reschedule Requested by Patient', notes = $1, updated_at = NOW() WHERE id = $2`,
      [note, req.params.id]
    );

    const appt = await client.query('SELECT patient_name, treatment FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]) {
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
          [staff.id, 'Reschedule Requested by Patient',
           `${appt.rows[0].patient_name} requested to reschedule their ${appt.rows[0].treatment} appointment to ${preferred_date || 'TBD'} at ${preferred_time || 'TBD'}.`]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Reschedule request submitted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Dentist: cancel their appointment
app.put('/dentist/appointments/:id/cancel', async (req, res) => {
  const { reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE appointments SET status = 'Cancelled by Dentist', notes = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'Cancelled by dentist', req.params.id]
    );

    const appt = await client.query('SELECT patient_id, patient_name, treatment FROM appointments WHERE id = $1', [req.params.id]);
    const a = appt.rows[0];
    if (a) {
      // Notify patient
      if (a.patient_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
          [a.patient_id, 'Appointment Cancelled by Dentist',
           `Your ${a.treatment} appointment was cancelled by your dentist. Reason: ${reason || 'No reason provided.'}`]
        );
      }
      // Notify staff
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
          [staff.id, 'Dentist Cancelled Appointment',
           `${a.patient_name}'s ${a.treatment} appointment was cancelled by the dentist. Reason: ${reason || 'No reason provided.'}`]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Appointment cancelled by dentist.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Dentist: request a reschedule (patient must approve)
app.put('/dentist/appointments/:id/request-reschedule', async (req, res) => {
  const { preferred_date, preferred_time, reason } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const note = `Dentist requested reschedule to ${preferred_date || 'TBD'} at ${preferred_time || 'TBD'}. Reason: ${reason || 'Not specified.'}`;
    await client.query(
      `UPDATE appointments SET status = 'Reschedule Requested by Dentist', notes = $1, updated_at = NOW() WHERE id = $2`,
      [note, req.params.id]
    );

    const appt = await client.query('SELECT patient_id, patient_name, treatment FROM appointments WHERE id = $1', [req.params.id]);
    const a = appt.rows[0];
    if (a) {
      // Notify patient
      if (a.patient_id) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
          [a.patient_id, 'Dentist Requested Reschedule',
           `Your dentist has requested to reschedule your ${a.treatment} appointment to ${preferred_date || 'TBD'} at ${preferred_time || 'TBD'}. Please contact the clinic to confirm.`]
        );
      }
      // Notify staff
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
          [staff.id, 'Dentist Requested Reschedule',
           `Dentist requested to reschedule ${a.patient_name}'s ${a.treatment} appointment to ${preferred_date || 'TBD'}.`]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Reschedule request submitted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Dentist: mark appointment as No-show
app.put('/dentist/appointments/:id/no-show', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE appointments SET status = 'No-show', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    const appt = await client.query('SELECT patient_id, treatment FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]?.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
        [appt.rows[0].patient_id, 'Missed Appointment',
         `You were marked as a no-show for your ${appt.rows[0].treatment} appointment. Please contact the clinic to reschedule.`]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Appointment marked as no-show.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Auth: Staff and Dentist only (legacy update route)
app.put('/update-appointment/:id', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const { treatment, appointment_date, appointment_time, status, notes } = req.body;
  try {
    await db.query(
      `UPDATE appointments
       SET treatment = $1, appointment_date = $2, appointment_time = $3,
           status = $4, notes = $5, updated_at = NOW()
       WHERE id = $6`,
      [treatment, appointment_date, appointment_time, status, notes, req.params.id]
    );
    res.send('Appointment updated successfully!');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Auth: Staff and Dentist only (legacy delete route)
app.delete('/delete-appointment/:id', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.send('Appointment cancelled successfully!');
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// Auth: user can only read their own notifications; Staff/Admin can read any
app.get('/notifications/:userId', authMiddleware, async (req, res) => {
  const isOwner = String(req.user.id) === String(req.params.userId);
  const isPrivileged = ['Staff', 'Dentist'].includes(req.user.role);
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const result = await db.query(
      `SELECT n.*, a.confirmation_status
       FROM notifications n
       LEFT JOIN appointments a ON a.id = n.appointment_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── PATIENT PROFILE ROUTES ───────────────────────────────────────────────────

// Auth: patient can only view their own profile; Staff/Admin can view any
app.get('/patient-profile/:userId', authMiddleware, async (req, res) => {
  const isOwner = String(req.user.id) === String(req.params.userId);
  const isPrivileged = ['Staff', 'Dentist'].includes(req.user.role);
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
              p.*
       FROM users u
       LEFT JOIN patient_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Profile not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/patient-profile/:userId', authMiddleware, async (req, res) => {
  const {
    date_of_birth, gender, blood_type, preferred_language,
    home_address, preferred_contact, primary_dentist,
    emergency_contact_name, emergency_contact_rel, emergency_contact_phone,
    notif_email, notif_sms, notif_announcements,
  } = req.body;

  try {
    // Use UPSERT (INSERT ... ON CONFLICT) to handle both create and update
    // This ensures the profile is created if it doesn't exist, or updated if it does
    await db.query(
      `INSERT INTO patient_profiles (
         user_id, date_of_birth, gender, blood_type, preferred_language,
         home_address, preferred_contact, primary_dentist,
         emergency_contact_name, emergency_contact_rel, emergency_contact_phone,
         notif_email, notif_sms, notif_announcements
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (user_id) DO UPDATE SET
         date_of_birth = $2, gender = $3, blood_type = $4,
         preferred_language = $5, home_address = $6, preferred_contact = $7,
         primary_dentist = $8, emergency_contact_name = $9,
         emergency_contact_rel = $10, emergency_contact_phone = $11,
         notif_email = $12, notif_sms = $13, notif_announcements = $14`,
      [
        req.params.userId,
        date_of_birth, gender, blood_type, preferred_language,
        home_address, preferred_contact, primary_dentist,
        emergency_contact_name, emergency_contact_rel, emergency_contact_phone,
        notif_email, notif_sms, notif_announcements,
      ]
    );
    res.json({ message: 'Profile updated successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DENTIST PATIENTS ────────────────────────────────────────────────────────

// GET patients who have appointments with this dentist
app.get('/dentist/patients', async (req, res) => {
  try {
    const { dentist } = req.query;
    const filter = dentist ? `WHERE a.dentist_name = $1` : '';
    const params = dentist ? [dentist] : [];
    const result = await db.query(`
      SELECT DISTINCT
        u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
        pp.date_of_birth, pp.gender, pp.blood_type, pp.home_address,
        pp.preferred_language, pp.emergency_contact_name, pp.emergency_contact_phone,
        (SELECT TO_CHAR(MAX(a2.appointment_date),'YYYY-MM-DD')
         FROM appointments a2 WHERE a2.patient_id = u.id AND a2.status = 'Completed') AS last_visit,
        (SELECT TO_CHAR(MIN(a3.appointment_date),'YYYY-MM-DD')
         FROM appointments a3 WHERE a3.patient_id = u.id AND a3.status = 'Approved'
           AND a3.appointment_date >= CURRENT_DATE) AS next_appointment,
        (SELECT a4.treatment FROM appointments a4 WHERE a4.patient_id = u.id
         ORDER BY a4.created_at DESC LIMIT 1) AS current_treatment,
        (SELECT a5.status FROM appointments a5 WHERE a5.patient_id = u.id
         ORDER BY a5.created_at DESC LIMIT 1) AS treatment_status
      FROM users u
      JOIN appointments a ON a.patient_id = u.id
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      WHERE u.role = 'Patient'
      ${dentist ? 'AND a.dentist_name = $1' : ''}
      ORDER BY u.first_name ASC
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single patient's appointment history
app.get('/dentist/patients/:patientId/history', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, treatment, services,
             TO_CHAR(appointment_date,'YYYY-MM-DD') AS appointment_date,
             TO_CHAR(appointment_time,'HH24:MI') AS appointment_time,
             duration_minutes, status, notes, dentist_name,
             TO_CHAR(created_at,'YYYY-MM-DD') AS created_at
      FROM appointments
      WHERE patient_id = $1
      ORDER BY appointment_date DESC
    `, [req.params.patientId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DENTIST PRESCRIPTIONS ────────────────────────────────────────────────────

// Ensure prescriptions table exists and has all required columns
db.query(`
  CREATE TABLE IF NOT EXISTS prescriptions (
    id               SERIAL PRIMARY KEY,
    patient_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dentist_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    medication       VARCHAR(255),
    dosage           VARCHAR(100),
    frequency        VARCHAR(100),
    duration         VARCHAR(100),
    instructions     TEXT,
    status           VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active','Completed','Pending','Cancelled')),
    issued_at        TIMESTAMP DEFAULT NOW()
  )
`).then(() => {
  // Add columns that may be missing from older table versions
  const alterCols = [
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS patient_name VARCHAR(200)`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(200)`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS diagnosis TEXT`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS condition_note TEXT`,
    `ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
  ];
  return Promise.all(alterCols.map(q => db.query(q)));
}).catch(err => console.error('Prescriptions table error:', err.message));

// GET prescriptions for dentist
app.get('/dentist/prescriptions', async (req, res) => {
  try {
    const { dentist } = req.query;
    const filter = dentist ? `WHERE p.dentist_name = $1` : '';
    const params = dentist ? [dentist] : [];
    const result = await db.query(`
      SELECT p.*,
             TO_CHAR(p.issued_at,'YYYY-MM-DD') AS date_fmt
      FROM prescriptions p
      ${filter}
      ORDER BY p.issued_at DESC
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create prescription
app.post('/dentist/prescriptions', async (req, res) => {
  const { patient_id, patient_name, dentist_id, dentist_name, medication, dosage, frequency, duration, instructions, diagnosis, condition_note } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO prescriptions (patient_id, dentist_id, patient_name, dentist_name, medication, dosage, frequency, duration, instructions, diagnosis, condition_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [patient_id||null, dentist_id||null, patient_name, dentist_name, medication, dosage||'', frequency||'', duration||'', instructions||'', diagnosis||'', condition_note||'']);

    // Notify the patient if we have their user ID
    if (patient_id) {
      const detail = `${dentist_name} has prescribed ${medication}${dosage ? ' ' + dosage : ''}${frequency ? ', ' + frequency : ''}${duration ? ' for ' + duration : ''}.${instructions ? ' Instructions: ' + instructions : ''}`;
      db.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
        [patient_id, 'Prescription Issued', detail]
      ).catch(err => console.error('Prescription notification error:', err.message));
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update prescription status
app.put('/dentist/prescriptions/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await db.query(`UPDATE prescriptions SET status=$1, updated_at=NOW() WHERE id=$2`, [status, req.params.id]);
    res.json({ message: 'Prescription updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DENTIST TREATMENT PLANS ──────────────────────────────────────────────────

// GET treatment plans for dentist
app.get('/dentist/treatment-plans', async (req, res) => {
  try {
    const { dentist } = req.query;
    const filter = dentist ? `WHERE tp.dentist_id IN (SELECT id FROM users WHERE CONCAT('Dr. ', first_name, ' ', last_name) = $1)` : '';
    const params = dentist ? [dentist] : [];
    const result = await db.query(`
      SELECT tp.*,
             u.first_name || ' ' || u.last_name AS patient_name,
             TO_CHAR(tp.created_at,'YYYY-MM-DD') AS date_fmt
      FROM treatment_plans tp
      JOIN users u ON u.id = tp.patient_id
      ${filter}
      ORDER BY tp.created_at DESC
    `, params);

    // Get sessions for each plan
    const plans = await Promise.all(result.rows.map(async (plan) => {
      const sessions = await db.query(`
        SELECT * FROM treatment_sessions WHERE plan_id = $1 ORDER BY session_no ASC
      `, [plan.id]);
      return { ...plan, sessions: sessions.rows };
    }));

    res.json(plans);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create treatment plan
app.post('/dentist/treatment-plans', async (req, res) => {
  const { patient_id, dentist_id, title, description } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO treatment_plans (patient_id, dentist_id, title, description)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [patient_id, dentist_id||null, title, description]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT update treatment session status
app.put('/dentist/treatment-sessions/:id/status', async (req, res) => {
  const { status, note } = req.body;
  try {
    await db.query(`UPDATE treatment_sessions SET status=$1, note=COALESCE($2,note) WHERE id=$3`, [status, note||null, req.params.id]);
    res.json({ message: 'Session updated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── DENTIST NOTIFICATIONS ────────────────────────────────────────────────────

// GET notifications for dentist (from appointments assigned to them)
app.get('/dentist/notifications', async (req, res) => {
  try {
    const { dentist } = req.query;
    const filter = dentist ? `AND a.dentist_name = $1` : '';
    const params = dentist ? [dentist] : [];
    const result = await db.query(`
      SELECT a.id, a.patient_name, a.treatment, a.status,
             TO_CHAR(a.appointment_date,'YYYY-MM-DD') AS appointment_date,
             TO_CHAR(a.appointment_time,'HH24:MI') AS appointment_time,
             a.notes, a.urgency,
             TO_CHAR(a.updated_at,'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at,
             TO_CHAR(a.created_at,'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
      FROM appointments a
      WHERE a.status IN ('Approved','Rescheduled','Cancelled','Completed')
      ${filter}
      ORDER BY a.updated_at DESC
      LIMIT 30
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── STAFF NOTIFICATIONS ──────────────────────────────────────────────────────

// GET all staff notifications (from appointment activity)
app.get('/staff/notifications', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        a.id, a.patient_name, a.treatment, a.status,
        TO_CHAR(a.appointment_date,'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time,'HH24:MI') AS appointment_time,
        a.dentist_name, a.notes, a.urgency,
        TO_CHAR(a.updated_at,'YYYY-MM-DD"T"HH24:MI:SS') AS updated_at,
        TO_CHAR(a.created_at,'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
      FROM appointments a
      ORDER BY a.updated_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── CALENDAR ─────────────────────────────────────────────────────────────────

// GET appointments for a date range (calendar view) — staff sees all
app.get('/staff/calendar', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT
        a.id, a.patient_name, a.treatment, a.services,
        TO_CHAR(a.appointment_date,'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time,'HH24:MI') AS appointment_time,
        a.duration_minutes, a.status, a.dentist_name, a.notes
      FROM appointments a
      WHERE a.status NOT IN ('Cancelled')
    `;
    const params = [];
    if (startDate && endDate) {
      query += ` AND a.appointment_date BETWEEN $1 AND $2`;
      params.push(startDate, endDate);
    }
    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET appointments for a date range filtered by dentist (dentist calendar view)
app.get('/dentist/calendar', async (req, res) => {
  try {
    const { startDate, endDate, dentist } = req.query;
    if (!dentist) {
      return res.status(400).json({ message: 'dentist query parameter is required.' });
    }
    const params = [dentist];
    let query = `
      SELECT
        a.id, a.patient_name, a.treatment, a.services,
        TO_CHAR(a.appointment_date,'YYYY-MM-DD') AS appointment_date,
        TO_CHAR(a.appointment_time,'HH24:MI') AS appointment_time,
        a.duration_minutes, a.status, a.dentist_name, a.notes
      FROM appointments a
      WHERE a.status NOT IN ('Cancelled')
        AND a.dentist_name = $1
    `;
    if (startDate && endDate) {
      query += ` AND a.appointment_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }
    query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── HELP CENTER ─────────────────────────────────────────────────────────────

// Create tables on startup
db.query(`
  CREATE TABLE IF NOT EXISTS faqs (
    id          SERIAL PRIMARY KEY,
    question    TEXT         NOT NULL,
    answer      TEXT         NOT NULL,
    category    VARCHAR(60)  NOT NULL DEFAULT 'General',
    role        VARCHAR(20)  NOT NULL DEFAULT 'Patient' CHECK (role IN ('Patient','Staff','Admin')),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
  )
`).then(async () => {
  // Seed FAQs if table is empty
  const count = await db.query('SELECT COUNT(*) FROM faqs');
  if (parseInt(count.rows[0].count) === 0) {
    const faqs = [
      // ── Patient FAQs ──────────────────────────────────────────────
      ['How do I book an appointment?', 'Click "Book Appointment" in the sidebar, choose your service category, pick a date and time, fill in your details, then submit. You will be notified once the clinic confirms.', 'Appointments', 'Patient', 1],
      ['How do I reschedule or cancel my appointment?', 'Go to My Appointments, find the visit you want to change, and click "Request Reschedule" or "Cancel Appointment". The clinic will review your request.', 'Appointments', 'Patient', 2],
      ['How will I know if my appointment is confirmed?', 'You will receive a notification in the Notifications section once the clinic approves or updates your booking.', 'Appointments', 'Patient', 3],
      ['How do I upload my insurance card or dental records?', 'Open Medical Vault from the sidebar and click "Upload Document". You can upload X-rays, prescriptions, insurance cards, and more.', 'Medical Records', 'Patient', 4],
      ['Where can I view my treatment plan?', 'Open Treatment Progress from the sidebar to check your current care plan, milestones, and upcoming sessions.', 'Medical Records', 'Patient', 5],
      ['How do I update my personal information?', 'Open Profile from the sidebar and click "Edit Profile" to update your name, phone number, and other saved details.', 'Account', 'Patient', 6],
      ['I forgot my password. What should I do?', 'On the login page, click "Forgot Password" and follow the instructions sent to your registered email address.', 'Account', 'Patient', 7],
      ['Why can I not log in to my account?', 'Make sure you are using the correct email and password. If the problem continues, use "Forgot Password" or contact the clinic.', 'Technical', 'Patient', 8],
      // ── Staff FAQs ────────────────────────────────────────────────
      ['How do I approve or reject a booking request?', 'Open Requests, review the patient details and appointment info, then click "Review & Approve", "Reschedule", or "Reject".', 'Appointments', 'Staff', 1],
      ['When should I reschedule instead of rejecting?', 'Reschedule when the patient request is valid but the preferred time or dentist availability needs adjustment.', 'Appointments', 'Staff', 2],
      ['How do I block availability in the calendar?', 'Open Calendar and add a blocked slot for maintenance, provider breaks, or unavailable time windows.', 'Scheduling', 'Staff', 3],
      ['Where can I check a patient record?', 'Use the Patients section to find any patient and review their appointments, profile, and history.', 'Patients', 'Staff', 4],
      ['What should I do when a warning alert appears?', 'Review the notification details, confirm the schedule or request, and update the related appointment before notifying the patient.', 'Technical', 'Staff', 6],
      // ── Dentist (Admin) FAQs ──────────────────────────────────────
      ['Where can I review my appointments?', 'Open My Appointments or Schedule to review assigned visits, appointment status, and daily patient flow.', 'Appointments', 'Admin', 1],
      ['How do I check a patient record?', 'Open My Patients, select the patient, then review their medical records, appointments, and treatment notes.', 'Patients', 'Admin', 2],
      ['Where do I manage treatment plans?', 'Use Treatment Plans to review, update, and track active patient care plans and session milestones.', 'Treatment', 'Admin', 3],
      ['How do I issue a prescription?', 'Open Prescriptions, click "New Prescription", fill in the patient, medication, dosage, and instructions, then save.', 'Treatment', 'Admin', 4],
      ['How do I handle clinical notifications?', 'Open Notifications, review the alert details, and update the related appointment or patient record when needed.', 'Technical', 'Admin', 5],
      ['How do I update my dentist profile?', 'Open Profile or Settings to manage your account details, specialty, and portal preferences.', 'Account', 'Admin', 6],
    ];
    for (const [question, answer, category, role, sort_order] of faqs) {
      await db.query(
        `INSERT INTO faqs (question, answer, category, role, sort_order) VALUES ($1,$2,$3,$4,$5)`,
        [question, answer, category, role, sort_order]
      );
    }
    console.log('FAQs seeded.');
  }
}).catch(err => console.error('FAQ table error:', err.message));

db.query(`
  CREATE TABLE IF NOT EXISTS support_requests (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    user_name  VARCHAR(200),
    user_email VARCHAR(255),
    user_role  VARCHAR(20),
    subject    VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Resolved')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('Support requests table error:', err.message));

// Composite booking table for multi-service bookings
db.query(`
  CREATE TABLE IF NOT EXISTS composite_bookings (
    id                        SERIAL PRIMARY KEY,
    booking_id                VARCHAR(50) UNIQUE NOT NULL,
    patient_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_name              VARCHAR(255) NOT NULL,
    patient_email             VARCHAR(255) NOT NULL,
    patient_phone             VARCHAR(20) NOT NULL,
    booking_type              VARCHAR(50) NOT NULL DEFAULT 'Patient',
    intake_priority           VARCHAR(50) NOT NULL DEFAULT 'Standard',
    intake_source             VARCHAR(50) NOT NULL DEFAULT 'Online',
    service_count             INTEGER NOT NULL,
    total_duration_minutes    INTEGER NOT NULL,
    patient_notes             TEXT,
    overall_status            VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_by                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('Composite bookings table error:', err.message));

// Composite booking appointments table for individual appointments within a composite booking
// Wait a bit to ensure composite_bookings table exists first
setTimeout(() => {
  db.query(`
    CREATE TABLE IF NOT EXISTS composite_booking_appointments (
      id                        SERIAL PRIMARY KEY,
      composite_booking_id      INTEGER NOT NULL REFERENCES composite_bookings(id) ON DELETE CASCADE,
      booking_id                VARCHAR(50) NOT NULL,
      appointment_id            VARCHAR(100) UNIQUE NOT NULL,
      appointment_sequence      INTEGER NOT NULL,
      service_name              VARCHAR(255) NOT NULL,
      service_category          VARCHAR(100) NOT NULL,
      service_duration_minutes  INTEGER NOT NULL,
      appointment_date          DATE NOT NULL,
      appointment_time          VARCHAR(5) NOT NULL,
      appointment_end_time      VARCHAR(5),
      dentist_id                INTEGER REFERENCES dentist(dentist_id) ON DELETE SET NULL,
      dentist_name              VARCHAR(255),
      dentist_specialty         VARCHAR(255),
      patient_age               VARCHAR(10),
      appointment_status        VARCHAR(50) NOT NULL DEFAULT 'Pending',
      cancellation_reason       TEXT,
      created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at                TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `).catch(err => console.error('Composite booking appointments table error:', err.message));

  // Add missing columns if they don't exist
  setTimeout(() => {
    db.query(`
      ALTER TABLE composite_booking_appointments
      ADD COLUMN IF NOT EXISTS appointment_end_time VARCHAR(5)
    `).catch(err => console.error('Error adding appointment_end_time column:', err.message));

    db.query(`
      ALTER TABLE composite_booking_appointments
      ADD COLUMN IF NOT EXISTS dentist_specialty VARCHAR(255)
    `).catch(err => console.error('Error adding dentist_specialty column:', err.message));

    // Fix foreign key constraint if needed
    db.query(`
      ALTER TABLE composite_booking_appointments
      DROP CONSTRAINT IF EXISTS composite_booking_appointments_dentist_id_fkey
    `).catch(err => console.error('Error dropping old FK:', err.message));

    db.query(`
      ALTER TABLE composite_booking_appointments
      ADD CONSTRAINT composite_booking_appointments_dentist_id_fkey
      FOREIGN KEY (dentist_id) REFERENCES dentist(dentist_id) ON DELETE SET NULL
    `).catch(err => console.error('Error adding FK:', err.message));
  }, 1000);
}, 500);

// Service to Dentist Mapping table
db.query(`
  CREATE TABLE IF NOT EXISTS service_dentist_mapping (
    id                SERIAL PRIMARY KEY,
    service_name      VARCHAR(255) NOT NULL,
    service_category  VARCHAR(100) NOT NULL,
    dentist_id        INTEGER NOT NULL REFERENCES dentist(dentist_id) ON DELETE CASCADE,
    is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(service_name, dentist_id)
  )
`).catch(err => console.error('Service dentist mapping table error:', err.message));

// Composite Booking Audit Log table
db.query(`
  CREATE TABLE IF NOT EXISTS composite_booking_audit_log (
    id                    SERIAL PRIMARY KEY,
    composite_booking_id  INTEGER NOT NULL REFERENCES composite_bookings(id) ON DELETE CASCADE,
    action                VARCHAR(50) NOT NULL,
    action_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_details        TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
  )
`).catch(err => console.error('Composite booking audit log table error:', err.message));

// Populate service_dentist_mapping with initial data
setTimeout(() => {
  // Insert a mapping for each service to the first available dentist
  db.query(`
    INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
    SELECT 
      'oral consultation',
      'General Dentistry',
      d.dentist_id,
      TRUE as is_primary,
      TRUE as is_active
    FROM dentist d LIMIT 1
    ON CONFLICT DO NOTHING
  `).catch(err => {}); // Silent fail if already exists

  // Populate all general dentistry services
  const generalDentistryServices = [
    'oral consultation', 'dental cleaning', 'digital x-rays', 'tooth fillings', 
    'fluoride treatment', 'dental sealants', 'simple tooth extraction', 'emergency dental care'
  ];
  
  db.query(`
    SELECT dentist_id FROM dentist LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      generalDentistryServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'General Dentistry', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});

  // Populate cosmetic arts services
  const cosmeticServices = [
    'teeth whitening', 'dental veneers', 'dental bonding', 'smile makeover', 'tooth contouring', 'gum contouring'
  ];

  db.query(`
    SELECT dentist_id FROM dentist WHERE dentist_id > 1 LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      cosmeticServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'Cosmetic Arts', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});

  // Populate orthodontics services  
  const orthodonticsServices = [
    'traditional braces', 'ceramic braces', 'self-ligating braces', 'clear aligners', 'retainers', 'orthodontic consultation'
  ];

  db.query(`
    SELECT dentist_id FROM dentist WHERE dentist_id > 2 LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      orthodonticsServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'Orthodontics', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});

  // Populate oral surgery services
  const oralSurgeryServices = [
    'surgical tooth extraction', 'wisdom tooth removal', 'cyst removal', 'minor oral surgery', 'frenectomy'
  ];

  db.query(`
    SELECT dentist_id FROM dentist WHERE dentist_id > 3 LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      oralSurgeryServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'Oral Surgery', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});

  // Populate dental implants services
  const dentalImplantsServices = [
    'implant consultation', 'single tooth implant', 'multiple tooth implant', 'implant crown placement', 'implant maintenance'
  ];

  db.query(`
    SELECT dentist_id FROM dentist WHERE dentist_id > 1 LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      dentalImplantsServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'Dental Implants', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});

  // Populate pediatric care services
  const pediatricServices = [
    'pediatric check-up', 'pediatric cleaning', 'fluoride for kids', 'dental sealants', 'baby tooth extraction', 'space maintainers'
  ];

  db.query(`
    SELECT dentist_id FROM dentist WHERE dentist_id > 2 LIMIT 1
  `).then(result => {
    if (result.rows.length > 0) {
      const dentistId = result.rows[0].dentist_id;
      pediatricServices.forEach(service => {
        db.query(`
          INSERT INTO service_dentist_mapping (service_name, service_category, dentist_id, is_primary, is_active)
          VALUES ($1, $2, $3, TRUE, TRUE)
          ON CONFLICT (service_name, dentist_id) DO NOTHING
        `, [service.toLowerCase(), 'Pediatric Care', dentistId])
          .catch(err => {});
      });
    }
  }).catch(err => {});
}, 1500);

// GET /faqs — fetch all FAQs, optionally filtered by category and/or role
app.get('/faqs', async (req, res) => {
  try {
    const { category, role } = req.query;
    let query = `SELECT id, question, answer, category, role, sort_order FROM faqs WHERE 1=1`;
    const params = [];
    if (category) { query += ` AND category = $${params.length + 1}`; params.push(category); }
    if (role)     { query += ` AND role = $${params.length + 1}`;     params.push(role); }
    query += ` ORDER BY sort_order ASC, id ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /support-request — submit a help/support request
// ACID: Atomicity — insert support request + optional notification in one transaction
app.post('/support-request', async (req, res) => {
  const { user_id, user_name, user_email, user_role, subject, message } = req.body;
  if (!subject?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Subject and message are required.' });
  }
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO support_requests (user_id, user_name, user_email, user_role, subject, message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [user_id || null, user_name || 'Anonymous', user_email || '', user_role || 'Patient',
       subject.trim(), message.trim()]
    );

    // Notify all staff about the new support request
    const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
    for (const staff of staffUsers.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1,$2,$3,'New')`,
        [staff.id, 'New Support Request', `${user_name || 'A user'} submitted a support request: "${subject.trim()}"`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Support request submitted successfully!', id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Support request error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET /support-requests — staff view of all support requests
app.get('/support-requests', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM support_requests ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /support-requests/:id/status — staff updates request status
app.put('/support-requests/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query(
      `UPDATE support_requests SET status=$1, updated_at=NOW() WHERE id=$2`,
      [status, req.params.id]
    );
    res.json({ message: `Request marked as ${status}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── REMINDER & NO-SHOW SYSTEM ───────────────────────────────────────────────
// Column migrations are handled in startServer() at the bottom of this file.;

// Patient confirms attendance
app.put('/appointments/:id/confirm', authMiddleware, async (req, res) => {
  try {
    await db.query(
      `UPDATE appointments SET confirmation_status = 'Confirmed', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Attendance confirmed.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Patient requests reschedule from reminder
app.put('/appointments/:id/confirm-reschedule', authMiddleware, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE appointments SET confirmation_status = 'Reschedule Requested', status = 'Reschedule Requested by Patient', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    const appt = await client.query('SELECT patient_name, treatment FROM appointments WHERE id = $1', [req.params.id]);
    if (appt.rows[0]) {
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Update')`,
          [staff.id, 'Reschedule Requested via Reminder',
           `${appt.rows[0].patient_name} requested to reschedule their ${appt.rows[0].treatment} appointment after receiving a reminder.`]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Reschedule request submitted.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Staff: manually mark no-show (also updates reliability)
app.put('/staff/appointments/:id/no-show', authMiddleware, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE appointments SET status = 'No-show', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    const appt = await client.query('SELECT patient_id, patient_name, treatment FROM appointments WHERE id = $1', [req.params.id]);
    const a = appt.rows[0];
    if (a?.patient_id) {
      await client.query(
        `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, 'Warning')`,
        [a.patient_id, '⚠️ Missed Appointment',
         `You were marked as a no-show for your ${a.treatment} appointment. Please contact the clinic to reschedule.`]
      );
      await client.query(
        `UPDATE patient_profiles SET reliability_score = GREATEST(reliability_score - 2, -20) WHERE user_id = $1`,
        [a.patient_id]
      );
    }
    await client.query('COMMIT');
    res.json({ message: 'Appointment marked as no-show.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// GET patient reliability score
app.get('/patient/reliability/:patientId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT reliability_score FROM patient_profiles WHERE user_id = $1`,
      [req.params.patientId]
    );
    res.json({ reliability_score: result.rows[0]?.reliability_score ?? 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all patients with reliability scores (staff view)
app.get('/staff/patient-reliability', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email,
             COALESCE(pp.reliability_score, 0) AS reliability_score,
             COUNT(CASE WHEN a.status = 'Completed' THEN 1 END) AS completed_count,
             COUNT(CASE WHEN a.status = 'No-show'   THEN 1 END) AS noshow_count,
             COUNT(CASE WHEN a.status LIKE 'Cancelled%' THEN 1 END) AS cancelled_count
      FROM users u
      LEFT JOIN patient_profiles pp ON pp.user_id = u.id
      LEFT JOIN appointments a ON a.patient_id = u.id
      WHERE u.role = 'Patient'
      GROUP BY u.id, u.first_name, u.last_name, u.email, pp.reliability_score
      ORDER BY pp.reliability_score DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── STAFF PROFILE SYNC ──────────────────────────────────────────────────────

// GET /staff/profile — Get current staff member's profile (from database)
app.get('/staff/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
        sp.position, sp.department, sp.hire_date, sp.work_schedule,
        sp.address, sp.date_of_birth, sp.emergency_contact_name,
        sp.emergency_contact_phone, sp.bio, sp.status,
        sp.created_at, sp.updated_at
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'Staff'
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Staff profile not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Staff profile fetch error:', err.message);
    res.status(500).json({ message: 'Failed to load staff profile.' });
  }
});

// PUT /staff/profile — Update staff member's profile (sync to database)
app.put('/staff/profile', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  const {
    phone, position, department, hire_date, work_schedule,
    address, date_of_birth, emergency_contact_name,
    emergency_contact_phone, bio, status
  } = req.body;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update users table (basic info)
    if (phone !== undefined) {
      await client.query(
        'UPDATE users SET phone = $1 WHERE id = $2',
        [phone?.trim() || null, req.user.id]
      );
    }

    // Ensure staff_profiles record exists
    const profileExists = await client.query(
      'SELECT id FROM staff_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileExists.rows.length === 0) {
      // Create new staff profile
      await client.query(
        `INSERT INTO staff_profiles (user_id, position, department, hire_date, work_schedule, address, date_of_birth, emergency_contact_name, emergency_contact_phone, bio, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.user.id,
          position || 'Front Desk Staff',
          department || 'Administration',
          hire_date || null,
          work_schedule || 'Mon – Fri · 8:00 AM – 5:00 PM',
          address || null,
          date_of_birth || null,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          bio || null,
          status || 'Active'
        ]
      );
    } else {
      // Update existing staff profile
      await client.query(
        `UPDATE staff_profiles SET
           position = COALESCE($1, position),
           department = COALESCE($2, department),
           hire_date = COALESCE($3, hire_date),
           work_schedule = COALESCE($4, work_schedule),
           address = COALESCE($5, address),
           date_of_birth = COALESCE($6, date_of_birth),
           emergency_contact_name = COALESCE($7, emergency_contact_name),
           emergency_contact_phone = COALESCE($8, emergency_contact_phone),
           bio = COALESCE($9, bio),
           status = COALESCE($10, status),
           updated_at = NOW()
         WHERE user_id = $11`,
        [
          position || null,
          department || null,
          hire_date || null,
          work_schedule || null,
          address || null,
          date_of_birth || null,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          bio || null,
          status || null,
          req.user.id
        ]
      );
    }

    await client.query('COMMIT');

    // Return updated profile
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
        sp.position, sp.department, sp.hire_date, sp.work_schedule,
        sp.address, sp.date_of_birth, sp.emergency_contact_name,
        sp.emergency_contact_phone, sp.bio, sp.status,
        sp.created_at, sp.updated_at
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1
    `, [req.user.id]);

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Staff profile update error:', err.message);
    res.status(500).json({ message: 'Failed to update staff profile.' });
  } finally {
    client.release();
  }
});

// GET /staff/all — Get all staff members (for admin/management view)
app.get('/staff/all', authMiddleware, async (req, res) => {
  if (!['Staff', 'Dentist'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    const result = await db.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
        sp.position, sp.department, sp.hire_date, sp.work_schedule, sp.status AS profile_status,
        COUNT(DISTINCT a.id) AS total_appointments_handled
      FROM users u
      LEFT JOIN staff_profiles sp ON sp.user_id = u.id
      LEFT JOIN appointments a ON a.dentist_id = u.id OR (a.patient_id IS NULL AND a.created_at IS NOT NULL)
      WHERE u.role = 'Staff'
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.phone, u.status,
               sp.position, sp.department, sp.hire_date, sp.work_schedule, sp.status
      ORDER BY u.first_name, u.last_name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Staff list fetch error:', err.message);
    res.status(500).json({ message: 'Failed to load staff list.' });
  }
});

// ─── ADMIN: CREATE STAFF / DENTIST ACCOUNTS ──────────────────────────────────

// POST /admin/create-account — Admin creates Staff or Dentist accounts
// Only accessible with a valid Admin (dentist) JWT token
app.post('/admin/create-account', authMiddleware, async (req, res) => {
  // Only Dentist role can create staff/dentist accounts
  if (req.user.role !== 'Dentist') {
    return res.status(403).json({ message: 'Only administrators can create staff accounts.' });
  }

  const { first_name, last_name, email, phone, role, password } = req.body;

  if (!first_name || !last_name || !email || !role || !password) {
    return res.status(400).json({ message: 'First name, last name, email, role, and password are required.' });
  }

  if (!['Staff', 'Dentist'].includes(role)) {
    return res.status(400).json({ message: 'Role must be Staff or Dentist.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query('SELECT 1 FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
      [first_name.trim(), last_name.trim(), email.trim().toLowerCase(),
       phone?.trim() || null, hashed, role]
    );

    await client.query('COMMIT');

    // Send welcome email (non-blocking)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const loginUrl = `${baseUrl}/login`;
    const roleLabel = role === 'Dentist' ? 'Dentist' : 'Staff';

    const html = `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#edf5ff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#edf5ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,70,120,0.12);">
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:5px;"></td></tr>
        <tr><td align="center" style="padding:32px 32px 0;">
          <span style="font-size:18px;font-weight:900;letter-spacing:0.12em;color:#0e2742;text-transform:uppercase;">&#129463; Code Smiles</span>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 8px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0e2742;">Welcome to Code Smiles!</h1>
          <p style="margin:10px 0 0;font-size:15px;color:#5a7a9a;line-height:1.6;">
            Hi <strong style="color:#0e2742;">${first_name}</strong>,<br/>
            Your <strong>${roleLabel}</strong> account has been created by an administrator.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:16px 0;"></div></td></tr>
        <tr><td style="padding:0 32px 16px;">
          <div style="background:#f0f7ff;border:1px solid rgba(27,103,170,0.14);border-radius:12px;padding:14px 20px;">
            <p style="margin:0;font-size:13px;color:#5a7a9a;line-height:1.8;">
              <strong style="color:#0e2742;">Email:</strong> ${email}<br/>
              <strong style="color:#0e2742;">Role:</strong> ${roleLabel}<br/>
              <strong style="color:#0e2742;">Portal:</strong> ${roleLabel === 'Staff' ? 'Staff Portal' : 'Dentist Portal'}
            </p>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 24px;">
          <a href="${loginUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#0e2742 0%,#1b67a9 52%,#46b3ff 100%);color:#fff;font-size:15px;font-weight:800;text-decoration:none;border-radius:999px;">
            Sign In to Your Portal
          </a>
        </td></tr>
        <tr><td style="padding:0 32px;"><div style="height:1px;background:rgba(20,70,120,0.08);margin:0 0 16px;"></div></td></tr>
        <tr><td align="center" style="padding:0 32px 28px;">
          <p style="margin:0;font-size:12px;color:#a0b4c8;">
            Code Smiles Dental Clinic &bull; USTP Villanueva Campus<br/>
            &copy; ${new Date().getFullYear()} Code Smiles. All rights reserved.
          </p>
        </td></tr>
        <tr><td style="background:linear-gradient(90deg,#0e2742 0%,#1b67a9 54%,#46b3ff 100%);height:3px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    sendVerificationEmail(email.trim(), first_name, null)
      .catch(() => {}); // ignore — use a simpler direct send below

    const mailOpts = {
      from:    `"Code Smiles Dental" <${process.env.EMAIL_USER || 'noreply@codesmiles.com'}>`,
      to:      email.trim(),
      subject: `Your Code Smiles ${roleLabel} Account`,
      html,
    };

    if (process.env.EMAIL_PREVIEW === 'true') {
      console.log(`[Email] New ${roleLabel} account created: ${email}`);
    } else {
      getTransporter().then(t => t.sendMail(mailOpts)).catch(err =>
        console.error('[Email] Welcome email failed:', err.message)
      );
    }

    res.status(201).json({
      message: `${roleLabel} account created successfully.`,
      id: result.rows[0].id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create account error:', err.message);
    res.status(500).json({ message: 'Server error. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /admin/staff-accounts — list all Staff and Dentist accounts
app.get('/admin/staff-accounts', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Dentist') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, role, status, created_at
       FROM users WHERE role IN ('Staff', 'Admin') ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

// Mount scheduling API routes
const schedulingRouter = require('./scheduling-api');
app.use('/api/scheduling', schedulingRouter);

// Mount composite booking API routes
const compositeBookingRouter = require('./composite-booking-api');
app.use('/api/composite-booking', compositeBookingRouter);

async function startServer() {
  try {
    // ── Run auth column migrations synchronously before accepting requests ──
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128)`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128)`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP`);
    await db.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_3h_sent  BOOLEAN NOT NULL DEFAULT FALSE`);
    await db.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(20) DEFAULT 'Not Confirmed'`);
    await db.query(`ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS reliability_score INTEGER NOT NULL DEFAULT 0`);

    // ── Mark all Staff/Admin accounts as verified (they bypass email verification) ──
    await db.query(`UPDATE users SET is_verified = TRUE WHERE role IN ('Staff', 'Admin')`);

    // ── Mark pre-existing patient accounts as verified ──────────────────────
    // Patients who registered BEFORE the verification system was added have
    // is_verified = FALSE but no verification_token — they should be allowed in.
    await db.query(`
      UPDATE users
      SET is_verified = TRUE
      WHERE role = 'Patient'
        AND is_verified = FALSE
        AND verification_token IS NULL
    `);

    console.log('[Startup] ✓ Database migrations complete');

    // ═══════════════════════════════════════════════════════════════════════════════
    // UNIFIED BOOKING ENDPOINT
    // Handles both single and multiple appointments with atomic transactions
    // ═══════════════════════════════════════════════════════════════════════════════
    
    const { UnifiedBookingManager } = require('./unified-booking-service');

    app.post('/api/bookings/create', bookingLimiter, async (req, res) => {
      console.log('=== UNIFIED BOOKING REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));

      try {
        const result = await UnifiedBookingManager.createBooking(req.body);

        if (result.success) {
          console.log('[UnifiedBooking] Success:', result.message);
          return res.status(201).json(result);
        } else {
          console.log('[UnifiedBooking] Validation failed:', result.errors);
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error('[UnifiedBooking] Unexpected error:', error.message);
        return res.status(500).json({
          success: false,
          message: 'An unexpected error occurred',
          errors: [error.message]
        });
      }
    });

    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000');
      startScheduler();
    });
  } catch (err) {
    console.error('[Startup] Migration failed:', err.message);
    process.exit(1);
  }
}

startServer();
