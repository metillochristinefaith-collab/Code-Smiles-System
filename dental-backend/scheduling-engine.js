/**
 * Smart Dental Clinic Scheduling Engine
 * Continuous timeline-based scheduling with dynamic availability
 */

// ═══════════════════════════════════════════════════════════════
// 1. CLINIC CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CLINIC_CONFIG = {
  lunch_break: {
    start: 12 * 60, // 12:00 PM in minutes
    end: 13 * 60,   // 01:00 PM in minutes
  },
  operating_hours: {
    monday: { start: 8 * 60, end: 20.5 * 60 },      // 08:00 AM - 08:30 PM (weekday)
    tuesday: { start: 8 * 60, end: 20.5 * 60 },     // 08:00 AM - 08:30 PM (weekday)
    wednesday: { start: 8 * 60, end: 20.5 * 60 },   // 08:00 AM - 08:30 PM (weekday)
    thursday: { start: 8 * 60, end: 20.5 * 60 },    // 08:00 AM - 08:30 PM (weekday)
    friday: { start: 8 * 60, end: 20.5 * 60 },      // 08:00 AM - 08:30 PM (weekday)
    saturday: { start: 8 * 60, end: 21 * 60 },      // 08:00 AM - 09:00 PM (Saturday)
    sunday: { start: 8 * 60, end: 21.5 * 60 },      // 08:00 AM - 09:30 PM (Sunday)
  },
  buffer_time: 10, // 10 minutes after each appointment
};

// ═══════════════════════════════════════════════════════════════
// 2. DENTIST CONFIGURATION (Aligned with DB users & frontend)
// ═══════════════════════════════════════════════════════════════

const DENTISTS = {
  D1: {
    id: 'D1',
    dbId: 1,
    name: 'Dr. Derence Acojedo',
    email: 'acojedo@codesmiles.com',
    specialties: ['Cosmetic Arts'],
  },
  D2: {
    id: 'D2',
    dbId: 2,
    name: 'Dr. Raphoncel Eduria',
    email: 'eduria@codesmiles.com',
    specialties: ['General Dentistry', 'Oral Surgery'],
  },
  D3: {
    id: 'D3',
    dbId: 3,
    name: 'Dr. Nico Bongolto',
    email: 'bongolto@codesmiles.com',
    specialties: ['Pediatric Care'],
  },
  D4: {
    id: 'D4',
    dbId: 4,
    name: 'Dr. Christine Faith Metillo',
    email: 'metillo@codesmiles.com',
    specialties: ['General Dentistry'],
  },
  D5: {
    id: 'D5',
    dbId: 5,
    name: 'Dr. Christine Metillo',
    email: 'christine@codesmiles.com',
    specialties: ['Orthodontics', 'Dental Implants'],
  },
};

// ═══════════════════════════════════════════════════════════════
// 3. SERVICE DURATION MODEL (Aligned with frontend serviceMap)
// ═══════════════════════════════════════════════════════════════

const SERVICE_DURATIONS = {
  // General Dentistry
  'oral consultation': 15,
  'dental cleaning': 45,
  'digital x-rays': 20,
  'tooth fillings': 60,
  'fluoride treatment': 15,
  'dental sealants': 30,
  'simple tooth extraction': 45,
  'emergency dental care': 60,
  
  // Cosmetic Arts
  'teeth whitening': 60,
  'dental veneers': 90,
  'dental bonding': 60,
  'smile makeover': 120,
  'tooth contouring': 45,
  'gum contouring': 60,
  
  // Orthodontics
  'traditional braces': 90,
  'ceramic braces': 90,
  'self-ligating braces': 90,
  'clear aligners': 45,
  'retainers': 30,
  'orthodontic consultation': 30,
  
  // Oral Surgery
  'surgical tooth extraction': 60,
  'wisdom tooth removal': 90,
  'cyst removal': 60,
  'minor oral surgery': 45,
  'frenectomy': 30,
  
  // Dental Implants
  'implant consultation': 30,
  'single tooth implant': 90,
  'multiple tooth implant': 120,
  'implant crown placement': 60,
  'implant maintenance': 45,
  
  // Pediatric Care
  'pediatric check-up': 20,
  'pediatric checkup': 20,
  'pediatric cleaning': 30,
  'fluoride for kids': 15,
  'baby tooth extraction': 30,
  'space maintainers': 45
};

// Map each sub-service to its parent category
const SERVICE_TO_CATEGORY = {
  // General Dentistry
  'oral consultation': 'General Dentistry',
  'dental cleaning': 'General Dentistry',
  'digital x-rays': 'General Dentistry',
  'tooth fillings': 'General Dentistry',
  'fluoride treatment': 'General Dentistry',
  'dental sealants': 'General Dentistry',
  'simple tooth extraction': 'General Dentistry',
  'emergency dental care': 'General Dentistry',
  
  // Cosmetic Arts
  'teeth whitening': 'Cosmetic Arts',
  'dental veneers': 'Cosmetic Arts',
  'dental bonding': 'Cosmetic Arts',
  'smile makeover': 'Cosmetic Arts',
  'tooth contouring': 'Cosmetic Arts',
  'gum contouring': 'Cosmetic Arts',
  
  // Orthodontics
  'traditional braces': 'Orthodontics',
  'ceramic braces': 'Orthodontics',
  'self-ligating braces': 'Orthodontics',
  'clear aligners': 'Orthodontics',
  'retainers': 'Orthodontics',
  'orthodontic consultation': 'Orthodontics',
  
  // Oral Surgery
  'surgical tooth extraction': 'Oral Surgery',
  'wisdom tooth removal': 'Oral Surgery',
  'cyst removal': 'Oral Surgery',
  'minor oral surgery': 'Oral Surgery',
  'frenectomy': 'Oral Surgery',
  
  // Dental Implants
  'implant consultation': 'Dental Implants',
  'single tooth implant': 'Dental Implants',
  'multiple tooth implant': 'Dental Implants',
  'implant crown placement': 'Dental Implants',
  'implant maintenance': 'Dental Implants',
  
  // Pediatric Care
  'pediatric check-up': 'Pediatric Care',
  'pediatric checkup': 'Pediatric Care',
  'pediatric cleaning': 'Pediatric Care',
  'fluoride for kids': 'Pediatric Care',
  'baby tooth extraction': 'Pediatric Care',
  'space maintainers': 'Pediatric Care'
};

// Legacy SERVICES model for backwards compatibility where needed
const SERVICES = {};
Object.entries(SERVICE_DURATIONS).forEach(([name, duration]) => {
  const category = SERVICE_TO_CATEGORY[name];
  SERVICES[name] = {
    duration,
    specialties: category ? [category] : []
  };
});

/**
 * Find dentist responsible for a given service or category
 */
function findDentistForService(serviceOrCategory) {
  if (!serviceOrCategory) return null;
  const nameLower = serviceOrCategory.trim().toLowerCase();
  
  // 1. Check if matches category/specialty name
  for (const dentist of Object.values(DENTISTS)) {
    const categoryMatch = dentist.specialties.some(
      spec => spec.toLowerCase() === nameLower
    );
    if (categoryMatch) return dentist;
  }
  
  // 2. Check if matches sub-service name
  const category = SERVICE_TO_CATEGORY[nameLower];
  if (category) {
    for (const dentist of Object.values(DENTISTS)) {
      if (dentist.specialties.includes(category)) {
        return dentist;
      }
    }
  }
  
  return null;
}

/**
 * Get estimated duration for a service in minutes
 */
function getServiceDuration(serviceName) {
  if (!serviceName) return 60;
  const nameLower = serviceName.trim().toLowerCase();
  return SERVICE_DURATIONS[nameLower] || 60;
}

// ═══════════════════════════════════════════════════════════════
// 4. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert time string (HH:MM or HH:MM AM/PM) to minutes since midnight
 */
function timeToMinutes(timeStr) {
  // Handle both 24-hour format (HH:MM) and 12-hour format (HH:MM AM/PM)
  const trimmed = timeStr.trim();
  const hasAmPm = /\s*(AM|PM|am|pm)\s*$/.test(trimmed);
  
  if (hasAmPm) {
    // Extract AM/PM and time parts
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'AM') {
      if (hours === 12) hours = 0; // 12 AM = 00:00
    } else { // PM
      if (hours !== 12) hours += 12; // 1 PM = 13:00, but 12 PM = 12:00
    }
    
    return hours * 60 + minutes;
  } else {
    // Standard 24-hour format
    const [hours, minutes] = trimmed.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

/**
 * Convert minutes since midnight to time string (HH:MM AM/PM format)
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // Convert to 12-hour format
  let displayHours = hours % 12 || 12;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  return `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Get day of week name from a Date or YYYY-MM-DD string
 */
function getDayOfWeek(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (typeof date === 'string') {
    const dateObj = new Date(`${date}T00:00:00`);
    return days[dateObj.getDay()];
  }
  if (date instanceof Date) {
    return days[date.getDay()];
  }
  return days[new Date(date).getDay()];
}

/**
 * Check if time overlaps with lunch break
 */
function overlapsLunchBreak(startMin, endMin) {
  const lunchStart = CLINIC_CONFIG.lunch_break.start;
  const lunchEnd = CLINIC_CONFIG.lunch_break.end;
  
  // Overlap if: start < lunch_end AND end > lunch_start
  return startMin < lunchEnd && endMin > lunchStart;
}

/**
 * Check if time is within operating hours (excluding lunch)
 */
function isWithinOperatingHours(date, startMin, endMin) {
  const dayName = getDayOfWeek(date);
  const hours = CLINIC_CONFIG.operating_hours[dayName];
  
  if (!hours) return false;
  
  // Must be within operating hours
  if (startMin < hours.start || endMin > hours.end) {
    return false;
  }
  
  // Must not overlap lunch break
  if (overlapsLunchBreak(startMin, endMin)) {
    return false;
  }
  
  return true;
}

/**
 * Check if two time blocks overlap
 * Overlap rule: start1 < end2 AND end1 > start2
 */
function hasOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

// ═══════════════════════════════════════════════════════════════
// 5. BOOKING VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════

class BookingValidator {
  constructor(bookings = []) {
    this.bookings = bookings; // Array of { dentist_id, start_min, end_min, service, date }
  }

  /**
   * Validate if a booking is possible
   */
  validateBooking(dentistId, date, startMin, serviceName) {
    const service = SERVICES[serviceName];
    if (!service) {
      return { valid: false, reason: 'Service not found' };
    }

    // Calculate total block time (service + buffer)
    const totalDuration = service.duration + CLINIC_CONFIG.buffer_time;
    const endMin = startMin + totalDuration;

    // Check 1: Within operating hours
    if (!isWithinOperatingHours(date, startMin, endMin)) {
      return { valid: false, reason: 'Outside operating hours or overlaps lunch break' };
    }

    // Check 2: Dentist has required specialty
    const dentist = DENTISTS[dentistId];
    if (!dentist) {
      return { valid: false, reason: 'Dentist not found' };
    }

    const hasSpecialty = service.specialties.some(spec =>
      dentist.specialties.includes(spec)
    );
    if (!hasSpecialty) {
      return { valid: false, reason: `Dentist ${dentistId} does not have required specialty` };
    }

    // Check 3: No overlapping bookings for this dentist on this date
    const dateStr = date.toISOString().split('T')[0];
    const dentistBookings = this.bookings.filter(
      b => b.dentist_id === dentistId && b.date === dateStr
    );

    for (const booking of dentistBookings) {
      if (hasOverlap(startMin, endMin, booking.start_min, booking.end_min)) {
        return {
          valid: false,
          reason: `Overlaps with existing booking from ${minutesToTime(booking.start_min)} to ${minutesToTime(booking.end_min)}`,
        };
      }
    }

    return { valid: true, endMin };
  }

  /**
   * Add a booking if valid
   */
  addBooking(dentistId, date, startMin, serviceName, patientId) {
    const validation = this.validateBooking(dentistId, date, startMin, serviceName);
    
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    const service = SERVICES[serviceName];
    const totalDuration = service.duration + CLINIC_CONFIG.buffer_time;
    const endMin = startMin + totalDuration;
    const dateStr = date.toISOString().split('T')[0];

    const booking = {
      id: `BOOK_${Date.now()}`,
      dentist_id: dentistId,
      date: dateStr,
      start_min: startMin,
      end_min: endMin,
      service: serviceName,
      patient_id: patientId,
      created_at: new Date(),
    };

    this.bookings.push(booking);
    return { success: true, booking };
  }
}

// ═══════════════════════════════════════════════════════════════
// 6. AVAILABILITY CALCULATOR
// ═══════════════════════════════════════════════════════════════

class AvailabilityCalculator {
  constructor(bookings = []) {
    this.bookings = bookings;
  }

  /**
   * Get all free time gaps for a dentist on a specific date
   */
  getAvailableSlots(dentistId, date, minDuration = 30) {
    const dayName = getDayOfWeek(date);
    const hours = CLINIC_CONFIG.operating_hours[dayName];
    const dateStr = date.toISOString().split('T')[0];

    if (!hours) {
      return []; // Clinic closed
    }

    // Get all bookings for this dentist on this date, sorted by start time
    const dentistBookings = this.bookings
      .filter(b => b.dentist_id === dentistId && b.date === dateStr)
      .sort((a, b) => a.start_min - b.start_min);

    const slots = [];
    let currentTime = hours.start;

    for (const booking of dentistBookings) {
      // Gap before this booking
      if (currentTime < booking.start_min) {
        const gapStart = currentTime;
        const gapEnd = booking.start_min;

        // Split gap by lunch break if necessary
        const gapSlots = this._splitByLunchBreak(gapStart, gapEnd, minDuration);
        slots.push(...gapSlots);
      }

      currentTime = Math.max(currentTime, booking.end_min);
    }

    // Gap after last booking until end of day
    if (currentTime < hours.end) {
      const gapStart = currentTime;
      const gapEnd = hours.end;

      const gapSlots = this._splitByLunchBreak(gapStart, gapEnd, minDuration);
      slots.push(...gapSlots);
    }

    return slots;
  }

  /**
   * Split a time gap by lunch break
   */
  _splitByLunchBreak(startMin, endMin, minDuration) {
    const lunchStart = CLINIC_CONFIG.lunch_break.start;
    const lunchEnd = CLINIC_CONFIG.lunch_break.end;
    const slots = [];

    // Before lunch
    if (startMin < lunchStart) {
      const beforeLunchEnd = Math.min(endMin, lunchStart);
      const duration = beforeLunchEnd - startMin;
      if (duration >= minDuration) {
        slots.push({
          start_min: startMin,
          end_min: beforeLunchEnd,
          duration,
          start_time: minutesToTime(startMin),
          end_time: minutesToTime(beforeLunchEnd),
        });
      }
    }

    // After lunch
    if (endMin > lunchEnd) {
      const afterLunchStart = Math.max(startMin, lunchEnd);
      const duration = endMin - afterLunchStart;
      if (duration >= minDuration) {
        slots.push({
          start_min: afterLunchStart,
          end_min: endMin,
          duration,
          start_time: minutesToTime(afterLunchStart),
          end_time: minutesToTime(endMin),
        });
      }
    }

    return slots;
  }

  /**
   * Get next available time for a dentist
   */
  getNextAvailableTime(dentistId, date, serviceName) {
    const service = SERVICES[serviceName];
    if (!service) return null;

    const requiredDuration = service.duration + CLINIC_CONFIG.buffer_time;
    const slots = this.getAvailableSlots(dentistId, date, requiredDuration);

    if (slots.length === 0) return null;

    return {
      start_min: slots[0].start_min,
      start_time: slots[0].start_time,
      end_min: slots[0].start_min + requiredDuration,
      end_time: minutesToTime(slots[0].start_min + requiredDuration),
    };
  }

  /**
   * Get all available times for a service on a specific date
   */
  getAvailableTimesForService(dentistId, date, serviceName) {
    const service = SERVICES[serviceName];
    if (!service) return [];

    const requiredDuration = service.duration + CLINIC_CONFIG.buffer_time;
    const slots = this.getAvailableSlots(dentistId, date, requiredDuration);

    const availableTimes = [];
    for (const slot of slots) {
      // Generate 15-minute intervals within the slot
      for (let time = slot.start_min; time + requiredDuration <= slot.end_min; time += 15) {
        availableTimes.push({
          start_min: time,
          start_time: minutesToTime(time),
          end_min: time + requiredDuration,
          end_time: minutesToTime(time + requiredDuration),
        });
      }
    }

    return availableTimes;
  }
}

// ═══════════════════════════════════════════════════════════════
// 7. EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  CLINIC_CONFIG,
  DENTISTS,
  SERVICES,
  SERVICE_DURATIONS,
  findDentistForService,
  getServiceDuration,
  BookingValidator,
  AvailabilityCalculator,
  timeToMinutes,
  minutesToTime,
  getDayOfWeek,
  overlapsLunchBreak,
  isWithinOperatingHours,
  hasOverlap,
};
