const db = require('../config/database');

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
    
    const tokenResult = await db.query(
      `SELECT COUNT(*) as count FROM slot_bookings WHERE centre_id = $1 AND booking_date = $2`,
      [centreId, bookingDate]
    );
    
    const tokenCount = parseInt(tokenResult.rows[0].count) + 1;
    const dateStr = bookingDate.replace(/-/g, '');
    const tokenNumber = `KISAN-${dateStr}-${String(tokenCount).padStart(3, '0')}`;
    
    const result = await db.query(
      `INSERT INTO slot_bookings (farmer_id, centre_id, crop_id, booking_date, slot_time, estimated_quantity_quintals, token_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [farmerId, centreId, cropId, bookingDate, slotTime, quantity, tokenNumber]
    );
    
    await db.query(
      `INSERT INTO live_queue (centre_id, booking_id, queue_position, current_status)
       VALUES ($1, $2, $3, 'WAITING')`,
      [centreId, result.rows[0].id, tokenCount]
    );
    
    res.status(201).json({ success: true, booking: result.rows[0], tokenNumber });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
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