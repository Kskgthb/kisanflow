const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.registerFarmer = async (req, res) => {
  try {
    const { aadharNumber, fullName, phoneNumber, village, district, state, bankAccount, bankIfsc, landArea, password } = req.body;
    
    // Check existing
    const existing = await db.query(
      'SELECT * FROM farmers WHERE aadhar_number = $1 OR phone_number = $2',
      [aadharNumber, phoneNumber]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Farmer already registered' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO farmers (aadhar_number, full_name, phone_number, village, district, state, bank_account, bank_ifsc, land_area_acres, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, full_name, phone_number, district`,
      [aadharNumber, fullName, phoneNumber, village, district, state, bankAccount, bankIfsc, landArea, passwordHash]
    );
    
    const token = jwt.sign(
      { id: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({ success: true, token, farmer: result.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.loginFarmer = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    const result = await db.query('SELECT * FROM farmers WHERE phone_number = $1', [phoneNumber]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const farmer = result.rows[0];
    const validPassword = await bcrypt.compare(password, farmer.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: farmer.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      farmer: {
        id: farmer.id,
        fullName: farmer.full_name,
        phoneNumber: farmer.phone_number,
        district: farmer.district
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};