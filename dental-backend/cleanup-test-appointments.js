#!/usr/bin/env node
/**
 * Clean up test appointments from the database
 */

require('dotenv').config();
const db = require('./db');

async function cleanup() {
  try {
    console.log('Cleaning up test appointments...');
    
    // Delete all appointments with "Test Patient" in the name
    const result = await db.query(
      `DELETE FROM appointments WHERE patient_name LIKE $1`,
      ['Test Patient%']
    );
    
    console.log(`✓ Deleted ${result.rowCount} test appointments`);
    
    // Show remaining appointments on May 22
    const remaining = await db.query(
      `SELECT id, patient_name, appointment_time, treatment, status 
       FROM appointments 
       WHERE appointment_date = '2026-05-22'
       ORDER BY appointment_time ASC`
    );
    
    console.log(`\nRemaining appointments on 2026-05-22: ${remaining.rows.length}`);
    remaining.rows.forEach(row => {
      console.log(`  - ${row.patient_name} at ${row.appointment_time} (${row.treatment}, ${row.status})`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

cleanup();
