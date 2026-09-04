const db = require('../config/database');
const { sendSMS } = require('../services/smsService');

exports.getCentres = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM procurement_centres WHERE is_active = TRUE');
    res.json({ centres: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch centres' });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { centreId, date } = req.params;
    const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
    
    const bookedResult = await db.query(
      `SELECT slot_time, COALESCE(SUM(estimated_quantity_quintals), 0) as booked_qty
       FROM slot_bookings
       WHERE centre_id = $1 AND booking_date = $2 AND status != 'CANCELLED'
       GROUP BY slot_time`,
      [centreId, date]
    );
    
    const bookedMap = {};
    bookedResult.rows.forEach(row => {
      bookedMap[row.slot_time] = parseFloat(row.booked_qty);
    });
    
    const slots = timeSlots.map(time => ({
      time,
      isAvailable: !(bookedMap[time] >= 60) // 60 quintals per slot capacity
    }));
    
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get slots' });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { farmerId, centreId, cropId, bookingDate, slotTime, quantity } = req.body;
    
    // 1. Calculate Token Number & Queue Position
    const tokenResult = await db.query(
      `SELECT COUNT(*) as count FROM slot_bookings WHERE centre_id = $1 AND booking_date = $2`,
      [centreId, bookingDate]
    );
    
    const tokenCount = parseInt(tokenResult.rows[0].count) + 1;
    const dateStr = String(bookingDate).replace(/-/g, '');
    const tokenNumber = `KISAN-${dateStr}-${String(tokenCount).padStart(3, '0')}`;
    const queuePosition = tokenCount;
    const estimatedWaitMinutes = Math.max(10, (queuePosition - 1) * 15);
    
    // 2. Insert into slot_bookings
    const result = await db.query(
      `INSERT INTO slot_bookings (farmer_id, centre_id, crop_id, booking_date, slot_time, estimated_quantity_quintals, token_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [farmerId, centreId, cropId, bookingDate, slotTime, quantity, tokenNumber]
    );
    
    // 3. Insert into live_queue
    await db.query(
      `INSERT INTO live_queue (centre_id, booking_id, queue_position, current_status)
       VALUES ($1, $2, $3, 'WAITING')`,
      [centreId, result.rows[0].id, queuePosition]
    );

    // 4. Fetch Farmer & Centre details for SMS
    const farmerRes = await db.query('SELECT full_name, phone_number FROM farmers WHERE id = $1', [farmerId]);
    const centreRes = await db.query('SELECT name, district FROM procurement_centres WHERE id = $1', [centreId]);
    
    const farmer = farmerRes.rows[0] || {};
    const centre = centreRes.rows[0] || {};
    const farmerPhone = farmer.phone_number;
    const farmerName = farmer.full_name || 'Kisan';
    const centreName = centre.name || 'Procurement Centre';

    // 5. Compose and Send SMS
    const smsMessage = `🌾 KisanFlow Alert: Namaste ${farmerName} ji! Aapka slot book ho gaya hai.
📌 Token No: ${tokenNumber}
🔢 Queue Position: #${queuePosition}
⏱️ Waiting Time: ~${estimatedWaitMinutes} Mins
🏢 Mandi: ${centreName}
📅 Date: ${bookingDate} (${slotTime})
Dhanyawad!`;

    if (farmerPhone) {
      await sendSMS({
        to: farmerPhone,
        message: smsMessage,
        farmerId: farmerId,
      });
    }
    
    res.status(201).json({
      success: true,
      booking: result.rows[0],
      tokenNumber,
      queuePosition,
      estimatedWaitMinutes,
      smsSent: !!farmerPhone,
      smsPhone: farmerPhone,
      smsMessage,
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: error.message || 'Failed to create booking' });
  }
};

exports.getFarmerBookings = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const result = await db.query(
      `SELECT sb.*, pc.name as centre_name, c.name as crop_name
       FROM slot_bookings sb
       JOIN procurement_centres pc ON sb.centre_id = pc.id
       JOIN crops c ON sb.crop_id = c.id
       WHERE sb.farmer_id = $1
       ORDER BY sb.booking_date DESC`,
      [farmerId]
    );
    
    res.json({ bookings: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};