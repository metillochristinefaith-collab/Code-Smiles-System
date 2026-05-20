/**
 * setup-help-center.js
 * Run once to create FAQ and support_requests tables and seed FAQ data.
 * Command: node setup-help-center.js
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function run() {
  const db = new Client({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await db.connect();
  console.log('Connected to database:', process.env.DB_NAME);

  // ── Create tables ──────────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS faqs (
      id          SERIAL PRIMARY KEY,
      question    TEXT         NOT NULL,
      answer      TEXT         NOT NULL,
      category    VARCHAR(60)  NOT NULL DEFAULT 'General',
      role        VARCHAR(20)  NOT NULL DEFAULT 'Patient'
                               CHECK (role IN ('Patient','Staff','Admin')),
      sort_order  INTEGER      NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ faqs table ready');

  await db.query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
      user_name  VARCHAR(200),
      user_email VARCHAR(255),
      user_role  VARCHAR(20),
      subject    VARCHAR(255) NOT NULL,
      message    TEXT         NOT NULL,
      status     VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                              CHECK (status IN ('Pending','In Progress','Resolved')),
      created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✓ support_requests table ready');

  // ── Seed FAQs only if table is empty ──────────────────────────────────────
  const count = await db.query('SELECT COUNT(*) FROM faqs');
  if (parseInt(count.rows[0].count) > 0) {
    console.log(`ℹ  FAQs already seeded (${count.rows[0].count} rows). Skipping.`);
    await db.end();
    return;
  }

  const faqs = [
    // ── Patient FAQs ──────────────────────────────────────────────────────
    ['How do I book an appointment?',
     'Click "Book Appointment" in the sidebar, choose your service category, pick a date and time, fill in your details, then submit. You will be notified once the clinic confirms.',
     'Appointments', 'Patient', 1],

    ['How do I reschedule or cancel my appointment?',
     'Go to My Appointments, find the visit you want to change, and click "Request Reschedule" or "Cancel Appointment". The clinic will review your request.',
     'Appointments', 'Patient', 2],

    ['How will I know if my appointment is confirmed?',
     'You will receive a notification in the Notifications section once the clinic approves or updates your booking.',
     'Appointments', 'Patient', 3],

    ['How do I upload my insurance card or dental records?',
     'Open Medical Vault from the sidebar and click "Upload Document". You can upload X-rays, prescriptions, insurance cards, and more.',
     'Medical Records', 'Patient', 4],

    ['Where can I view my treatment plan?',
     'Open Treatment Progress from the sidebar to check your current care plan, milestones, and upcoming sessions.',
     'Medical Records', 'Patient', 5],

    ['How do I update my personal information?',
     'Open Profile from the sidebar and click "Edit Profile" to update your name, phone number, and other saved details.',
     'Account', 'Patient', 6],

    ['I forgot my password. What should I do?',
     'On the login page, click "Forgot Password" and follow the instructions sent to your registered email address.',
     'Account', 'Patient', 7],

    ['Why can I not log in to my account?',
     'Make sure you are using the correct email and password. If the problem continues, use "Forgot Password" or contact the clinic.',
     'Technical', 'Patient', 8],

    // ── Staff FAQs ────────────────────────────────────────────────────────
    ['How do I approve or reject a booking request?',
     'Open Requests, review the patient details and appointment info, then click "Review & Approve", "Reschedule", or "Reject".',
     'Appointments', 'Staff', 1],

    ['When should I reschedule instead of rejecting?',
     'Reschedule when the patient request is valid but the preferred time or dentist availability needs adjustment.',
     'Appointments', 'Staff', 2],

    ['How do I block availability in the calendar?',
     'Open Calendar and add a blocked slot for maintenance, provider breaks, or unavailable time windows.',
     'Scheduling', 'Staff', 3],

    ['Where can I check a patient record?',
     'Use the Patients section to find any patient and review their appointments, profile, and history.',
     'Patients', 'Staff', 4],

    ['How do I record a payment?',
     'Open Billing, find the invoice, click the record icon, enter the amount and payment method, then confirm.',
     'Billing', 'Staff', 5],

    ['What should I do when a warning alert appears?',
     'Review the notification details, confirm the schedule or request, and update the related appointment before notifying the patient.',
     'Technical', 'Staff', 6],

    // ── Dentist (Admin) FAQs ──────────────────────────────────────────────
    ['Where can I review my appointments?',
     'Open My Appointments or Schedule to review assigned visits, appointment status, and daily patient flow.',
     'Appointments', 'Admin', 1],

    ['How do I check a patient record?',
     'Open My Patients, select the patient, then review their medical records, appointments, and treatment notes.',
     'Patients', 'Admin', 2],

    ['Where do I manage treatment plans?',
     'Use Treatment Plans to review, update, and track active patient care plans and session milestones.',
     'Treatment', 'Admin', 3],

    ['How do I issue a prescription?',
     'Open Prescriptions, click "New Prescription", fill in the patient, medication, dosage, and instructions, then save.',
     'Treatment', 'Admin', 4],

    ['How do I handle clinical notifications?',
     'Open Notifications, review the alert details, and update the related appointment or patient record when needed.',
     'Technical', 'Admin', 5],

    ['How do I update my dentist profile?',
     'Open Profile or Settings to manage your account details, specialty, and portal preferences.',
     'Account', 'Admin', 6],
  ];

  for (const [question, answer, category, role, sort_order] of faqs) {
    await db.query(
      `INSERT INTO faqs (question, answer, category, role, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [question, answer, category, role, sort_order]
    );
  }

  console.log(`✓ Seeded ${faqs.length} FAQs`);
  await db.end();
  console.log('\n✅ Help Center setup complete! Restart your backend to activate the routes.');
}

run().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
