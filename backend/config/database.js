const { Pool } = require('pg');
require('dotenv').config();

// Multiple connection options try karo
const connectionOptions = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kisanflow',
  password: process.env.DB_PASSWORD || 'Postgres@',
  port: process.env.DB_PORT || 5432,
};


console.log('🔍 Connecting with:', {
  user: connectionOptions.user,
  host: connectionOptions.host,
  database: connectionOptions.database,
  port: connectionOptions.port,
  password: '***' // Hide password in logs
});

const pool = new Pool(connectionOptions);

// Test connection
pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully!');
    client.release();
    initDatabase();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if PostgreSQL service is running');
    console.log('2. Check username and password in .env file');
    console.log('3. Create database "kisanflow" in PgAdmin');
    console.log('4. Try different password combinations');
  });

// Auto-create tables
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create tables one by one (better error handling)
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
      )
    `);
    console.log('✅ Farmers table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS procurement_centres (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        district VARCHAR(100),
        state VARCHAR(50),
        daily_capacity_quintals INT DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ Centres table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS crops (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        season VARCHAR(20),
        msp_per_quintal DECIMAL(10,2)
      )
    `);
    console.log('✅ Crops table ready');

    await client.query(`
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
      )
    `);
    console.log('✅ Bookings table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS live_queue (
        id SERIAL PRIMARY KEY,
        centre_id INT,
        booking_id INT,
        queue_position INT,
        current_status VARCHAR(30) DEFAULT 'WAITING',
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Queue table ready');

    await client.query(`
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
      )
    `);
    console.log('✅ Procurement records table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        procurement_id INT,
        farmer_id INT,
        amount DECIMAL(12,2),
        payment_status VARCHAR(30) DEFAULT 'INITIATED',
        utr_number VARCHAR(50),
        initiated_date TIMESTAMP DEFAULT NOW(),
        credited_date TIMESTAMP
      )
    `);
    console.log('✅ Payments table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        farmer_id INT,
        type VARCHAR(30),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Notifications table ready');

    // Insert sample data
    const centreCount = await client.query('SELECT COUNT(*) FROM procurement_centres');
    if (centreCount.rows[0].count == 0) {
      await client.query(`
        INSERT INTO procurement_centres (name, address, district, state, daily_capacity_quintals) VALUES
        ('Mandi Samiti Ludhiana', 'GT Road, Ludhiana', 'Ludhiana', 'Punjab', 500),
        ('Anaj Mandi Amritsar', 'Amritsar Cantt', 'Amritsar', 'Punjab', 400),
        ('Krishi Mandi Jalandhar', 'Nakodar Road', 'Jalandhar', 'Punjab', 350)
      `);
      console.log('✅ Sample centres added');
    }

    const cropCount = await client.query('SELECT COUNT(*) FROM crops');
    if (cropCount.rows[0].count == 0) {
      await client.query(`
        INSERT INTO crops (name, season, msp_per_quintal) VALUES
        ('Wheat', 'Rabi', 2275),
        ('Paddy', 'Kharif', 2183),
        ('Cotton', 'Kharif', 7020)
      `);
      console.log('✅ Sample crops added');
    }

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};