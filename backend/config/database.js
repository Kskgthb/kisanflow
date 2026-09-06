const { Pool } = require('pg');
require('dotenv').config();

// Support DATABASE_URL (Neon/Supabase/Railway) or individual env vars (local)
let connectionOptions;

if (process.env.DATABASE_URL) {
  connectionOptions = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Neon
  };
} else {
  connectionOptions = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'kisanflow',
    password: process.env.DB_PASSWORD || 'Postgres@',
    port: parseInt(process.env.DB_PORT || '5432'),
  };
}

const pool = new Pool(connectionOptions);

let initPromise = null;
const initDatabase = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      let client;
      try {
        client = await pool.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS farmers (
            id SERIAL PRIMARY KEY,
            aadhar_number VARCHAR(12),
            full_name VARCHAR(100) NOT NULL,
            phone_number VARCHAR(10) UNIQUE,
            village VARCHAR(100),
            district VARCHAR(100),
            state VARCHAR(50),
            bank_account VARCHAR(20),
            bank_ifsc VARCHAR(11),
            land_area_acres DECIMAL(5,2),
            password_hash VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS procurement_centres (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            address TEXT,
            district VARCHAR(100),
            state VARCHAR(50),
            daily_capacity_quintals INT DEFAULT 100,
            is_active BOOLEAN DEFAULT TRUE
          );

          CREATE TABLE IF NOT EXISTS crops (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            season VARCHAR(20),
            msp_per_quintal DECIMAL(10,2)
          );

          CREATE TABLE IF NOT EXISTS slot_bookings (
            id SERIAL PRIMARY KEY,
            farmer_id INT,
            centre_id INT,
            crop_id INT,
            booking_date DATE,
            slot_time TIME,
            estimated_quantity_quintals DECIMAL(8,2),
            token_number VARCHAR(30),
            status VARCHAR(20) DEFAULT 'BOOKED',
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS live_queue (
            id SERIAL PRIMARY KEY,
            centre_id INT,
            booking_id INT,
            queue_position INT,
            current_status VARCHAR(30) DEFAULT 'WAITING',
            last_updated TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS procurement_records (
            id SERIAL PRIMARY KEY,
            booking_id INT,
            farmer_id INT,
            centre_id INT,
            crop_id INT,
            actual_quantity_quintals DECIMAL(8,2),
            quality_grade VARCHAR(10),
            total_amount DECIMAL(12,2),
            bill_number VARCHAR(30),
            status VARCHAR(30) DEFAULT 'PENDING',
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            procurement_id INT,
            farmer_id INT,
            amount DECIMAL(12,2),
            payment_status VARCHAR(30) DEFAULT 'INITIATED',
            utr_number VARCHAR(50),
            initiated_date TIMESTAMP DEFAULT NOW(),
            credited_date TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            farmer_id INT,
            type VARCHAR(30),
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            officer_id VARCHAR(50) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            phone_number VARCHAR(15) UNIQUE NOT NULL,
            email VARCHAR(100),
            centre_id INT,
            designation VARCHAR(100) DEFAULT 'Mandi Procurement Officer',
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) DEFAULT 'OFFICER',
            created_at TIMESTAMP DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            phone_number VARCHAR(15) NOT NULL,
            user_type VARCHAR(20) DEFAULT 'FARMER',
            otp_code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
          );
        `);

        // Seed initial centres if empty
        const centreCount = await client.query('SELECT COUNT(*) FROM procurement_centres');
        if (centreCount.rows[0].count == 0) {
          await client.query(`
            INSERT INTO procurement_centres (name, address, district, state, daily_capacity_quintals) VALUES
            ('Mandi Samiti Ludhiana', 'GT Road, Ludhiana', 'Ludhiana', 'Punjab', 500),
            ('Anaj Mandi Amritsar', 'Amritsar Cantt', 'Amritsar', 'Punjab', 400),
            ('Krishi Mandi Jalandhar', 'Nakodar Road', 'Jalandhar', 'Punjab', 350);
          `);
        }

        // Seed initial crops if empty
        const cropCount = await client.query('SELECT COUNT(*) FROM crops');
        if (cropCount.rows[0].count == 0) {
          await client.query(`
            INSERT INTO crops (name, season, msp_per_quintal) VALUES
            ('Wheat', 'Rabi', 2275),
            ('Paddy', 'Kharif', 2183),
            ('Cotton', 'Kharif', 7020);
          `);
        }

        // Seed default demo officer/admin if empty
        const adminCount = await client.query('SELECT COUNT(*) FROM admins');
        if (adminCount.rows[0].count == 0) {
          const bcrypt = require('bcryptjs');
          const hash = await bcrypt.hash('admin123', 10);
          await client.query(`
            INSERT INTO admins (officer_id, full_name, phone_number, email, centre_id, designation, password_hash, role)
            VALUES ('OFF-101', 'Sukhwinder Singh', '9876543210', 'officer@punjabmandi.gov.in', 1, 'Chief Mandi Officer', $1, 'ADMIN');
          `, [hash]);
        }
        console.log('✅ Database initialized successfully');
      } catch (err) {
        console.error('❌ Database initialization error:', err.message);
      } finally {
        if (client) client.release();
      }
    })();
  }
  return initPromise;
};

// Auto-run initialization on load
initDatabase();

module.exports = {
  query: async (text, params) => {
    await initDatabase();
    return pool.query(text, params);
  },
  pool,
  initDatabase
};