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

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT sb.*, pc.name as centre_name, pc.district, c.name as crop_name, c.msp_per_quintal,
              lq.queue_position, lq.current_status as queue_status,
              pr.bill_number, pr.actual_quantity_quintals, pr.quality_grade, pr.total_amount as procurement_amount, pr.status as procurement_status,
              pay.payment_status, pay.utr_number, pay.amount as payment_amount, pay.credited_date
       FROM slot_bookings sb
       LEFT JOIN procurement_centres pc ON sb.centre_id = pc.id
       LEFT JOIN crops c ON sb.crop_id = c.id
       LEFT JOIN live_queue lq ON sb.id = lq.booking_id
       LEFT JOIN procurement_records pr ON sb.id = pr.booking_id
       LEFT JOIN payments pay ON pr.id = pay.procurement_id
       WHERE sb.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const row = result.rows[0];
    const queuePos = row.queue_position || 1;
    const waitMins = Math.max(10, (queuePos - 1) * 15);

    const bookingData = {
      id: row.id,
      tokenNumber: row.token_number,
      cropName: row.crop_name,
      quantity: row.estimated_quantity_quintals,
      centreName: row.centre_name,
      district: row.district,
      bookingDate: row.booking_date ? new Date(row.booking_date).toISOString().slice(0, 10) : '',
      slotTime: row.slot_time,
      status: row.status,
      queuePosition: queuePos,
      estimatedWait: waitMins,
    };

    // Include payment/procurement details if available
    if (row.bill_number) {
      bookingData.billNumber = row.bill_number;
      bookingData.qualityGrade = row.quality_grade;
      bookingData.procurementAmount = row.procurement_amount;
      bookingData.procurementStatus = row.procurement_status;
    }
    if (row.payment_status) {
      bookingData.paymentStatus = row.payment_status;
      bookingData.paymentAmount = row.payment_amount;
      bookingData.utrNumber = row.utr_number;
      bookingData.creditedDate = row.credited_date ? new Date(row.credited_date).toISOString().slice(0, 10) : null;
    }

    res.json({ booking: bookingData });
  } catch (error) {
    console.error('Failed to fetch booking:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch booking' });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Normalize PAYMENT_CREDITED to COMPLETED
    if (status === 'PAYMENT_CREDITED') {
      status = 'COMPLETED';
    }

    const bookingRes = await db.query(
      `SELECT sb.*, pc.name as centre_name, c.name as crop_name, c.msp_per_quintal
       FROM slot_bookings sb
       LEFT JOIN procurement_centres pc ON sb.centre_id = pc.id
       LEFT JOIN crops c ON sb.crop_id = c.id
       WHERE sb.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    const updateRes = await db.query(
      `UPDATE slot_bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    await db.query(
      `UPDATE live_queue SET current_status = $1, last_updated = NOW() WHERE booking_id = $2`,
      [status, id]
    );

    // If completed, create procurement and payment records
    if (status === 'COMPLETED') {
      const quantity = parseFloat(booking.estimated_quantity_quintals || 10);
      const msp = parseFloat(booking.msp_per_quintal || 2275);
      const totalAmount = (quantity * msp).toFixed(2);
      const billNumber = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(id).padStart(3, '0')}`;
      const utrNumber = `UTR${Date.now().toString().slice(-9)}`;

      const procRes = await db.query(
        `SELECT id FROM procurement_records WHERE booking_id = $1`,
        [id]
      );

      let procurementId;
      if (procRes.rows.length > 0) {
        procurementId = procRes.rows[0].id;
        await db.query(
          `UPDATE procurement_records SET status = 'COMPLETED' WHERE id = $1`,
          [procurementId]
        );
      } else {
        const insProc = await db.query(
          `INSERT INTO procurement_records 
           (booking_id, farmer_id, centre_id, crop_id, actual_quantity_quintals, quality_grade, total_amount, bill_number, status)
           VALUES ($1, $2, $3, $4, $5, 'Grade A', $6, $7, 'COMPLETED')
           RETURNING id`,
          [id, booking.farmer_id, booking.centre_id, booking.crop_id, quantity, totalAmount, billNumber]
        );
        procurementId = insProc.rows[0].id;
      }

      const payRes = await db.query(
        `SELECT id FROM payments WHERE procurement_id = $1`,
        [procurementId]
      );

      if (payRes.rows.length === 0) {
        await db.query(
          `INSERT INTO payments 
           (procurement_id, farmer_id, amount, payment_status, utr_number, initiated_date, credited_date)
           VALUES ($1, $2, $3, 'CREDITED', $4, NOW(), NOW())`,
          [procurementId, booking.farmer_id, totalAmount, utrNumber]
        );
      }
    }

    res.json({
      success: true,
      booking: updateRes.rows[0],
      status
    });
  } catch (error) {
    console.error('Failed to update status:', error);
    res.status(500).json({ error: error.message || 'Failed to update booking status' });
  }
};

exports.getFarmerPayments = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const result = await db.query(
      `SELECT p.id, p.amount, p.payment_status as status, p.utr_number,
              p.initiated_date as "initiatedDate", p.credited_date as "creditedDate",
              pr.bill_number as "billNumber", pr.actual_quantity_quintals as quantity,
              c.name as "cropName"
       FROM payments p
       JOIN procurement_records pr ON p.procurement_id = pr.id
       JOIN crops c ON pr.crop_id = c.id
       WHERE p.farmer_id = $1
       ORDER BY p.initiated_date DESC`,
      [farmerId]
    );

    res.json({ payments: result.rows });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};