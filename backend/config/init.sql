-- Run this file to create database tables
CREATE DATABASE kisanflow;

\c kisanflow;

-- Farmers Table
CREATE TABLE farmers (
    id SERIAL PRIMARY KEY,
    aadhar_number VARCHAR(12) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(10) UNIQUE NOT NULL,
    village VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(50),
    bank_account VARCHAR(20),
    bank_ifsc VARCHAR(11),
    land_area_acres DECIMAL(5,2),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Procurement Centres
CREATE TABLE procurement_centres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    district VARCHAR(100),
    state VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    daily_capacity_quintals INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE
);

-- Crops
CREATE TABLE crops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    season VARCHAR(20),
    msp_per_quintal DECIMAL(10,2),
    procurement_start_date DATE,
    procurement_end_date DATE
);

-- Slot Bookings
CREATE TABLE slot_bookings (
    id SERIAL PRIMARY KEY,
    farmer_id INT REFERENCES farmers(id),
    centre_id INT REFERENCES procurement_centres(id),
    crop_id INT REFERENCES crops(id),
    booking_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    estimated_quantity_quintals DECIMAL(8,2),
    token_number VARCHAR(30),
    status VARCHAR(20) DEFAULT 'BOOKED',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Live Queue
CREATE TABLE live_queue (
    id SERIAL PRIMARY KEY,
    centre_id INT REFERENCES procurement_centres(id),
    booking_id INT REFERENCES slot_bookings(id),
    queue_position INT,
    current_status VARCHAR(30) DEFAULT 'WAITING',
    estimated_wait_minutes INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Procurement Records
CREATE TABLE procurement_records (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES slot_bookings(id),
    farmer_id INT REFERENCES farmers(id),
    centre_id INT REFERENCES procurement_centres(id),
    crop_id INT REFERENCES crops(id),
    actual_quantity_quintals DECIMAL(8,2),
    quality_grade VARCHAR(10),
    total_amount DECIMAL(12,2),
    bill_number VARCHAR(30),
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    procurement_id INT REFERENCES procurement_records(id),
    farmer_id INT REFERENCES farmers(id),
    amount DECIMAL(12,2),
    payment_status VARCHAR(30) DEFAULT 'INITIATED',
    utr_number VARCHAR(50),
    initiated_date TIMESTAMP DEFAULT NOW(),
    credited_date TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    farmer_id INT REFERENCES farmers(id),
    type VARCHAR(30),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Centre Staff
CREATE TABLE centre_staff (
    id SERIAL PRIMARY KEY,
    centre_id INT REFERENCES procurement_centres(id),
    full_name VARCHAR(100),
    phone_number VARCHAR(10),
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(30) DEFAULT 'MANAGER'
);

-- Insert Sample Data for West Bengal
INSERT INTO procurement_centres (name, address, district, state, daily_capacity_quintals) VALUES
('Burdwan Krishi Mandi', 'GT Road, Nawabhat, Bardhaman', 'Purba Bardhaman', 'West Bengal', 600),
('Kalna Central Kisan Mandi', 'STKK Road, Kalna', 'Purba Bardhaman', 'West Bengal', 450),
('Katwa Sub-Divisional Mandi', 'Station Road, Katwa', 'Purba Bardhaman', 'West Bengal', 400),
('Hooghly Kisan Mandi Singur', 'Durgapur Expressway, Singur', 'Hooghly', 'West Bengal', 550),
('Arambagh Central Procurement Centre', 'Arambagh Link Road', 'Hooghly', 'West Bengal', 480),
('Nadia Krishnanagar Kisan Mandi', 'NH-34 Crossing, Krishnanagar', 'Nadia', 'West Bengal', 500),
('Murshidabad Berhampore Central Mandi', 'Cossimbazar Road, Berhampore', 'Murshidabad', 'West Bengal', 580),
('Malda English Bazar Kisan Mandi', 'NH-34, Mangalbari, English Bazar', 'Malda', 'West Bengal', 520),
('North 24 Parganas Barasat Mandi', 'Jessore Road, Barasat', 'North 24 Parganas', 'West Bengal', 490),
('Midnapore Central Kisan Mandi', 'Station Road, Paschim Medinipur', 'Paschim Medinipur', 'West Bengal', 540),
('Birbhum Bolpur Shantiniketan Mandi', 'Prantik Road, Bolpur', 'Birbhum', 'West Bengal', 510);

INSERT INTO crops (name, season, msp_per_quintal, procurement_start_date, procurement_end_date) VALUES
('Paddy (Aman)', 'Kharif', 2300, '2026-11-01', '2027-03-31'),
('Paddy (Boro)', 'Rabi', 2300, '2026-04-01', '2026-07-31'),
('Jute', 'Kharif', 5335, '2026-07-01', '2026-11-30'),
('Potato', 'Rabi', 1250, '2026-01-15', '2026-04-30'),
('Maize', 'Kharif', 2225, '2026-09-15', '2026-12-31'),
('Mustard', 'Rabi', 5650, '2026-02-15', '2026-05-31');

-- Demo farmer
INSERT INTO farmers (aadhar_number, full_name, phone_number, village, district, state, bank_account, bank_ifsc, land_area_acres, password_hash) VALUES
('123456789012', 'Subrata Das', '9876543210', 'Village Shantiniketan', 'Purba Bardhaman', 'West Bengal', '12345678901', 'SBIN0001234', 4.5, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890');