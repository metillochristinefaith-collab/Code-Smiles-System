/**
 * scheduler.js — Code Smiles Automated Reminder & No-Show Detection
 *
 * Runs three jobs on a timer:
 *  1. 24-hour reminder  — fires every 10 minutes, checks for appointments tomorrow
 *  2. 3-hour reminder   — fires every 5 minutes, checks for appointments in ~3 hours
 *  3. No-show detector  — fires every 5 minutes, marks missed appointments
 *
 * All jobs use the database as the source of truth.
 * Duplicate prevention: reminder_24h_sent / reminder_3h_sent flags on appointments.
 */

const db = require('./db');

// ── Helpers ────────────────────────────────────────────────────────────────────

function nowPH() {
  // Use server local time (adjust if server is not in PH timezone)
  return new Date();
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function toTimeStr(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

async function insertNotification(client, userId, title, detail, level = 'New', appointmentId = null) {
  if (appointmentId) {
    // Ensure appointment_id column exists (safe to run repeatedly)
    await client.query(
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL`
    ).catch(() => {});
    await client.query(
      `INSERT INTO notifications (user_id, title, detail, level, appointment_id) VALUES ($1, $2, $3, $4, $5)`,
      [userId, title, detail, level, appointmentId]
    );
  } else {
    await client.query(
      `INSERT INTO notifications (user_id, title, detail, level) VALUES ($1, $2, $3, $4)`,
      [userId, title, detail, level]
    );
  }
}

// ── Job 1: 24-Hour Reminder ────────────────────────────────────────────────────

async function send24HourReminders() {
  const now = nowPH();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  // Find approved appointments tomorrow that haven't had a 24h reminder yet
  const result = await db.query(`
    SELECT a.id, a.patient_id, a.patient_name, a.treatment,
           a.appointment_date, TO_CHAR(a.appointment_time, 'HH24:MI') AS appointment_time,
           a.dentist_name
    FROM appointments a
    WHERE a.status = 'Approved'
      AND a.appointment_date = $1
      AND a.reminder_24h_sent = FALSE
      AND a.patient_id IS NOT NULL
  `, [tomorrowStr]);

  if (result.rowCount === 0) return;

  console.log(`[Scheduler] 24h reminders: ${result.rowCount} appointment(s) to notify`);

  for (const appt of result.rows) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      await insertNotification(
        client,
        appt.patient_id,
        '📅 Appointment Reminder — Tomorrow',
        `Reminder: You have a ${appt.treatment} appointment tomorrow (${formatDate(appt.appointment_date)}) at ${formatTime(appt.appointment_time)} with ${appt.dentist_name || 'your dentist'}. Please confirm your attendance or contact us if you cannot make it.`,
        'New',
        appt.id
      );

      await client.query(
        `UPDATE appointments SET reminder_24h_sent = TRUE, updated_at = NOW() WHERE id = $1`,
        [appt.id]
      );

      await client.query('COMMIT');
      console.log(`  ✓ 24h reminder sent → patient_id ${appt.patient_id} (appt #${appt.id})`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ 24h reminder failed for appt #${appt.id}:`, err.message);
    } finally {
      client.release();
    }
  }
}

// ── Job 2: 3-Hour Reminder ─────────────────────────────────────────────────────

async function send3HourReminders() {
  const now = nowPH();
  const todayStr = toDateStr(now);

  // Window: appointments starting between now+2h45m and now+3h15m (30-min window)
  const windowStart = new Date(now.getTime() + (2 * 60 + 45) * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + (3 * 60 + 15) * 60 * 1000);
  const wsTime = toTimeStr(windowStart);
  const weTime = toTimeStr(windowEnd);

  const result = await db.query(`
    SELECT a.id, a.patient_id, a.patient_name, a.treatment,
           a.appointment_date, TO_CHAR(a.appointment_time, 'HH24:MI') AS appointment_time,
           a.dentist_name
    FROM appointments a
    WHERE a.status = 'Approved'
      AND a.appointment_date = $1
      AND a.appointment_time BETWEEN $2::TIME AND $3::TIME
      AND a.reminder_3h_sent = FALSE
      AND a.patient_id IS NOT NULL
  `, [todayStr, wsTime, weTime]);

  if (result.rowCount === 0) return;

  console.log(`[Scheduler] 3h reminders: ${result.rowCount} appointment(s) to notify`);

  for (const appt of result.rows) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      await insertNotification(
        client,
        appt.patient_id,
        '⏰ Appointment in 3 Hours',
        `Your ${appt.treatment} appointment is in about 3 hours at ${formatTime(appt.appointment_time)} with ${appt.dentist_name || 'your dentist'}. Please be on time or inform us if you cannot attend.`,
        'New',
        appt.id
      );

      await client.query(
        `UPDATE appointments SET reminder_3h_sent = TRUE, updated_at = NOW() WHERE id = $1`,
        [appt.id]
      );

      await client.query('COMMIT');
      console.log(`  ✓ 3h reminder sent → patient_id ${appt.patient_id} (appt #${appt.id})`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ 3h reminder failed for appt #${appt.id}:`, err.message);
    } finally {
      client.release();
    }
  }
}

// ── Job 3: No-Show Auto-Detection ─────────────────────────────────────────────

async function detectNoShows() {
  const now = nowPH();
  const todayStr = toDateStr(now);
  const GRACE_MINUTES = 20; // mark no-show 20 min after appointment end

  // Find approved appointments today that ended more than GRACE_MINUTES ago
  const result = await db.query(`
    SELECT a.id, a.patient_id, a.patient_name, a.treatment,
           a.appointment_date, TO_CHAR(a.appointment_time, 'HH24:MI') AS appointment_time,
           a.duration_minutes, a.dentist_name
    FROM appointments a
    WHERE a.status = 'Approved'
      AND a.appointment_date = $1
      AND a.patient_id IS NOT NULL
  `, [todayStr]);

  if (result.rowCount === 0) return;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const appt of result.rows) {
    const [h, m] = appt.appointment_time.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const endMinutes   = startMinutes + (appt.duration_minutes || 60) + GRACE_MINUTES;

    if (nowMinutes < endMinutes) continue; // Not past grace period yet

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Mark as No-show
      await client.query(
        `UPDATE appointments SET status = 'No-show', updated_at = NOW() WHERE id = $1`,
        [appt.id]
      );

      // Notify patient
      await insertNotification(
        client,
        appt.patient_id,
        '⚠️ Missed Appointment',
        `You were marked as a no-show for your ${appt.treatment} appointment on ${formatDate(appt.appointment_date)} at ${formatTime(appt.appointment_time)}. Please contact the clinic to reschedule.`,
        'Warning'
      );

      // Notify all staff
      const staffUsers = await client.query(`SELECT id FROM users WHERE role = 'Staff'`);
      for (const staff of staffUsers.rows) {
        await insertNotification(
          client,
          staff.id,
          '🚫 Patient No-Show',
          `${appt.patient_name} did not attend their ${appt.treatment} appointment on ${formatDate(appt.appointment_date)} at ${formatTime(appt.appointment_time)}.`,
          'Warning'
        );
      }

      // Decrease reliability score (-2 for no-show)
      if (appt.patient_id) {
        await client.query(`
          UPDATE patient_profiles
          SET reliability_score = GREATEST(reliability_score - 2, -20)
          WHERE user_id = $1
        `, [appt.patient_id]);
      }

      await client.query('COMMIT');
      console.log(`[Scheduler] No-show detected: appt #${appt.id} — ${appt.patient_name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[Scheduler] No-show detection failed for appt #${appt.id}:`, err.message);
    } finally {
      client.release();
    }
  }
}

// ── Job 4: Reliability Score — Completed Appointments ─────────────────────────
// Runs once per minute; finds newly completed appointments and awards +1

async function updateReliabilityOnCompletion() {
  // Find appointments completed today that haven't had reliability updated
  // We use a simple heuristic: completed appointments where patient_id exists
  // and reliability hasn't been bumped (we track this via a flag we'll add)
  // For simplicity: find Completed appointments updated in the last 2 minutes
  const result = await db.query(`
    SELECT a.patient_id
    FROM appointments a
    WHERE a.status = 'Completed'
      AND a.patient_id IS NOT NULL
      AND a.updated_at >= NOW() - INTERVAL '2 minutes'
  `);

  for (const row of result.rows) {
    await db.query(`
      UPDATE patient_profiles
      SET reliability_score = LEAST(reliability_score + 1, 20)
      WHERE user_id = $1
    `, [row.patient_id]);
  }
}

// ── Start all schedulers ───────────────────────────────────────────────────────

function startScheduler() {
  console.log('[Scheduler] Starting automated reminder & no-show detection...');

  // 24-hour reminders — check every 10 minutes
  send24HourReminders();
  setInterval(send24HourReminders, 10 * 60 * 1000);

  // 3-hour reminders — check every 5 minutes
  send3HourReminders();
  setInterval(send3HourReminders, 5 * 60 * 1000);

  // No-show detection — check every 5 minutes
  detectNoShows();
  setInterval(detectNoShows, 5 * 60 * 1000);

  // Reliability score updates — check every 2 minutes
  setInterval(updateReliabilityOnCompletion, 2 * 60 * 1000);

  console.log('[Scheduler] ✓ All jobs running');
}

module.exports = { startScheduler };
