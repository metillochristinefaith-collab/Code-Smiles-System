/**
 * check-slots.js
 * 
 * View and manage time slots
 * 
 * Commands:
 *   node check-slots.js                    - Show all slots
 *   node check-slots.js YYYY-MM-DD         - Show slots for specific date
 *   node check-slots.js recalc YYYY-MM-DD  - Recalculate slots for date
 *   node check-slots.js recalc-all         - Recalculate all slots
 */

require('dotenv').config();
const pool = require('./db');
const SlotManager = require('./slot-manager');

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];
    const param = args[1];

    if (command === 'recalc-all') {
      console.log('\n🔄 Recalculating ALL slots...\n');
      await SlotManager.recalculateAllSlots();
      console.log('\n✓ All slots recalculated\n');
    } else if (command === 'recalc' && param) {
      console.log(`\n🔄 Recalculating slots for ${param}...\n`);
      await SlotManager.recalculateSlotsForDate(param);
      console.log(`\n✓ Slots recalculated for ${param}\n`);
    } else if (command && !command.startsWith('recalc')) {
      // Assume it's a date
      const date = command;
      console.log(`\n📅 Slots for ${date}:\n`);
      const slots = await SlotManager.getSlotsForDate(date);
      
      if (slots.length === 0) {
        console.log('  No slots found for this date\n');
      } else {
        console.log('  Time       | Booked | Available | Total');
        console.log('  -----------|--------|-----------|-------');
        for (const slot of slots) {
          const time = slot.appointment_time;
          const booked = slot.slots_booked;
          const available = slot.slots_available;
          const total = slot.slots_total;
          console.log(`  ${time}  |   ${booked}    |     ${available}     |   ${total}`);
        }
        console.log();
      }
    } else {
      // Show all slots
      console.log('\n📊 All Time Slots:\n');
      const result = await pool.query(
        `SELECT 
           appointment_date,
           COUNT(*) as total_slots,
           SUM(slots_total) as total_capacity,
           SUM(slots_available) as total_available,
           SUM(slots_booked) as total_booked
         FROM time_slots
         GROUP BY appointment_date
         ORDER BY appointment_date DESC
         LIMIT 30`
      );

      if (result.rows.length === 0) {
        console.log('  No slots found\n');
      } else {
        console.log('  Date       | Slots | Capacity | Booked | Available');
        console.log('  -----------|-------|----------|--------|----------');
        for (const row of result.rows) {
          const date = row.appointment_date;
          const slots = row.total_slots;
          const capacity = row.total_capacity;
          const booked = row.total_booked;
          const available = row.total_available;
          console.log(`  ${date} |  ${slots}   |    ${capacity}    |   ${booked}   |    ${available}`);
        }
        console.log();
      }
    }

    await pool.end();
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();
