/**
 * Unified Booking Service
 * 
 * Handles both single and multiple appointment bookings with:
 * - Atomic transactions (all or nothing)
 * - Consistent validation
 * - Unified error handling
 * - Confirmation emails for all bookings
 */

const pool = require('./db');
const nodemailer = require('nodemailer');
const { AvailabilityCalculator } = require('./scheduling-engine');

// Email transporter (reuse existing configuration)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Validation Service
 * Comprehensive validation for all booking types
 */
class UnifiedBookingValidator {
  static validateRequiredFields(data) {
    const errors = [];

    if (!data.full_name || !data.full_name.trim()) {
      errors.push('Patient name is required');
    }

    if (!data.phone || !data.phone.trim()) {
      errors.push('Phone number is required');
    }

    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    }

    if (!data.treatment && (!data.services || data.services.length === 0)) {
      errors.push('At least one service is required');
    }

    if (!data.appointment_date || !data.appointment_date.trim()) {
      errors.push('Appointment date is required');
    }

    if (!data.appointment_time || !data.appointment_time.trim()) {
      errors.push('Appointment time is required');
    }

    return errors;
  }

  static validateFormats(data) {
    const errors = [];

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.appointment_date?.trim())) {
      errors.push('Date must be in YYYY-MM-DD format');
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(data.appointment_time?.trim())) {
      errors.push('Time must be in HH:MM format');
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email?.trim())) {
      errors.push('Invalid email format');
    }

    // Validate phone format (at least 10 digits)
    if (!/^\d{10,}$/.test(data.phone?.trim().replace(/\D/g, ''))) {
      errors.push('Phone number must contain at least 10 digits');
    }

    return errors;
  }

  static validateBusinessRules(data) {
    const errors = [];

    // Validate date is not in past
    const bookingDate = new Date(data.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      errors.push('Appointment date cannot be in the past');
    }

    // Validate time is within clinic hours
    const [hours, minutes] = data.appointment_time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    // Clinic hours: 8:30 AM (510 min) to 8:30 PM (1050 min)
    if (timeInMinutes < 510 || timeInMinutes > 1050) {
      errors.push('Appointment time must be between 8:30 AM and 8:30 PM');
    }

    // Validate lunch break (12:00 PM - 1:00 PM)
    if (timeInMinutes >= 720 && timeInMinutes < 780) {
      errors.push('Clinic is closed for lunch 12:00 PM - 1:00 PM');
    }

    // Validate age if provided
    if (data.age && (data.age < 1 || data.age > 120)) {
      errors.push('Age must be between 1 and 120');
    }

    // Validate duration if provided
    if (data.duration_minutes && (data.duration_minutes < 15 || data.duration_minutes > 120)) {
      errors.push('Duration must be between 15 and 120 minutes');
    }

    return errors;
  }

  static async validateAvailability(data, client) {
    const errors = [];

    // Check if time slot is available
    const result = await client.query(
      `SELECT COUNT(*) as count FROM appointments 
       WHERE appointment_date = $1 
       AND appointment_time = $2 
       AND status IN ('Approved', 'Pending', 'Walk-in')`,
      [data.appointment_date, data.appointment_time]
    );

    if (result.rows[0].count > 0) {
      errors.push('This time slot is already booked');
    }

    return errors;
  }

  static async validateAll(data, client) {
    const allErrors = [];

    // Required fields
    allErrors.push(...this.validateRequiredFields(data));

    // Format validation
    allErrors.push(...this.validateFormats(data));

    // Business rules
    allErrors.push(...this.validateBusinessRules(data));

    // Availability (requires database)
    if (client) {
      allErrors.push(...await this.validateAvailability(data, client));
    }

    return allErrors;
  }
}

/**
 * Unified Booking Manager
 * Handles creation of single and multiple bookings atomically
 */
class UnifiedBookingManager {
  /**
   * Create a booking (single or multiple)
   * 
   * @param {Object} bookingData - Booking information
   * @param {string} bookingData.full_name - Patient name
   * @param {string} bookingData.email - Patient email
   * @param {string} bookingData.phone - Patient phone
   * @param {string} bookingData.treatment - Single service name (for single booking)
   * @param {Array} bookingData.services - Multiple services (for multi booking)
   * @param {string} bookingData.appointment_date - Appointment date (YYYY-MM-DD)
   * @param {string} bookingData.appointment_time - Appointment time (HH:MM)
   * @param {number} bookingData.duration_minutes - Duration in minutes
   * @param {string} bookingData.booking_type - 'Walk-in' or 'Registered patient'
   * @param {string} bookingData.notes - Additional notes
   * @param {number} bookingData.patient_id - Patient ID (optional)
   * 
   * @returns {Promise<Object>} Booking result with confirmation details
   */
  static async createBooking(bookingData) {
    const client = await pool.connect();

    try {
      // ── VALIDATION ─────────────────────────────────────────────────────────
      console.log('[UnifiedBooking] Validating booking data...');
      const validationErrors = await UnifiedBookingValidator.validateAll(bookingData, client);

      if (validationErrors.length > 0) {
        console.log('[UnifiedBooking] Validation errors:', validationErrors);
        return {
          success: false,
          errors: validationErrors,
          message: validationErrors[0]
        };
      }

      // ── BEGIN TRANSACTION ──────────────────────────────────────────────────
      console.log('[UnifiedBooking] Starting transaction...');
      await client.query('BEGIN');

      // Detect if single or multiple booking
      const isSingleBooking = !bookingData.services || bookingData.services.length === 0;
      const appointmentIds = [];

      if (isSingleBooking) {
        // ── SINGLE BOOKING ─────────────────────────────────────────────────
        console.log('[UnifiedBooking] Creating single appointment...');
        const appointmentId = await this.createSingleAppointment(
          bookingData,
          client
        );
        appointmentIds.push(appointmentId);
      } else {
        // ── MULTIPLE BOOKING ───────────────────────────────────────────────
        console.log('[UnifiedBooking] Creating multiple appointments...');
        const ids = await this.createMultipleAppointments(
          bookingData,
          client
        );
        appointmentIds.push(...ids);
      }

      // ── CREATE NOTIFICATIONS ──────────────────────────────────────────────
      console.log('[UnifiedBooking] Creating notifications...');
      for (const appointmentId of appointmentIds) {
        const appt = await client.query(
          'SELECT patient_id FROM appointments WHERE id = $1',
          [appointmentId]
        );

        if (appt.rows[0]?.patient_id) {
          await client.query(
            `INSERT INTO notifications (user_id, title, detail, level) 
             VALUES ($1, $2, $3, 'Update')`,
            [
              appt.rows[0].patient_id,
              'Appointment Booked',
              `Your appointment has been successfully booked. Status: ${bookingData.booking_type === 'Walk-in' ? 'Approved' : 'Pending'}`
            ]
          );
        }
      }

      // ── COMMIT TRANSACTION ─────────────────────────────────────────────────
      console.log('[UnifiedBooking] Committing transaction...');
      await client.query('COMMIT');

      // ── SEND CONFIRMATION EMAIL (ASYNC) ────────────────────────────────────
      console.log('[UnifiedBooking] Sending confirmation email...');
      setImmediate(() => {
        this.sendConfirmationEmail(bookingData, appointmentIds).catch(err => {
          console.error('[UnifiedBooking] Email error:', err.message);
        });
      });

      // ── RETURN SUCCESS ─────────────────────────────────────────────────────
      return {
        success: true,
        message: `${appointmentIds.length} appointment(s) booked successfully`,
        appointmentIds,
        status: bookingData.booking_type === 'Walk-in' ? 'Approved' : 'Pending',
        confirmationSent: true
      };
    } catch (error) {
      // ── ROLLBACK ON ERROR ──────────────────────────────────────────────────
      console.error('[UnifiedBooking] Error, rolling back:', error.message);
      await client.query('ROLLBACK');

      return {
        success: false,
        message: error.message,
        errors: [error.message]
      };
    } finally {
      client.release();
    }
  }

  /**
   * Create a single appointment
   */
  static async createSingleAppointment(bookingData, client) {
    const {
      full_name,
      email,
      phone,
      treatment,
      appointment_date,
      appointment_time,
      duration_minutes = 45,
      booking_type = 'Registered patient',
      notes = '',
      patient_id = null
    } = bookingData;

    // Determine initial status
    const status = booking_type === 'Walk-in' ? 'Approved' : 'Pending';

    // Insert appointment
    const result = await client.query(
      `INSERT INTO appointments (
        patient_id, patient_name, email, phone, treatment, 
        appointment_date, appointment_time, duration_minutes, 
        status, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id`,
      [
        patient_id,
        full_name,
        email,
        phone,
        treatment,
        appointment_date,
        appointment_time,
        duration_minutes,
        status,
        notes
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Create multiple appointments (atomic)
   */
  static async createMultipleAppointments(bookingData, client) {
    const {
      full_name,
      email,
      phone,
      services,
      appointments,
      booking_type = 'Registered patient',
      notes = '',
      patient_id = null
    } = bookingData;

    const appointmentIds = [];
    const status = booking_type === 'Walk-in' ? 'Approved' : 'Pending';

    // Create an appointment for each service
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const appointment = appointments[i];

      // Validate appointment data exists
      if (!appointment || !appointment.date || !appointment.time) {
        throw new Error(`Missing appointment details for service ${i + 1}`);
      }

      // Check availability for this slot
      const availCheck = await client.query(
        `SELECT COUNT(*) as count FROM appointments 
         WHERE appointment_date = $1 
         AND appointment_time = $2 
         AND status IN ('Approved', 'Pending', 'Walk-in')`,
        [appointment.date, appointment.time]
      );

      if (availCheck.rows[0].count > 0) {
        throw new Error(`Time slot ${appointment.time} on ${appointment.date} is not available`);
      }

      // Insert appointment
      const result = await client.query(
        `INSERT INTO appointments (
          patient_id, patient_name, email, phone, treatment, 
          appointment_date, appointment_time, duration_minutes, 
          status, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id`,
        [
          patient_id,
          full_name,
          email,
          phone,
          service.name || service,
          appointment.date,
          appointment.time,
          service.duration || 45,
          status,
          notes
        ]
      );

      appointmentIds.push(result.rows[0].id);
    }

    return appointmentIds;
  }

  /**
   * Send confirmation email
   */
  static async sendConfirmationEmail(bookingData, appointmentIds) {
    const { full_name, email, appointment_date, appointment_time, treatment, services } = bookingData;

    const isSingleBooking = !services || services.length === 0;
    const servicesList = isSingleBooking
      ? treatment
      : services.map(s => s.name || s).join(', ');

    const emailContent = `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${full_name},</p>
      <p>Your appointment has been successfully booked!</p>
      
      <h3>Appointment Details:</h3>
      <ul>
        <li><strong>Service(s):</strong> ${servicesList}</li>
        <li><strong>Date:</strong> ${appointment_date}</li>
        <li><strong>Time:</strong> ${appointment_time}</li>
        <li><strong>Status:</strong> ${bookingData.booking_type === 'Walk-in' ? 'Approved' : 'Pending'}</li>
      </ul>
      
      <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
      <p>Thank you for choosing our clinic!</p>
    `;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Appointment Confirmation - Code Smiles Dental',
        html: emailContent
      });
      console.log('[UnifiedBooking] Confirmation email sent to:', email);
    } catch (error) {
      console.error('[UnifiedBooking] Failed to send email:', error.message);
      // Don't throw - email failure shouldn't fail the booking
    }
  }
}

module.exports = {
  UnifiedBookingValidator,
  UnifiedBookingManager
};
