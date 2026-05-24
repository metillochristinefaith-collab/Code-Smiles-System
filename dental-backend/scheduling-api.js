/**
 * Scheduling API Routes
 * Integrates the scheduling engine with PostgreSQL appointments table
 * Uses REAL database bookings instead of hardcoded data
 */

const express = require('express');
const pool = require('./db');
const SlotManager = require('./slot-manager');
const {
  BookingValidator,
  AvailabilityCalculator,
  CLINIC_CONFIG,
  DENTISTS,
  SERVICES,
  SERVICE_DURATIONS,
  findDentistForService,
  getServiceDuration,
  minutesToTime,
  timeToMinutes,
} = require('./scheduling-engine');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert database appointments to scheduling engine format
 * Maps: appointment_date + appointment_time → start_min, end_min
 */
function convertDbBookingsToSchedulingFormat(dbAppointments) {
  return dbAppointments.map(apt => {
    // Parse time (HH:MM format)
    const [hours, minutes] = apt.appointment_time.split(':').map(Number);
    const startMin = hours * 60 + minutes;
    const endMin = startMin + apt.duration_minutes;

    return {
      id: `BOOK_${apt.id}`,
      dentist_id: apt.dentist_id ? `D${apt.dentist_id}` : null,
      date: apt.appointment_date,
      start_min: startMin,
      end_min: endMin,
      service: apt.treatment,
      patient_id: apt.patient_id,
      status: apt.status,
    };
  });
}

/**
 * Fetch bookings from database for a specific dentist and date
 * Only includes Approved and Pending appointments (not Cancelled, Completed, etc.)
 */
async function getBookingsFromDb(dentistId, date) {
  try {
    // Extract dentist number from D1, D2, etc.
    const dentistNum = parseInt(dentistId.substring(1));

    const result = await pool.query(
      `SELECT id, patient_id, appointment_date, appointment_time, 
              duration_minutes, treatment, status, dentist_id
       FROM appointments
       WHERE appointment_date = $1 
         AND dentist_id = $2
         AND status IN ('Approved', 'Pending')
       ORDER BY appointment_time ASC`,
      [date, dentistNum]
    );

    return convertDbBookingsToSchedulingFormat(result.rows);
  } catch (error) {
    console.error('Error fetching bookings from database:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET AVAILABLE TIMES FOR A DATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/available-times?date=YYYY-MM-DD&service=SERVICE_NAME
 * 
 * DYNAMIC TIMELINE BOOKING LOGIC:
 * 1. Find the dentist responsible for this service
 * 2. Get the service duration (e.g., 60 min for Wisdom Tooth Removal)
 * 3. Query all APPROVED appointments for that dentist on that date
 * 4. For each 30-minute time slot (9:00 AM - 9:00 PM, excluding 12:00-1:00 PM lunch):
 *    - Calculate proposed window: [startTime, startTime + duration + 10 min buffer]
 *    - Check if this window overlaps with ANY approved appointment for that dentist
 *    - If overlap: slotsLeft = 0 (blocked)
 *    - If no overlap: slotsLeft = 1 (available)
 * 5. Different services/dentists are NOT blocked by each other
 */
router.get('/available-times', async (req, res) => {
  try {
    const { date, service } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Missing date parameter' });
    }

    if (!service) {
      return res.status(400).json({ error: 'Missing service parameter' });
    }

    console.log(`\n[DYNAMIC TIMELINE] Fetching available times for date: ${date}, service: ${service}`);

    // Step 1: Find dentist responsible for this service (from database)
    const dentistResult = await pool.query(
      `SELECT d.dentist_id, u.first_name, u.last_name, d.specialization
       FROM service_dentist_mapping sdm
       JOIN dentist d ON sdm.dentist_id = d.dentist_id
       JOIN users u ON d.user_id = u.id
       WHERE LOWER(sdm.service_name) = LOWER($1) AND sdm.is_primary = TRUE AND sdm.is_active = TRUE
       LIMIT 1`,
      [service]
    );
    
    if (dentistResult.rowCount === 0) {
      return res.status(400).json({ error: `No dentist found for service: ${service}` });
    }
    
    const dentistRow = dentistResult.rows[0];
    const dentistId = dentistRow.dentist_id;
    const dentistName = `${dentistRow.first_name} ${dentistRow.last_name}`;
    
    console.log(`[DYNAMIC TIMELINE] Service "${service}" → Dentist: ${dentistName} (ID: ${dentistId})`);

    // Step 2: Get service duration
    const serviceDuration = getServiceDuration(service);
    const totalBlockedDuration = serviceDuration + 10; // +10 min buffer
    console.log(`[DYNAMIC TIMELINE] Service duration: ${serviceDuration} min + 10 min buffer = ${totalBlockedDuration} min total`);

    // Step 3: Query APPROVED and PENDING appointments for this dentist on this date
    // Both statuses block slots to prevent double-booking
    const result = await pool.query(
      `SELECT id, appointment_time, duration_minutes, treatment, status
       FROM appointments
       WHERE appointment_date = $1
         AND dentist_id = $2
         AND status IN ('Approved', 'Pending')
       ORDER BY appointment_time ASC`,
      [date, dentistId]
    );

    const approvedAppointments = result.rows;
    console.log(`[DYNAMIC TIMELINE] Found ${approvedAppointments.length} approved/pending appointments for ${dentistName} on ${date}`);

    // Convert approved appointments to time windows (in minutes since midnight)
    const bookedWindows = approvedAppointments.map(apt => {
      const [hours, minutes] = apt.appointment_time.split(':').map(Number);
      const startMin = hours * 60 + minutes;
      const endMin = startMin + apt.duration_minutes;
      return {
        id: apt.id,
        startMin,
        endMin,
        treatment: apt.treatment,
        duration: apt.duration_minutes,
      };
    });

    console.log(`[DYNAMIC TIMELINE] Booked windows for ${dentistName}:`);
    bookedWindows.forEach(w => {
      const startTime = minutesToTime(w.startMin);
      const endTime = minutesToTime(w.endMin);
      console.log(`  - ${startTime} to ${endTime} (${w.treatment}, ${w.duration} min)`);
    });

    // Step 4: Generate all possible time slots (30-minute intervals from 8:00 AM to closing time)
    // Closing times vary by day: Mon-Fri 8:30 PM, Sat 9:00 PM, Sun 9:30 PM
    const dateObj = new Date(date + 'T00:00:00'); // Parse date string correctly
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = daysOfWeek[dateObj.getDay()]; // Get day name from 0-6 (Sun-Sat)
    const closingHour = CLINIC_CONFIG.operating_hours[dayOfWeek]?.end || 20.5 * 60;
    
    const timeSlots = [];
    for (let hour = 8; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeInMinutes = hour * 60 + minute;
        
        // Stop generating slots after closing time
        if (timeInMinutes >= closingHour) break;
        
        // Skip lunch break (12:00-13:00)
        if (hour === 12) continue;
        
        timeSlots.push({
          hour,
          minute,
          time24: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        });
      }
      
      // Stop if we've passed closing time
      if (hour * 60 >= closingHour) break;
    }

    console.log(`[DYNAMIC TIMELINE] Generated ${timeSlots.length} time slots (closing at ${minutesToTime(closingHour)})`);

    // Step 5: For each slot, check if proposed window overlaps with any approved appointment
    const slotsWithCounts = [];
    
    for (const slot of timeSlots) {
      const slotTimeStr = `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`;
      const slotStartMin = slot.hour * 60 + slot.minute;
      const slotEndMin = slotStartMin + totalBlockedDuration;

      // Check for overlap with any booked window
      let hasOverlap = false;
      let overlappingAppointment = null;

      for (const booked of bookedWindows) {
        // Overlap rule: start1 < end2 AND end1 > start2
        if (slotStartMin < booked.endMin && slotEndMin > booked.startMin) {
          hasOverlap = true;
          overlappingAppointment = booked;
          break;
        }
      }

      const slotsLeft = hasOverlap ? 0 : 1;

      // Convert to 12-hour format
      let displayHour = slot.hour % 12 || 12;
      const ampm = slot.hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${String(displayHour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')} ${ampm}`;

      if (hasOverlap) {
        const overlapStart = minutesToTime(overlappingAppointment.startMin);
        const overlapEnd = minutesToTime(overlappingAppointment.endMin);
        console.log(`[DYNAMIC TIMELINE] Slot ${displayTime}: BLOCKED (overlaps with ${overlappingAppointment.treatment} ${overlapStart}-${overlapEnd})`);
      } else {
        console.log(`[DYNAMIC TIMELINE] Slot ${displayTime}: AVAILABLE`);
      }

      slotsWithCounts.push({
        time: displayTime,
        time24: slotTimeStr,
        slotsLeft,
        slotsBooked: hasOverlap ? 1 : 0,
        slotsTotal: 1,
        dentist: dentistName,
        dentist_id: dentistId,
        service,
        duration_minutes: totalBlockedDuration,
      });
    }

    console.log(`[DYNAMIC TIMELINE] Returning ${slotsWithCounts.length} slots\n`);

    res.json({
      date,
      service,
      dentist: dentistName,
      dentist_id: dentistId,
      service_duration: serviceDuration,
      total_blocked_duration: totalBlockedDuration,
      availableTimes: slotsWithCounts,
      count: slotsWithCounts.length
    });
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET NEXT AVAILABLE TIME
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/next-available
 * Query params:
 *   - dentist_id: D1, D2, D3, D4
 *   - date: YYYY-MM-DD
 *   - service: Service name
 */
router.get('/next-available', async (req, res) => {
  try {
    const { dentist_id, date, service } = req.query;

    if (!dentist_id || !date || !service) {
      return res.status(400).json({
        error: 'Missing required parameters: dentist_id, date, service',
      });
    }

    if (!DENTISTS[dentist_id]) {
      return res.status(400).json({ error: `Dentist ${dentist_id} not found` });
    }

    if (!SERVICES[service]) {
      return res.status(400).json({ error: `Service ${service} not found` });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format (use YYYY-MM-DD)' });
    }

    // Fetch REAL bookings from database
    const dbBookings = await getBookingsFromDb(dentist_id, date);
    const calculator = new AvailabilityCalculator(dbBookings);

    const nextTime = calculator.getNextAvailableTime(dentist_id, bookingDate, service);

    if (!nextTime) {
      return res.status(200).json({
        dentist_id,
        date,
        service,
        next_available: null,
        message: 'No available time for this service on this date',
      });
    }

    res.json({
      dentist_id,
      date,
      service,
      next_available: nextTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET DENTIST SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/dentist-schedule
 * Query params:
 *   - dentist_id: D1, D2, D3, D4
 *   - date: YYYY-MM-DD
 */
router.get('/dentist-schedule', async (req, res) => {
  try {
    const { dentist_id, date } = req.query;

    if (!dentist_id || !date) {
      return res.status(400).json({
        error: 'Missing required parameters: dentist_id, date',
      });
    }

    if (!DENTISTS[dentist_id]) {
      return res.status(400).json({ error: `Dentist ${dentist_id} not found` });
    }

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format (use YYYY-MM-DD)' });
    }

    // Fetch REAL bookings from database
    const dbBookings = await getBookingsFromDb(dentist_id, date);

    const dentistBookings = dbBookings
      .sort((a, b) => a.start_min - b.start_min)
      .map(b => ({
        id: b.id,
        service: b.service,
        start_time: minutesToTime(b.start_min),
        end_time: minutesToTime(b.end_min),
        patient_id: b.patient_id,
        duration: b.end_min - b.start_min,
        status: b.status,
      }));

    res.json({
      dentist_id,
      dentist_name: DENTISTS[dentist_id].name,
      date,
      bookings: dentistBookings,
      total_bookings: dentistBookings.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CREATE BOOKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/scheduling/book
 * 
 * DYNAMIC TIMELINE BOOKING:
 * 1. Resolve dentist from service
 * 2. Get service duration
 * 3. Calculate total blocked duration (service + 10 min buffer)
 * 4. Check for overlaps with approved appointments
 * 5. If no overlap, create appointment with calculated duration
 */
router.post('/book', async (req, res) => {
  try {
    const { service, date, start_time, patient_id, patient_name, phone, email } = req.body;

    // Validate inputs
    if (!date || !start_time || !service || !patient_name) {
      return res.status(400).json({
        error: 'Missing required fields: date, start_time, service, patient_name',
      });
    }

    console.log(`\n[DYNAMIC BOOK] Booking request: ${service} on ${date} at ${start_time}`);

    // Step 1: Find dentist for this service
    const dentist = findDentistForService(service);
    if (!dentist) {
      return res.status(400).json({ error: `No dentist found for service: ${service}` });
    }
    console.log(`[DYNAMIC BOOK] Dentist: ${dentist.name} (ID: ${dentist.dbId})`);

    // Step 2: Get service duration
    const serviceDuration = getServiceDuration(service);
    const totalDuration = serviceDuration + 10; // +10 min buffer
    console.log(`[DYNAMIC BOOK] Duration: ${serviceDuration} min + 10 min buffer = ${totalDuration} min`);

    // Step 3: Parse time
    let startMin;
    try {
      startMin = timeToMinutes(start_time);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid time format (use HH:MM)' });
    }
    const endMin = startMin + totalDuration;

    // Step 4: Query approved and pending appointments for this dentist on this date
    // Both statuses block slots to prevent double-booking
    const result = await pool.query(
      `SELECT id, appointment_time, duration_minutes, treatment
       FROM appointments
       WHERE appointment_date = $1
         AND dentist_id = $2
         AND status IN ('Approved', 'Pending')
       ORDER BY appointment_time ASC`,
      [date, dentist.dbId]
    );

    const approvedAppointments = result.rows;
    console.log(`[DYNAMIC BOOK] Found ${approvedAppointments.length} approved/pending appointments for ${dentist.name}`);

    // Step 5: Check for overlaps
    let hasOverlap = false;
    let overlappingAppointment = null;

    for (const apt of approvedAppointments) {
      const [hours, minutes] = apt.appointment_time.split(':').map(Number);
      const aptStartMin = hours * 60 + minutes;
      const aptEndMin = aptStartMin + apt.duration_minutes;

      // Overlap rule: start1 < end2 AND end1 > start2
      if (startMin < aptEndMin && endMin > aptStartMin) {
        hasOverlap = true;
        overlappingAppointment = apt;
        break;
      }
    }

    if (hasOverlap) {
      const overlapStart = minutesToTime(
        (overlappingAppointment.appointment_time.split(':').map(Number)[0] * 60) +
        overlappingAppointment.appointment_time.split(':').map(Number)[1]
      );
      const overlapEnd = minutesToTime(
        ((overlappingAppointment.appointment_time.split(':').map(Number)[0] * 60) +
        overlappingAppointment.appointment_time.split(':').map(Number)[1]) +
        overlappingAppointment.duration_minutes
      );
      return res.status(400).json({
        error: `Time slot overlaps with existing appointment (${overlappingAppointment.treatment} ${overlapStart}-${overlapEnd})`,
      });
    }

    console.log(`[DYNAMIC BOOK] No overlaps found. Proceeding with booking...`);

    // Step 6: Insert appointment
    const insertResult = await pool.query(
      `INSERT INTO appointments 
       (patient_id, patient_name, phone, email, treatment, dentist_id, dentist_name,
        appointment_date, appointment_time, duration_minutes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending')
       RETURNING id, appointment_date, appointment_time`,
      [patient_id || null, patient_name, phone || null, email || null, service, 
       dentist.dbId, dentist.name, date, start_time, totalDuration]
    );

    const booking = insertResult.rows[0];
    const endTime = minutesToTime(endMin);

    console.log(`[DYNAMIC BOOK] ✓ Booking created: ID ${booking.id}, ${start_time}-${endTime}\n`);

    res.status(201).json({
      success: true,
      booking: {
        id: `BOOK_${booking.id}`,
        dentist_id: `D${dentist.dbId}`,
        dentist_name: dentist.name,
        date: booking.appointment_date,
        start_time: booking.appointment_time,
        end_time: endTime,
        service,
        patient_id: patient_id || null,
        patient_name,
        duration: totalDuration,
        status: 'Pending',
      },
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET ALL DENTISTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/dentists
 */
router.get('/dentists', (req, res) => {
  try {
    const dentistList = Object.entries(DENTISTS).map(([id, dentist]) => ({
      id,
      name: dentist.name,
      specialties: dentist.specialties,
    }));

    res.json({
      dentists: dentistList,
      count: dentistList.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. GET ALL SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/services
 */
router.get('/services', (req, res) => {
  try {
    const serviceList = Object.entries(SERVICES).map(([name, service]) => ({
      name,
      duration: service.duration,
      total_duration: service.duration + 10,
      specialties: service.specialties,
    }));

    res.json({
      services: serviceList,
      count: serviceList.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GET BOOKING BY ID
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/scheduling/booking/:id
 */
router.get('/booking/:id', async (req, res) => {
  try {
    const bookingId = req.params.id.replace('BOOK_', '');

    const result = await pool.query(
      `SELECT id, patient_id, patient_name, appointment_date, appointment_time,
              duration_minutes, treatment, status, dentist_id, email, phone
       FROM appointments
       WHERE id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];
    const endMin = timeToMinutes(booking.appointment_time) + booking.duration_minutes;

    res.json({
      id: `BOOK_${booking.id}`,
      dentist_id: `D${booking.dentist_id}`,
      dentist_name: DENTISTS[`D${booking.dentist_id}`]?.name || 'Unknown',
      date: booking.appointment_date,
      start_time: booking.appointment_time,
      end_time: minutesToTime(endMin),
      service: booking.treatment,
      patient_id: booking.patient_id,
      patient_name: booking.patient_name,
      email: booking.email,
      phone: booking.phone,
      duration: booking.duration_minutes,
      status: booking.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CANCEL BOOKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/scheduling/booking/:id
 */
router.delete('/booking/:id', async (req, res) => {
  try {
    const bookingId = req.params.id.replace('BOOK_', '');

    const result = await pool.query(
      `UPDATE appointments 
       SET status = 'Cancelled by Patient'
       WHERE id = $1
       RETURNING id, patient_name, appointment_date, appointment_time, treatment`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const cancelled = result.rows[0];

    // Increase available slots for this time
    await SlotManager.increaseSlot(cancelled.appointment_date, cancelled.appointment_time);

    res.json({
      success: true,
      message: 'Booking cancelled',
      cancelled_booking: {
        id: `BOOK_${cancelled.id}`,
        patient_name: cancelled.patient_name,
        date: cancelled.appointment_date,
        start_time: cancelled.appointment_time,
        service: cancelled.treatment,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
