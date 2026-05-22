/**
 * Composite Booking API Routes
 * REST endpoints for multi-service booking operations
 */

const express = require('express');
const pool = require('./db');
const {
  CompositeBookingManager,
  CompositeBookingValidator,
  CompositeBookingIdGenerator
} = require('./composite-booking-service');
const { AvailabilityCalculator, DENTISTS } = require('./scheduling-engine');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CREATE COMPOSITE BOOKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/composite-booking/create
 * 
 * Create a new composite booking with multiple services
 * 
 * Request body:
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
router.post('/create', async (req, res) => {
  try {
    const { services, appointments, patientDetails, bookingType, intakePriority, intakeSource } = req.body;
    const userId = req.user?.id || req.body.userId; // From auth middleware or request

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const result = await CompositeBookingManager.createCompositeBooking(
      {
        services,
        appointments,
        patientDetails,
        bookingType,
        intakePriority,
        intakeSource
      },
      userId
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('[CompositeBookingAPI] Create error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET COMPOSITE BOOKING DETAILS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/:bookingId
 * 
 * Retrieve composite booking with all appointments
 * IMPORTANT: Returns SEPARATE appointment records, not combined
 */
router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

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
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];
    
    // Validate we have the correct number of appointments
    if (booking.appointments.length !== booking.service_count) {
      console.warn(`Warning: Booking ${bookingId} has ${booking.appointments.length} appointments but service_count is ${booking.service_count}`);
    }

    res.json(booking);
  } catch (error) {
    console.error('[CompositeBookingAPI] Get error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET PATIENT'S COMPOSITE BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/patient/:patientId
 * 
 * Retrieve all composite bookings for a patient
 */
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;

    const bookings = await CompositeBookingManager.getPatientCompositeBookings(patientId);

    res.json({
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('[CompositeBookingAPI] Get patient bookings error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. UPDATE APPOINTMENT STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PATCH /api/composite-booking/appointment/:appointmentId/status
 * 
 * Update status of a single appointment within composite booking
 * 
 * Request body:
 * {
 *   status: 'Approved' | 'Cancelled' | 'Completed' | 'No-show',
 *   notes: 'Optional notes'
 * }
 */
router.patch('/appointment/:appointmentId/status', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await CompositeBookingManager.updateAppointmentStatus(
      appointmentId,
      status,
      notes || ''
    );

    res.json(result);
  } catch (error) {
    console.error('[CompositeBookingAPI] Update status error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CANCEL COMPOSITE BOOKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/composite-booking/:bookingId
 * 
 * Cancel entire composite booking and all appointments
 * 
 * Request body:
 * {
 *   reason: 'Patient requested cancellation',
 *   cancelledBy: userId (optional)
 * }
 */
router.delete('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason, cancelledBy } = req.body;

    const result = await CompositeBookingManager.cancelCompositeBooking(
      bookingId,
      reason || '',
      cancelledBy || req.user?.id
    );

    res.json(result);
  } catch (error) {
    console.error('[CompositeBookingAPI] Cancel error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET AVAILABLE DENTISTS FOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/dentists/:serviceName
 * 
 * Get available dentists for a specific service
 */
router.get('/dentists/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;

    const dentists = await CompositeBookingManager.getAvailableDentistsForService(serviceName);

    if (dentists.length === 0) {
      return res.status(404).json({ error: 'No dentists available for this service' });
    }

    res.json({
      serviceName,
      dentistCount: dentists.length,
      dentists
    });
  } catch (error) {
    console.error('[CompositeBookingAPI] Get dentists error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GET AVAILABLE TIME SLOTS FOR SERVICE AND DENTIST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/available-slots?date=YYYY-MM-DD&serviceName=SERVICE&dentistId=ID
 * 
 * Get available time slots for a specific service, dentist, and date
 * This is used when patient is selecting time for each service individually
 */
router.get('/available-slots', async (req, res) => {
  try {
    const { date, serviceName, dentistId } = req.query;

    if (!date || !serviceName || !dentistId) {
      return res.status(400).json({
        error: 'date, serviceName, and dentistId are required'
      });
    }

    // Get service duration
    const serviceResult = await pool.query(
      `SELECT service_duration_minutes FROM composite_booking_appointments
       WHERE service_name = $1 LIMIT 1`,
      [serviceName]
    );

    if (serviceResult.rowCount === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const serviceDuration = serviceResult.rows[0].service_duration_minutes;

    // Get existing appointments for this dentist on this date
    const appointmentsResult = await pool.query(
      `SELECT appointment_time, service_duration_minutes
       FROM composite_booking_appointments
       WHERE dentist_id = $1 
         AND appointment_date = $2
         AND appointment_status IN ('Pending', 'Approved')
       ORDER BY appointment_time ASC`,
      [dentistId, date]
    );

    // Calculate available slots using scheduling engine logic
    const CLINIC_CONFIG = {
      lunch_break: { start: 12 * 60, end: 13 * 60 },
      operating_hours: {
        monday: { start: 8 * 60, end: 20.5 * 60 },
        tuesday: { start: 8 * 60, end: 20.5 * 60 },
        wednesday: { start: 8 * 60, end: 20.5 * 60 },
        thursday: { start: 8 * 60, end: 20.5 * 60 },
        friday: { start: 8 * 60, end: 20.5 * 60 },
        saturday: { start: 8 * 60, end: 21 * 60 },
        sunday: { start: 8 * 60, end: 21.5 * 60 }
      },
      buffer_time: 10
    };

    const dateObj = new Date(date);
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    const hours = CLINIC_CONFIG.operating_hours[dayName];

    const availableSlots = [];
    const bookedTimes = appointmentsResult.rows.map(apt => {
      const [h, m] = apt.appointment_time.split(':').map(Number);
      return {
        start: h * 60 + m,
        end: h * 60 + m + apt.service_duration_minutes + 10
      };
    });

    // Generate 30-minute slots
    for (let timeMin = hours.start; timeMin < hours.end; timeMin += 30) {
      // Skip lunch break
      if (timeMin >= CLINIC_CONFIG.lunch_break.start && timeMin < CLINIC_CONFIG.lunch_break.end) {
        continue;
      }

      const slotEnd = timeMin + serviceDuration + 10;

      // Check if slot fits within operating hours
      if (slotEnd > hours.end) {
        continue;
      }

      // Check for conflicts
      let hasConflict = false;
      for (const booked of bookedTimes) {
        if (!(slotEnd <= booked.start || timeMin >= booked.end)) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        const hours_val = Math.floor(timeMin / 60);
        const minutes_val = timeMin % 60;
        const timeStr = `${String(hours_val).padStart(2, '0')}:${String(minutes_val).padStart(2, '0')}`;
        
        availableSlots.push({
          time: timeStr,
          slotsLeft: 1
        });
      }
    }

    res.json({
      date,
      serviceName,
      dentistId,
      serviceDuration,
      availableSlots,
      totalAvailable: availableSlots.length
    });
  } catch (error) {
    console.error('[CompositeBookingAPI] Get slots error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. VALIDATE COMPOSITE BOOKING REQUEST
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/composite-booking/validate
 * 
 * Validate a composite booking request before submission
 */
router.post('/validate', async (req, res) => {
  try {
    const validation = CompositeBookingValidator.validateBookingRequest(req.body);

    res.json({
      isValid: validation.isValid,
      errors: validation.errors
    });
  } catch (error) {
    console.error('[CompositeBookingAPI] Validate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. GET COMPOSITE BOOKING AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/:bookingId/audit-log
 * 
 * Get audit trail for a composite booking
 */
router.get('/:bookingId/audit-log', async (req, res) => {
  try {
    const { bookingId } = req.params;

    // First get the composite booking ID
    const bookingResult = await pool.query(
      `SELECT id FROM composite_bookings WHERE booking_id = $1`,
      [bookingId]
    );

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const compositeBookingId = bookingResult.rows[0].id;

    // Get audit log
    const auditResult = await pool.query(
      `SELECT id, action, action_by, action_details, created_at
       FROM composite_booking_audit_log
       WHERE composite_booking_id = $1
       ORDER BY created_at DESC`,
      [compositeBookingId]
    );

    res.json({
      bookingId,
      auditLog: auditResult.rows
    });
  } catch (error) {
    console.error('[CompositeBookingAPI] Get audit log error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. GET COMPOSITE BOOKING STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/composite-booking/stats/summary
 * 
 * Get statistics about composite bookings
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT cb.id) as total_bookings,
        COUNT(DISTINCT cb.patient_id) as unique_patients,
        AVG(cb.service_count) as avg_services_per_booking,
        COUNT(CASE WHEN cb.overall_status = 'Pending' THEN 1 END) as pending_bookings,
        COUNT(CASE WHEN cb.overall_status = 'Approved' THEN 1 END) as approved_bookings,
        COUNT(CASE WHEN cb.overall_status = 'Completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN cb.overall_status = 'Cancelled' THEN 1 END) as cancelled_bookings
       FROM composite_bookings cb`
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[CompositeBookingAPI] Get stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
