/**
 * Composite Booking Service
 * Handles multi-service booking with independent dentist assignment and scheduling
 * 
 * Key Features:
 * - Support for 1-3 services in a single booking session
 * - Independent dentist assignment per service
 * - Separate appointment scheduling for each service
 * - Unified booking ID with individual appointment IDs
 * - Conflict detection and resolution
 * - Audit trail for all booking changes
 */

const pool = require('./db');
const { findDentistForService, getServiceDuration, minutesToTime, timeToMinutes } = require('./scheduling-engine');

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE BOOKING ID GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

class CompositeBookingIdGenerator {
  /**
   * Generate unique composite booking ID
   * Format: CB-YYYY-MM-DD-XXXX (e.g., CB-2026-05-22-0001)
   */
  static async generateBookingId() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    try {
      // Get count of bookings created today
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM composite_bookings 
         WHERE DATE(created_at) = $1`,
        [today]
      );
      
      const count = parseInt(result.rows[0].count) + 1;
      const sequence = String(count).padStart(4, '0');
      
      return `CB-${today}-${sequence}`;
    } catch (error) {
      console.error('[CompositeBookingIdGenerator] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate unique appointment ID within composite booking
   * Format: CBA-YYYY-MM-DD-XXXX-YY (e.g., CBA-2026-05-22-0001-01)
   */
  static generateAppointmentId(bookingId, sequence) {
    // Extract date and sequence from booking ID
    // CB-2026-05-22-0001 → CBA-2026-05-22-0001-01
    const appointmentSequence = String(sequence).padStart(2, '0');
    return bookingId.replace('CB-', 'CBA-') + `-${appointmentSequence}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE BOOKING VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

class CompositeBookingValidator {
  /**
   * Validate composite booking request
   */
  static validateBookingRequest(request) {
    const errors = [];

    // Validate services array
    if (!Array.isArray(request.services) || request.services.length === 0) {
      errors.push('At least one service must be selected');
    }

    if (request.services.length > 3) {
      errors.push('Maximum 3 services allowed per booking');
    }

    // Validate each service
    request.services.forEach((service, index) => {
      if (!service.name || !service.category) {
        errors.push(`Service ${index + 1}: Missing name or category`);
      }
      if (!Number.isInteger(service.duration) || service.duration <= 0) {
        errors.push(`Service ${index + 1}: Invalid duration`);
      }
    });

    // Validate patient details
    if (!request.patientDetails) {
      errors.push('Patient details are required');
    } else {
      const { firstName, lastName, email, phone } = request.patientDetails;
      
      if (!firstName || !lastName) {
        errors.push('Patient first and last name are required');
      }
      
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email address is required');
      }
      
      if (!phone || !/^\d{10,}$/.test(phone.replace(/\D/g, ''))) {
        errors.push('Valid phone number is required');
      }
    }

    // Validate appointments array
    if (!Array.isArray(request.appointments) || request.appointments.length === 0) {
      errors.push('At least one appointment schedule is required');
    }

    if (request.appointments.length !== request.services.length) {
      errors.push('Number of appointments must match number of services');
    }

    // Validate each appointment
    request.appointments.forEach((apt, index) => {
      if (!apt.date || !/^\d{4}-\d{2}-\d{2}$/.test(apt.date)) {
        errors.push(`Appointment ${index + 1}: Invalid date format (YYYY-MM-DD)`);
      }
      
      if (!apt.time || !/^\d{2}:\d{2}$/.test(apt.time)) {
        errors.push(`Appointment ${index + 1}: Invalid time format (HH:MM)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate appointment doesn't conflict with existing bookings
   * IMPORTANT: Checks BOTH composite_booking_appointments AND regular appointments tables
   */
  static async validateAppointmentConflict(dentistId, appointmentDate, appointmentTime, durationMinutes) {
    try {
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const startMin = hours * 60 + minutes;
      const endMin = startMin + durationMinutes + 10; // 10-min buffer

      // Query 1: Check composite booking appointments
      const compositeResult = await pool.query(
        `SELECT cba.id, cba.appointment_time, cba.service_duration_minutes, 'composite' as source
         FROM composite_booking_appointments cba
         WHERE cba.dentist_id = $1 
           AND cba.appointment_date = $2
           AND cba.appointment_status IN ('Pending', 'Approved')
         ORDER BY cba.appointment_time ASC`,
        [dentistId, appointmentDate]
      );

      // Query 2: Check regular appointments table
      const regularResult = await pool.query(
        `SELECT a.id, a.appointment_time, a.duration_minutes, 'regular' as source
         FROM appointments a
         WHERE a.dentist_id = $1 
           AND a.appointment_date = $2
           AND a.status IN ('Pending', 'Approved', 'Confirmed')
         ORDER BY a.appointment_time ASC`,
        [dentistId, appointmentDate]
      );

      // Combine results
      const allAppointments = [...compositeResult.rows, ...regularResult.rows];

      // Check for overlaps
      for (const existing of allAppointments) {
        const [existHours, existMinutes] = existing.appointment_time.split(':').map(Number);
        const existStartMin = existHours * 60 + existMinutes;
        const durationField = existing.service_duration_minutes || existing.duration_minutes;
        const existEndMin = existStartMin + durationField + 10;

        // Check if time windows overlap
        if (!(endMin <= existStartMin || startMin >= existEndMin)) {
          return {
            hasConflict: true,
            conflictingAppointment: existing,
            message: `Conflict with existing ${existing.source} appointment at ${existing.appointment_time}`
          };
        }
      }

      return { hasConflict: false };
    } catch (error) {
      console.error('[CompositeBookingValidator] Conflict check error:', error.message);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE BOOKING MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class CompositeBookingManager {
  /**
   * Create a new composite booking with multiple services
   * 
   * Request structure:
   * {
   *   services: [
   *     { name: 'Dental Cleaning', category: 'General Dentistry', duration: 45 },
   *     { name: 'Teeth Whitening', category: 'Cosmetic Arts', duration: 60 }
   *   ],
   *   appointments: [
   *     { date: '2026-05-25', time: '09:00' },
   *     { date: '2026-05-25', time: '10:30' }
   *   ],
   *   patientDetails: {
   *     firstName: 'John',
   *     lastName: 'Doe',
   *     email: 'john@example.com',
   *     phone: '1234567890',
   *     age: 35,
   *     notes: 'First time patient'
   *   },
   *   bookingType: 'Patient',
   *   intakePriority: 'Standard',
   *   intakeSource: 'Online'
   * }
   */
  static async createCompositeBooking(request, userId) {
    const client = await pool.connect();
    
    try {
      // Use SERIALIZABLE isolation level to prevent race conditions
      // This ensures that concurrent requests cannot create conflicting bookings
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

      // 1. Validate request
      const validation = CompositeBookingValidator.validateBookingRequest(request);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // 2. Generate composite booking ID
      const bookingId = await CompositeBookingIdGenerator.generateBookingId();

      // 3. Calculate total duration
      const totalDuration = request.services.reduce((sum, service) => sum + service.duration, 0) + 
                           (request.services.length - 1) * 10; // Buffer between services

      // 4. Create composite booking record
      const bookingResult = await client.query(
        `INSERT INTO composite_bookings (
          booking_id, patient_id, patient_name, patient_email, patient_phone,
          booking_type, intake_priority, intake_source,
          service_count, total_duration_minutes,
          patient_notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, booking_id, created_at`,
        [
          bookingId,
          userId,
          `${request.patientDetails.firstName} ${request.patientDetails.lastName}`,
          request.patientDetails.email,
          request.patientDetails.phone,
          request.bookingType || 'Patient',
          request.intakePriority || 'Standard',
          request.intakeSource || 'Online',
          request.services.length,
          totalDuration,
          request.patientDetails.notes || '',
          userId
        ]
      );

      const compositeBookingId = bookingResult.rows[0].id;
      const appointments = [];

      // 5. Create individual appointments for each service
      for (let i = 0; i < request.services.length; i++) {
        const service = request.services[i];
        const appointment = request.appointments[i];
        const sequence = i + 1;

        // Validate appointment data exists
        if (!appointment || !appointment.date || !appointment.time) {
          throw new Error(`Missing date or time for service ${i + 1}: ${service.name}`);
        }

        // Find dentist for this service
        const dentistResult = await client.query(
          `SELECT d.dentist_id, u.first_name, u.last_name, d.specialization
           FROM service_dentist_mapping sdm
           JOIN dentist d ON sdm.dentist_id = d.dentist_id
           JOIN users u ON d.user_id = u.id
           WHERE LOWER(sdm.service_name) = LOWER($1) AND sdm.is_primary = TRUE AND sdm.is_active = TRUE
           LIMIT 1`,
          [service.name]
        );

        if (dentistResult.rowCount === 0) {
          throw new Error(`No dentist found for service: ${service.name}. Please check service name and dentist mapping.`);
        }

        const dentist = dentistResult.rows[0];
        console.log(`[CompositeBooking] Service "${service.name}" → Dentist: ${dentist.first_name} ${dentist.last_name} (ID: ${dentist.dentist_id})`);

        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) {
          throw new Error(`Invalid date format for ${service.name}. Use YYYY-MM-DD format.`);
        }

        // Validate time format (HH:MM)
        if (!/^\d{2}:\d{2}$/.test(appointment.time)) {
          throw new Error(`Invalid time format for ${service.name}. Use HH:MM format.`);
        }

        // Check for conflicts - this now checks BOTH tables
        const conflictCheck = await CompositeBookingValidator.validateAppointmentConflict(
          dentist.dentist_id,
          appointment.date,
          appointment.time,
          service.duration
        );

        if (conflictCheck.hasConflict) {
          throw new Error(`Scheduling conflict for ${service.name}: ${conflictCheck.message}`);
        }

        // Calculate end time
        const [hours, minutes] = appointment.time.split(':').map(Number);
        const startMin = hours * 60 + minutes;
        const endMin = startMin + service.duration;
        const endHours = Math.floor(endMin / 60);
        const endMinutes = endMin % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        // Validate end time doesn't exceed 24 hours
        if (endHours >= 24) {
          throw new Error(`Appointment for ${service.name} extends past midnight. Please select an earlier time.`);
        }

        // Generate appointment ID
        const appointmentId = CompositeBookingIdGenerator.generateAppointmentId(bookingId, sequence);

        // Create appointment record - EACH SERVICE GETS ITS OWN APPOINTMENT
        const aptResult = await client.query(
          `INSERT INTO composite_booking_appointments (
            appointment_id, composite_booking_id, booking_id,
            service_name, service_category, service_duration_minutes,
            dentist_id, dentist_name, dentist_specialty,
            appointment_date, appointment_time, appointment_end_time,
            appointment_status, appointment_sequence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id, appointment_id, appointment_date, appointment_time, appointment_end_time, service_name, dentist_name`,
          [
            appointmentId,
            compositeBookingId,
            bookingId,
            service.name,
            service.category,
            service.duration,
            dentist.dentist_id,
            `${dentist.first_name} ${dentist.last_name}`,
            dentist.specialization,
            appointment.date,
            appointment.time,
            endTime,
            'Pending',
            sequence
          ]
        );

        if (aptResult.rowCount === 0) {
          throw new Error(`Failed to create appointment for ${service.name}`);
        }

        appointments.push(aptResult.rows[0]);
      }

      // 6. Log audit trail
      await client.query(
        `INSERT INTO composite_booking_audit_log (composite_booking_id, action, action_by, action_details)
         VALUES ($1, $2, $3, $4)`,
        [
          compositeBookingId,
          'Created',
          userId,
          JSON.stringify({
            serviceCount: request.services.length,
            bookingType: request.bookingType,
            intakePriority: request.intakePriority
          })
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        compositeBooking: {
          id: compositeBookingId,
          bookingId: bookingResult.rows[0].booking_id,
          createdAt: bookingResult.rows[0].created_at,
          serviceCount: request.services.length,
          totalDuration: totalDuration,
          appointments
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[CompositeBookingManager] Error creating booking:', error.message);
      
      // Handle serialization failures gracefully
      if (error.code === '40001' || error.message.includes('serialization')) {
        throw new Error('Booking conflict detected. Please try again.');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get composite booking details with all appointments
   * IMPORTANT: Returns SEPARATE appointment records for each service
   */
  static async getCompositeBooking(bookingId) {
    try {
      const result = await pool.query(
        `SELECT 
          cb.id,
          cb.booking_id,
          cb.patient_id,
          cb.patient_name,
          cb.patient_email,
          cb.patient_phone,
          cb.booking_type,
          cb.intake_priority,
          cb.intake_source,
          cb.service_count,
          cb.total_duration_minutes,
          cb.overall_status,
          cb.patient_notes,
          cb.staff_notes,
          cb.created_at,
          cb.updated_at,
          json_agg(json_build_object(
            'id', cba.id,
            'appointmentId', cba.appointment_id,
            'serviceName', cba.service_name,
            'serviceCategory', cba.service_category,
            'serviceDuration', cba.service_duration_minutes,
            'dentistId', cba.dentist_id,
            'dentistName', cba.dentist_name,
            'dentistSpecialty', cba.dentist_specialty,
            'appointmentDate', cba.appointment_date,
            'appointmentTime', cba.appointment_time,
            'appointmentEndTime', cba.appointment_end_time,
            'appointmentStatus', cba.appointment_status,
            'confirmationStatus', cba.confirmation_status,
            'sequence', cba.appointment_sequence
          ) ORDER BY cba.appointment_sequence) as appointments
         FROM composite_bookings cb
         LEFT JOIN composite_booking_appointments cba ON cb.id = cba.composite_booking_id
         WHERE cb.booking_id = $1
         GROUP BY cb.id`,
        [bookingId]
      );

      if (result.rowCount === 0) {
        return null;
      }

      const booking = result.rows[0];
      
      // Validate appointment count matches service count
      if (booking.appointments && booking.appointments.length !== booking.service_count) {
        console.error(`ERROR: Booking ${bookingId} has ${booking.appointments.length} appointments but service_count is ${booking.service_count}`);
      }

      return booking;
    } catch (error) {
      console.error('[CompositeBookingManager] Error fetching booking:', error.message);
      throw error;
    }
  }

  /**
   * Get all composite bookings for a patient
   * IMPORTANT: Each booking returns SEPARATE appointment records
   */
  static async getPatientCompositeBookings(patientId) {
    try {
      const result = await pool.query(
        `SELECT 
          cb.id,
          cb.booking_id,
          cb.patient_id,
          cb.patient_name,
          cb.patient_email,
          cb.booking_type,
          cb.service_count,
          cb.overall_status,
          cb.created_at,
          COUNT(cba.id) as appointmentCount,
          json_agg(json_build_object(
            'appointmentId', cba.appointment_id,
            'serviceName', cba.service_name,
            'serviceCategory', cba.service_category,
            'dentistName', cba.dentist_name,
            'appointmentDate', cba.appointment_date,
            'appointmentTime', cba.appointment_time,
            'appointmentEndTime', cba.appointment_end_time,
            'appointmentStatus', cba.appointment_status,
            'sequence', cba.appointment_sequence
          ) ORDER BY cba.appointment_sequence) as appointments
         FROM composite_bookings cb
         LEFT JOIN composite_booking_appointments cba ON cb.id = cba.composite_booking_id
         WHERE cb.patient_id = $1
         GROUP BY cb.id
         ORDER BY cb.created_at DESC`,
        [patientId]
      );

      return result.rows;
    } catch (error) {
      console.error('[CompositeBookingManager] Error fetching patient bookings:', error.message);
      throw error;
    }
  }

  /**
   * Update appointment status within composite booking
   */
  static async updateAppointmentStatus(appointmentId, newStatus, notes = '') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update appointment status
      const result = await client.query(
        `UPDATE composite_booking_appointments
         SET appointment_status = $1, appointment_notes = $2, updated_at = NOW()
         WHERE appointment_id = $3
         RETURNING composite_booking_id, appointment_id`,
        [newStatus, notes, appointmentId]
      );

      if (result.rowCount === 0) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      const compositeBookingId = result.rows[0].composite_booking_id;

      // Check if all appointments in composite booking have same status
      const statusCheck = await client.query(
        `SELECT DISTINCT appointment_status FROM composite_booking_appointments
         WHERE composite_booking_id = $1`,
        [compositeBookingId]
      );

      let overallStatus = 'Pending';
      if (statusCheck.rowCount === 1) {
        const status = statusCheck.rows[0].appointment_status;
        if (status === 'Approved') overallStatus = 'Approved';
        else if (status === 'Completed') overallStatus = 'Completed';
        else if (status === 'Cancelled') overallStatus = 'Cancelled';
      } else if (statusCheck.rowCount > 1) {
        overallStatus = 'Partially Approved';
      }

      // Update composite booking overall status
      await client.query(
        `UPDATE composite_bookings
         SET overall_status = $1, updated_at = NOW()
         WHERE id = $2`,
        [overallStatus, compositeBookingId]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO composite_booking_audit_log (composite_booking_id, action, action_details)
         VALUES ($1, $2, $3)`,
        [
          compositeBookingId,
          `Appointment ${newStatus}`,
          JSON.stringify({ appointmentId, notes })
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        appointmentId: result.rows[0].appointment_id,
        newStatus,
        overallStatus
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[CompositeBookingManager] Error updating appointment:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel composite booking and all its appointments
   */
  static async cancelCompositeBooking(bookingId, reason = '', cancelledBy = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get composite booking
      const bookingResult = await client.query(
        `SELECT id FROM composite_bookings WHERE booking_id = $1`,
        [bookingId]
      );

      if (bookingResult.rowCount === 0) {
        throw new Error(`Booking not found: ${bookingId}`);
      }

      const compositeBookingId = bookingResult.rows[0].id;

      // Cancel all appointments
      await client.query(
        `UPDATE composite_booking_appointments
         SET appointment_status = 'Cancelled', updated_at = NOW()
         WHERE composite_booking_id = $1`,
        [compositeBookingId]
      );

      // Update composite booking
      await client.query(
        `UPDATE composite_bookings
         SET overall_status = 'Cancelled', updated_at = NOW()
         WHERE id = $1`,
        [compositeBookingId]
      );

      // Log audit trail
      await client.query(
        `INSERT INTO composite_booking_audit_log (composite_booking_id, action, action_by, action_details)
         VALUES ($1, $2, $3, $4)`,
        [
          compositeBookingId,
          'Cancelled',
          cancelledBy,
          JSON.stringify({ reason })
        ]
      );

      await client.query('COMMIT');

      return {
        success: true,
        bookingId,
        status: 'Cancelled'
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[CompositeBookingManager] Error cancelling booking:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get available dentists for a service
   */
  static async getAvailableDentistsForService(serviceName) {
    try {
      const result = await pool.query(
        `SELECT d.dentist_id, u.first_name, u.last_name, d.specialization
         FROM service_dentist_mapping sdm
         JOIN dentist d ON sdm.dentist_id = d.dentist_id
         JOIN users u ON d.user_id = u.id
         WHERE sdm.service_name = $1 AND sdm.is_active = TRUE
         ORDER BY sdm.is_primary DESC, u.first_name`,
        [serviceName]
      );

      return result.rows;
    } catch (error) {
      console.error('[CompositeBookingManager] Error fetching dentists:', error.message);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  CompositeBookingIdGenerator,
  CompositeBookingValidator,
  CompositeBookingManager
};
