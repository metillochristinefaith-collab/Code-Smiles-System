/**
 * Slot Manager
 * Manages dynamic slot availability for appointments
 * - Slots NEVER get deleted
 * - Slots decrease when appointments are booked
 * - Slots increase when appointments are cancelled
 * - Max 4 slots per time slot (one per dentist)
 */

const pool = require('./db');

class SlotManager {
  /**
   * Initialize or get a time slot
   * Creates the slot if it doesn't exist, returns existing if it does
   */
  static async initializeSlot(appointmentDate, appointmentTime) {
    try {
      // Try to insert if doesn't exist
      const result = await pool.query(
        `INSERT INTO time_slots (appointment_date, appointment_time, slots_total, slots_available, slots_booked)
         VALUES ($1, $2, 4, 4, 0)
         ON CONFLICT (appointment_date, appointment_time) DO NOTHING
         RETURNING id, appointment_date, appointment_time, slots_total, slots_available, slots_booked`,
        [appointmentDate, appointmentTime]
      );

      // If inserted, return the new slot
      if (result.rowCount > 0) {
        console.log(`[SlotManager] ✓ Created new slot: ${appointmentDate} ${appointmentTime}`);
        return result.rows[0];
      }

      // Otherwise fetch existing slot
      const existing = await pool.query(
        `SELECT id, appointment_date, appointment_time, slots_total, slots_available, slots_booked
         FROM time_slots
         WHERE appointment_date = $1 AND appointment_time = $2`,
        [appointmentDate, appointmentTime]
      );

      if (existing.rowCount > 0) {
        return existing.rows[0];
      }

      return null;
    } catch (error) {
      console.error('[SlotManager] Error initializing slot:', error.message);
      throw error;
    }
  }

  /**
   * Decrease available slots when an appointment is booked
   * Called when appointment status changes to 'Approved' or 'Pending'
   */
  static async decreaseSlot(appointmentDate, appointmentTime) {
    try {
      // First ensure slot exists
      await this.initializeSlot(appointmentDate, appointmentTime);

      // Then decrease available slots
      const result = await pool.query(
        `UPDATE time_slots
         SET slots_available = GREATEST(0, slots_available - 1),
             slots_booked = slots_booked + 1,
             last_updated = NOW()
         WHERE appointment_date = $1 AND appointment_time = $2
         RETURNING id, appointment_date, appointment_time, slots_total, slots_available, slots_booked`,
        [appointmentDate, appointmentTime]
      );

      if (result.rowCount > 0) {
        const slot = result.rows[0];
        console.log(`[SlotManager] ✓ Slot decreased: ${appointmentDate} ${appointmentTime} | Available: ${slot.slots_available}/${slot.slots_total}`);
        return slot;
      }

      return null;
    } catch (error) {
      console.error('[SlotManager] Error decreasing slot:', error.message);
      throw error;
    }
  }

  /**
   * Increase available slots when an appointment is cancelled
   * Called when appointment status changes to 'Cancelled by Patient', 'Cancelled by Staff', etc.
   */
  static async increaseSlot(appointmentDate, appointmentTime) {
    try {
      // First ensure slot exists
      await this.initializeSlot(appointmentDate, appointmentTime);

      // Then increase available slots
      const result = await pool.query(
        `UPDATE time_slots
         SET slots_available = LEAST(slots_total, slots_available + 1),
             slots_booked = GREATEST(0, slots_booked - 1),
             last_updated = NOW()
         WHERE appointment_date = $1 AND appointment_time = $2
         RETURNING id, appointment_date, appointment_time, slots_total, slots_available, slots_booked`,
        [appointmentDate, appointmentTime]
      );

      if (result.rowCount > 0) {
        const slot = result.rows[0];
        console.log(`[SlotManager] ✓ Slot increased: ${appointmentDate} ${appointmentTime} | Available: ${slot.slots_available}/${slot.slots_total}`);
        return slot;
      }

      return null;
    } catch (error) {
      console.error('[SlotManager] Error increasing slot:', error.message);
      throw error;
    }
  }

  /**
   * Get slot availability for a specific date and time
   */
  static async getSlot(appointmentDate, appointmentTime) {
    try {
      // Ensure slot exists first
      await this.initializeSlot(appointmentDate, appointmentTime);

      const result = await pool.query(
        `SELECT id, appointment_date, appointment_time, slots_total, slots_available, slots_booked, last_updated
         FROM time_slots
         WHERE appointment_date = $1 AND appointment_time = $2`,
        [appointmentDate, appointmentTime]
      );

      return result.rowCount > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('[SlotManager] Error getting slot:', error.message);
      throw error;
    }
  }

  /**
   * Get all slots for a specific date
   */
  static async getSlotsForDate(appointmentDate) {
    try {
      const result = await pool.query(
        `SELECT id, appointment_date, appointment_time, slots_total, slots_available, slots_booked, last_updated
         FROM time_slots
         WHERE appointment_date = $1
         ORDER BY appointment_time ASC`,
        [appointmentDate]
      );

      return result.rows;
    } catch (error) {
      console.error('[SlotManager] Error getting slots for date:', error.message);
      throw error;
    }
  }

  /**
   * Get all available slots for a date (with slotsLeft > 0)
   */
  static async getAvailableSlotsForDate(appointmentDate) {
    try {
      const result = await pool.query(
        `SELECT id, appointment_date, appointment_time, slots_total, slots_available, slots_booked, last_updated
         FROM time_slots
         WHERE appointment_date = $1 AND slots_available > 0
         ORDER BY appointment_time ASC`,
        [appointmentDate]
      );

      return result.rows;
    } catch (error) {
      console.error('[SlotManager] Error getting available slots:', error.message);
      throw error;
    }
  }

  /**
   * Recalculate slots for a date based on actual appointments
   * Useful for syncing after data issues
   */
  static async recalculateSlotsForDate(appointmentDate) {
    try {
      console.log(`[SlotManager] Recalculating slots for ${appointmentDate}...`);

      // Get all unique times for this date from appointments
      const timesResult = await pool.query(
        `SELECT DISTINCT appointment_time
         FROM appointments
         WHERE appointment_date = $1
         ORDER BY appointment_time ASC`,
        [appointmentDate]
      );

      for (const row of timesResult.rows) {
        const appointmentTime = row.appointment_time;

        // Count active appointments for this time
        const countResult = await pool.query(
          `SELECT COUNT(*) as count
           FROM appointments
           WHERE appointment_date = $1 
             AND appointment_time = $2
             AND status IN ('Approved', 'Pending')`,
          [appointmentDate, appointmentTime]
        );

        const bookedCount = parseInt(countResult.rows[0].count) || 0;
        const availableCount = Math.max(0, 4 - bookedCount);

        // Update or create slot
        await pool.query(
          `INSERT INTO time_slots (appointment_date, appointment_time, slots_total, slots_available, slots_booked)
           VALUES ($1, $2, 4, $3, $4)
           ON CONFLICT (appointment_date, appointment_time) 
           DO UPDATE SET slots_available = $3, slots_booked = $4, last_updated = NOW()`,
          [appointmentDate, appointmentTime, availableCount, bookedCount]
        );

        console.log(`[SlotManager] ✓ Recalculated ${appointmentDate} ${appointmentTime}: ${availableCount} available, ${bookedCount} booked`);
      }

      console.log(`[SlotManager] ✓ Recalculation complete for ${appointmentDate}`);
    } catch (error) {
      console.error('[SlotManager] Error recalculating slots:', error.message);
      throw error;
    }
  }

  /**
   * Recalculate all slots in the database
   * Useful for full sync after data issues
   */
  static async recalculateAllSlots() {
    try {
      console.log('[SlotManager] Recalculating ALL slots...');

      // Get all unique dates from appointments
      const datesResult = await pool.query(
        `SELECT DISTINCT appointment_date
         FROM appointments
         ORDER BY appointment_date ASC`
      );

      for (const row of datesResult.rows) {
        await this.recalculateSlotsForDate(row.appointment_date);
      }

      console.log('[SlotManager] ✓ Full recalculation complete');
    } catch (error) {
      console.error('[SlotManager] Error recalculating all slots:', error.message);
      throw error;
    }
  }

  /**
   * Get slot statistics for a date range
   */
  static async getSlotStats(startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT 
           appointment_date,
           COUNT(*) as total_slots,
           SUM(slots_total) as total_capacity,
           SUM(slots_available) as total_available,
           SUM(slots_booked) as total_booked
         FROM time_slots
         WHERE appointment_date BETWEEN $1 AND $2
         GROUP BY appointment_date
         ORDER BY appointment_date ASC`,
        [startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      console.error('[SlotManager] Error getting slot stats:', error.message);
      throw error;
    }
  }
}

module.exports = SlotManager;
