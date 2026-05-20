/**
 * init-db.js
 * Run this ONCE to create the database and all tables.
 * Command: node init-db.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function init() {
  // Step 1: Connect to the default 'postgres' database to create our DB
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  await client.connect();

  // Create the database if it doesn't exist
  const dbCheck = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = 'code_smiles_db'`
  );

  if (dbCheck.rowCount === 0) {
    await client.query('CREATE DATABASE code_smiles_db');
    console.log('Database "code_smiles_db" created.');
  } else {
    console.log('Database "code_smiles_db" already exists.');
  }

  await client.end();

  // Step 2: Connect to our new database and create tables
  const db = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await db.connect();

  await db.query(`
    -- ══════════════════════════════════════════════════════════════════════
    -- CODE SMILES DENTAL BOOKING SYSTEM — DATABASE SCHEMA
    -- RDBMS: PostgreSQL
    -- ACID compliance enforced via transactions in application layer (index.js)
    -- ══════════════════════════════════════════════════════════════════════

    -- USERS TABLE
    -- Stores all system users: Patients, Staff, and Dentists (Admin role)
    -- Constraints: PRIMARY KEY, UNIQUE (email), NOT NULL, CHECK (role)
    CREATE TABLE IF NOT EXISTS users (
      id                            SERIAL        PRIMARY KEY,
      first_name                    VARCHAR(100)  NOT NULL,
      last_name                     VARCHAR(100)  NOT NULL,
      email                         VARCHAR(255)  NOT NULL UNIQUE,
      phone                         VARCHAR(20),
      password                      VARCHAR(255)  NOT NULL,
      role                          VARCHAR(20)   NOT NULL CHECK (role IN ('Patient', 'Staff', 'Admin')),
      status                        VARCHAR(20)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Suspended')),
      avatar_url                    TEXT,
      is_verified                   BOOLEAN       NOT NULL DEFAULT FALSE,
      verification_token            VARCHAR(128),
      verification_token_expires_at TIMESTAMP,
      reset_token                   VARCHAR(128),
      reset_token_expires_at        TIMESTAMP,
      created_at                    TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- PATIENT PROFILES TABLE
    -- Extended patient information linked 1-to-1 with users
    -- Constraints: PRIMARY KEY, UNIQUE (user_id), FOREIGN KEY → users
    CREATE TABLE IF NOT EXISTS patient_profiles (
      id                      SERIAL        PRIMARY KEY,
      user_id                 INTEGER       NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      date_of_birth           DATE,
      gender                  VARCHAR(20)   CHECK (gender IN ('Male','Female','Other','Prefer not to say')),
      blood_type              VARCHAR(10),
      preferred_language      VARCHAR(50)   NOT NULL DEFAULT 'English',
      home_address            TEXT,
      preferred_contact       VARCHAR(50),
      primary_dentist         VARCHAR(100),
      emergency_contact_name  VARCHAR(100),
      emergency_contact_rel   VARCHAR(50),
      emergency_contact_phone VARCHAR(20),
      notif_email             BOOLEAN       NOT NULL DEFAULT TRUE,
      notif_sms               BOOLEAN       NOT NULL DEFAULT FALSE,
      notif_announcements     BOOLEAN       NOT NULL DEFAULT TRUE,
      member_since            TIMESTAMP     NOT NULL DEFAULT NOW(),
      reliability_score       INTEGER       NOT NULL DEFAULT 0
    );

    -- APPOINTMENTS TABLE
    -- Core booking table; links patients and dentists
    -- Constraints: PRIMARY KEY, FOREIGN KEY → users (patient, dentist), NOT NULL, CHECK (status)
    CREATE TABLE IF NOT EXISTS appointments (
      id                   SERIAL        PRIMARY KEY,
      patient_id           INTEGER       REFERENCES users(id) ON DELETE SET NULL,
      patient_name         VARCHAR(200)  NOT NULL,
      email                VARCHAR(255),
      phone                VARCHAR(20),
      treatment            VARCHAR(255)  NOT NULL,
      services             TEXT[],
      dentist_id           INTEGER       REFERENCES users(id) ON DELETE SET NULL,
      dentist_name         VARCHAR(200),
      appointment_date     DATE          NOT NULL,
      appointment_time     TIME          NOT NULL,
      duration_minutes     INTEGER       NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
      status               VARCHAR(50)   NOT NULL DEFAULT 'Pending' CHECK (
                             status IN (
                               'Pending','Approved','Completed',
                               'Rescheduled by Staff','Rescheduled by Dentist',
                               'Reschedule Requested by Patient','Reschedule Requested by Dentist',
                               'Cancelled by Patient','Cancelled by Staff','Cancelled by Dentist',
                               'No-show'
                             )
                           ),
      confirmation_status  VARCHAR(20)   DEFAULT 'Not Confirmed' CHECK (
                             confirmation_status IN ('Not Confirmed','Confirmed','Reschedule Requested')
                           ),
      reminder_24h_sent    BOOLEAN       NOT NULL DEFAULT FALSE,
      reminder_3h_sent     BOOLEAN       NOT NULL DEFAULT FALSE,
      notes                TEXT,
      urgency              VARCHAR(20)   NOT NULL DEFAULT 'Standard' CHECK (urgency IN ('Standard','Urgent','Emergency')),
      created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- TREATMENT PLANS TABLE
    -- Dentist-created care roadmaps linked to a patient
    -- Constraints: PRIMARY KEY, FOREIGN KEY → users, NOT NULL, CHECK (status)
    CREATE TABLE IF NOT EXISTS treatment_plans (
      id           SERIAL        PRIMARY KEY,
      patient_id   INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dentist_id   INTEGER       REFERENCES users(id) ON DELETE SET NULL,
      title        VARCHAR(255)  NOT NULL,
      description  TEXT,
      status       VARCHAR(30)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Cancelled')),
      created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- TREATMENT SESSIONS TABLE
    -- Individual steps within a treatment plan
    -- Constraints: PRIMARY KEY, FOREIGN KEY → treatment_plans, CHECK (status)
    CREATE TABLE IF NOT EXISTS treatment_sessions (
      id           SERIAL        PRIMARY KEY,
      plan_id      INTEGER       NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
      session_no   INTEGER       NOT NULL CHECK (session_no > 0),
      title        VARCHAR(255)  NOT NULL,
      session_date DATE,
      status       VARCHAR(20)   NOT NULL DEFAULT 'pending' CHECK (status IN ('done','pending','upcoming')),
      note         TEXT
    );

    -- PRESCRIPTIONS TABLE
    -- Medications issued by dentists to patients
    -- Constraints: PRIMARY KEY, FOREIGN KEY → users, NOT NULL, CHECK (status)
    CREATE TABLE IF NOT EXISTS prescriptions (
      id             SERIAL        PRIMARY KEY,
      patient_id     INTEGER       REFERENCES users(id) ON DELETE CASCADE,
      dentist_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
      patient_name   VARCHAR(200)  NOT NULL,
      dentist_name   VARCHAR(200)  NOT NULL,
      medication     VARCHAR(255)  NOT NULL,
      dosage         VARCHAR(100)  NOT NULL,
      frequency      VARCHAR(100),
      duration       VARCHAR(100),
      instructions   TEXT,
      diagnosis      TEXT,
      condition_note TEXT,
      status         VARCHAR(30)   NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Completed','Pending','Cancelled')),
      issued_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- CLINICAL NOTES TABLE
    -- Dentist observations and procedure notes per patient
    -- Constraints: PRIMARY KEY, FOREIGN KEY → users
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id         SERIAL        PRIMARY KEY,
      patient_id INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      dentist_id INTEGER       REFERENCES users(id) ON DELETE SET NULL,
      type       VARCHAR(50)   CHECK (type IN ('Consultation','Procedure','Post-treatment','Observation')),
      note       TEXT          NOT NULL,
      created_at TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- NOTIFICATIONS TABLE
    -- System alerts sent to users (patients, staff, dentists)
    -- Constraints: PRIMARY KEY, FOREIGN KEY → users, NOT NULL
    CREATE TABLE IF NOT EXISTS notifications (
      id         SERIAL        PRIMARY KEY,
      user_id    INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      VARCHAR(255)  NOT NULL,
      detail     TEXT,
      level      VARCHAR(20)   NOT NULL DEFAULT 'New' CHECK (level IN ('New','Update','Warning')),
      is_read    BOOLEAN       NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP     NOT NULL DEFAULT NOW()
    );

    -- BILLING TABLE
    -- Financial records linked to appointments
    -- Constraints: PRIMARY KEY, FOREIGN KEY → appointments + users, NOT NULL, CHECK (status)
    CREATE TABLE IF NOT EXISTS billing (
      id               SERIAL          PRIMARY KEY,
      appointment_id   INTEGER         REFERENCES appointments(id) ON DELETE SET NULL,
      patient_id       INTEGER         REFERENCES users(id) ON DELETE SET NULL,
      patient_name     VARCHAR(200)    NOT NULL,
      service          VARCHAR(255)    NOT NULL,
      dentist_name     VARCHAR(200),
      amount           NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (amount >= 0),
      amount_paid      NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
      discount         NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (discount >= 0),
      status           VARCHAR(20)     NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Unpaid','Partial','Paid','Overdue','Waived')),
      payment_method   VARCHAR(50),
      due_date         DATE,
      notes            TEXT,
      invoice_no       VARCHAR(50)     UNIQUE,
      created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
    );

    -- TIME SLOTS TABLE
    -- Tracks available slots for each time on each date
    -- Max 4 slots per time slot (one per dentist)
    -- Slots NEVER get deleted, only updated
    -- Constraints: PRIMARY KEY, UNIQUE (date + time), NOT NULL, CHECK (slots_available)
    CREATE TABLE IF NOT EXISTS time_slots (
      id                SERIAL        PRIMARY KEY,
      appointment_date  DATE          NOT NULL,
      appointment_time  TIME          NOT NULL,
      slots_total       INTEGER       NOT NULL DEFAULT 4 CHECK (slots_total > 0),
      slots_available   INTEGER       NOT NULL DEFAULT 4 CHECK (slots_available >= 0 AND slots_available <= slots_total),
      slots_booked      INTEGER       NOT NULL DEFAULT 0 CHECK (slots_booked >= 0 AND slots_booked <= slots_total),
      last_updated      TIMESTAMP     NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
      UNIQUE(appointment_date, appointment_time)
    );

    -- Create index for faster slot lookups
    CREATE INDEX IF NOT EXISTS idx_time_slots_date_time ON time_slots(appointment_date, appointment_time);
  `);

  console.log('All tables created successfully!');

  // Step 3: Seed default staff and dentist accounts
  const bcrypt = require('bcryptjs');
  const hash = async (pw) => bcrypt.hash(pw, 10);

  const seeds = [
    {
      first_name: 'Ashianna Creion',
      last_name:  'Eduria',
      email:      'staff@codesmiles.com',
      phone:      '09000000001',
      password:   await hash('Staff@1234'),
      role:       'Staff',
    },
    {
      first_name: 'Derence',
      last_name:  'Acojedo',
      email:      'acojedo@codesmiles.com',
      phone:      '09000000002',
      password:   await hash('Dentist@1234'),
      role:       'Admin',
    },
    {
      first_name: 'Raphoncel',
      last_name:  'Eduria',
      email:      'eduria@codesmiles.com',
      phone:      '09000000003',
      password:   await hash('Dentist@1234'),
      role:       'Admin',
    },
    {
      first_name: 'Christine Faith',
      last_name:  'Metillo',
      email:      'metillo@codesmiles.com',
      phone:      '09000000005',
      password:   await hash('Dentist@1234'),
      role:       'Admin',
      specialty:  'Orthodontics, Dental Implants',
    },
    {
      first_name: 'Nico',
      last_name:  'Bongolto',
      email:      'bongolto@codesmiles.com',
      phone:      '09000000004',
      password:   await hash('Dentist@1234'),
      role:       'Admin',
      specialty:  'Pediatric Care',
    },
  ];

  for (const seed of seeds) {
    const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [seed.email]);
    if (exists.rowCount === 0) {
      await db.query(
        `INSERT INTO users (first_name, last_name, email, phone, password, role, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [seed.first_name, seed.last_name, seed.email, seed.phone, seed.password, seed.role]
      );
      console.log(`Seeded: ${seed.email}`);
    } else {
      console.log(`Already exists: ${seed.email}`);
    }
  }

  await db.end();
  console.log('\nDatabase setup complete!');
  console.log('\nDefault accounts:');
  console.log('  Staff:   staff@codesmiles.com     / Staff@1234');
  console.log('  Dentist: acojedo@codesmiles.com   / Dentist@1234');
  console.log('  Dentist: eduria@codesmiles.com    / Dentist@1234');
  console.log('  Dentist: bongolto@codesmiles.com  / Dentist@1234');
  console.log('  Patient: register via the app\n');
}

init().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
