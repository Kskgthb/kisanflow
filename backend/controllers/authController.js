const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sendFast2SMS } = require('../services/smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'kisanflow_secret_key_2024';

// -----------------------------------------------------
// FARMER AUTH
// -----------------------------------------------------
exports.registerFarmer = async (req, res) => {
  try {
    const { aadharNumber, fullName, phoneNumber, village, district, state, bankAccount, bankIfsc, landArea, password } = req.body;
    
    // Check existing
    const existing = await db.query(
      'SELECT * FROM farmers WHERE aadhar_number = $1 OR phone_number = $2',
      [aadharNumber, phoneNumber]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Farmer already registered with this Phone or Aadhaar' });
    }
    
    const passwordHash = await bcrypt.hash(password || '123456', 10);
    
    const result = await db.query(
      `INSERT INTO farmers (aadhar_number, full_name, phone_number, village, district, state, bank_account, bank_ifsc, land_area_acres, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, full_name, phone_number, district`,
      [aadharNumber, fullName, phoneNumber, village, district, state || 'Punjab', bankAccount, bankIfsc, landArea ? parseFloat(landArea) : 0, passwordHash]
    );
    
    const token = jwt.sign(
      { id: result.rows[0].id, role: 'FARMER' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({ success: true, token, farmer: result.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

exports.loginFarmer = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    const result = await db.query('SELECT * FROM farmers WHERE phone_number = $1', [phoneNumber]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }
    
    const farmer = result.rows[0];
    const validPassword = await bcrypt.compare(password, farmer.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid phone number or password' });
    }
    
    const token = jwt.sign(
      { id: farmer.id, role: 'FARMER' },
      JWT_SECRET,
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
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
};

// -----------------------------------------------------
// ADMIN / MANDI OFFICER AUTH
// -----------------------------------------------------
exports.registerAdmin = async (req, res) => {
  try {
    const { officerId, fullName, phoneNumber, email, centreId, designation, password } = req.body;

    if (!officerId || !fullName || !phoneNumber || !password) {
      return res.status(400).json({ error: 'Officer ID, Full Name, Phone, and Password are required' });
    }

    const existing = await db.query(
      'SELECT * FROM admins WHERE officer_id = $1 OR phone_number = $2',
      [officerId, phoneNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Officer ID or Phone number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO admins (officer_id, full_name, phone_number, email, centre_id, designation, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OFFICER')
       RETURNING id, officer_id, full_name, phone_number, email, centre_id, designation, role`,
      [officerId, fullName, phoneNumber, email || '', centreId ? parseInt(centreId) : 1, designation || 'Mandi Procurement Officer', passwordHash]
    );

    const adminUser = result.rows[0];
    const token = jwt.sign(
      { id: adminUser.id, role: adminUser.role, officerId: adminUser.officer_id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      admin: adminUser,
    });
  } catch (error) {
    console.error('Admin register error:', error);
    res.status(500).json({ error: error.message || 'Officer registration failed' });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { loginId, password } = req.body; // loginId can be officer_id, phone_number, or email

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login identifier and password are required' });
    }

    const cleanId = loginId.trim();
    const result = await db.query(
      `SELECT a.*, pc.name as centre_name, pc.district as centre_district 
       FROM admins a 
       LEFT JOIN procurement_centres pc ON a.centre_id = pc.id
       WHERE a.officer_id = $1 OR a.phone_number = $1 OR LOWER(a.email) = LOWER($1)`,
      [cleanId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid officer credentials. Please check Officer ID or Phone.' });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role, officerId: admin.officer_id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        officerId: admin.officer_id,
        fullName: admin.full_name,
        phoneNumber: admin.phone_number,
        email: admin.email,
        centreId: admin.centre_id,
        centreName: admin.centre_name,
        designation: admin.designation,
        role: admin.role,
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: error.message || 'Admin login failed' });
  }
};

// -----------------------------------------------------
// FORGOT & RESET PASSWORD (FARMER & ADMIN)
// -----------------------------------------------------
exports.requestPasswordResetOtp = async (req, res) => {
  try {
    const { phoneNumber, userType } = req.body; // userType = 'FARMER' | 'ADMIN'
    const type = (userType || 'FARMER').toUpperCase();

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10);

    // Check if account exists
    let userExists = false;
    let userName = '';

    if (type === 'ADMIN') {
      const adminRes = await db.query('SELECT * FROM admins WHERE phone_number = $1', [cleanPhone]);
      if (adminRes.rows.length > 0) {
        userExists = true;
        userName = adminRes.rows[0].full_name;
      }
    } else {
      const farmerRes = await db.query('SELECT * FROM farmers WHERE phone_number = $1', [cleanPhone]);
      if (farmerRes.rows.length > 0) {
        userExists = true;
        userName = farmerRes.rows[0].full_name;
      }
    }

    if (!userExists) {
      return res.status(404).json({ error: `No registered ${type === 'ADMIN' ? 'Officer' : 'Farmer'} account found with this phone number` });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save to password_resets table
    await db.query(
      `INSERT INTO password_resets (phone_number, user_type, otp_code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [cleanPhone, type, otp, expiresAt]
    );

    // Try sending real SMS if configured
    const apiKey = process.env.FAST2SMS_API_KEY;
    let smsSent = false;
    if (apiKey) {
      try {
        await sendFast2SMS(cleanPhone, `KisanFlow OTP: Your password reset verification code is ${otp}. Valid for 10 mins.`, apiKey);
        smsSent = true;
      } catch (err) {
        console.warn('SMS dispatch note:', err.message);
      }
    }

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanPhone}`,
      smsSent,
      // Provide demo/test OTP in response so users can test even without paid SMS gateway
      testOtp: otp,
      userName,
    });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
};

exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { phoneNumber, userType, otp, newPassword } = req.body;
    const type = (userType || 'FARMER').toUpperCase();

    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({ error: 'Phone number, OTP, and new password are required' });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '').slice(-10);

    // Verify OTP (also accept universal test OTP '123456' for ease of testing)
    const isMasterOtp = otp.trim() === '123456';
    let otpValid = isMasterOtp;

    if (!isMasterOtp) {
      const otpRes = await db.query(
        `SELECT * FROM password_resets 
         WHERE phone_number = $1 AND user_type = $2 AND otp_code = $3 AND is_used = FALSE AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [cleanPhone, type, otp.trim()]
      );

      if (otpRes.rows.length > 0) {
        otpValid = true;
        // Mark as used
        await db.query('UPDATE password_resets SET is_used = TRUE WHERE id = $1', [otpRes.rows[0].id]);
      }
    }

    if (!otpValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new code.' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    if (type === 'ADMIN') {
      await db.query('UPDATE admins SET password_hash = $1 WHERE phone_number = $2', [newHash, cleanPhone]);
    } else {
      await db.query('UPDATE farmers SET password_hash = $1 WHERE phone_number = $2', [newHash, cleanPhone]);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
};