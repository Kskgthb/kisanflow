const db = require('../config/database');
const { sendSMS, sendBookingConfirmationSMS, sendSlotReminderSMS } = require('../services/smsService');

exports.getCentres = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM procurement_centres WHERE is_active = TRUE ORDER BY name ASC');
    res.json({ centres: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch centres' });
  }
};

exports.getAvailableSlots = async (req, res) => {
  try {
    const { centreId, date } = req.params;
    const timeSlots = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
    
    const bookedResult = await db.query(
      `SELECT slot_time, COALESCE(SUM(estimated_quantity_quintals), 0) as booked_qty
       FROM slot_bookings
       WHERE centre_id = $1 AND booking_date = $2 AND status != 'CANCELLED'
       GROUP BY slot_time`,
      [centreId, date]
    );
    
    const bookedMap = {};
    bookedResult.rows.forEach(row => {
      // Normalize time format e.g. "09:00:00" -> "09:00"
      const t = String(row.slot_time).slice(0, 5);
      bookedMap[t] = parseFloat(row.booked_qty);
    });
    
    const slots = timeSlots.map(time => ({
      time,
      isAvailable: !(bookedMap[time] >= 60) // 60 quintals capacity per slot batch
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
      `INSERT INTO slot_bookings (farmer_id, centre_id, crop_id, booking_date, slot_time, estimated_quantity_quintals, token_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'BOOKED')
       RETURNING *`,
      [farmerId, centreId, cropId, bookingDate, slotTime, quantity, tokenNumber]
    );

    
    // 3. Insert into live_queue
    await db.query(
      `INSERT INTO live_queue (centre_id, booking_id, queue_position, current_status)
       VALUES ($1, $2, $3, 'WAITING')`,
      [centreId, result.rows[0].id, queuePosition]
    );

    // 4. Fetch Farmer, Centre & Crop details for Twilio SMS
    const farmerRes = await db.query('SELECT full_name, phone_number FROM farmers WHERE id = $1', [farmerId]);
    const centreRes = await db.query('SELECT name, district FROM procurement_centres WHERE id = $1', [centreId]);
    const cropRes = await db.query('SELECT name FROM crops WHERE id = $1', [cropId]);
    
    const farmer = farmerRes.rows[0] || {};
    const centre = centreRes.rows[0] || {};
    const crop = cropRes.rows[0] || {};
    const farmerPhone = farmer.phone_number;
    const farmerName = farmer.full_name || 'Kisan';
    const centreName = centre.name || 'Procurement Centre';
    const cropName = crop.name || 'Grain';

    // 5. Compose and Send Twilio Booking Confirmation SMS
    let smsResult = null;
    if (farmerPhone) {
      smsResult = await sendBookingConfirmationSMS({
        phone: farmerPhone,
        farmerName,
        tokenNumber,
        queuePosition,
        waitMinutes: estimatedWaitMinutes,
        centreName,
        date: bookingDate,
        slotTime,
        cropName,
        quantity,
        farmerId,
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
      smsResult,
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: error.message || 'Failed to create booking' });
  }
};

/**
 * Send 30-Minute Arrival Reminder SMS
 */
exports.sendSlotReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const bookingRes = await db.query(
      `SELECT sb.*, f.full_name as farmer_name, f.phone_number, pc.name as centre_name, c.name as crop_name
       FROM slot_bookings sb
       JOIN farmers f ON sb.farmer_id = f.id
       JOIN procurement_centres pc ON sb.centre_id = pc.id
       JOIN crops c ON sb.crop_id = c.id
       WHERE sb.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const b = bookingRes.rows[0];
    const dateFormatted = b.booking_date ? new Date(b.booking_date).toISOString().slice(0, 10) : 'Today';

    const smsRes = await sendSlotReminderSMS({
      phone: b.phone_number,
      farmerName: b.farmer_name,
      tokenNumber: b.token_number,
      centreName: b.centre_name,
      date: dateFormatted,
      slotTime: b.slot_time,
      minutesLeft: 30,
      farmerId: b.farmer_id,
    });

    res.json({
      success: true,
      message: '30-minute reminder SMS dispatched successfully!',
      smsResult: smsRes,
    });
  } catch (error) {
    console.error('Send slot reminder error:', error);
    res.status(500).json({ error: error.message || 'Failed to send slot reminder' });
  }
};


exports.getFarmerBookings = async (req, res) => {
  try {
    const { farmerId } = req.params;
    
    const result = await db.query(
      `SELECT sb.*, 
              COALESCE(pc.name, 'Procurement Centre') as centre_name, 
              COALESCE(c.name, 'Crop Grain') as crop_name
       FROM slot_bookings sb
       LEFT JOIN procurement_centres pc ON sb.centre_id = pc.id
       LEFT JOIN crops c ON sb.crop_id = c.id
       WHERE sb.farmer_id = $1
       ORDER BY sb.id DESC`,
      [farmerId]
    );
    
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Failed to fetch farmer bookings:', error);
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
    const isCompleted = row.status === 'COMPLETED' || row.payment_status === 'CREDITED';
    const queuePos = isCompleted ? 0 : (row.queue_position || 1);
    const waitMins = isCompleted ? 0 : Math.max(10, (queuePos - 1) * 15);

    const bookingData = {
      id: row.id,
      farmerId: row.farmer_id,
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

    // Update live queue
    await db.query(
      `UPDATE live_queue SET current_status = $1, queue_position = CASE WHEN $1 = 'COMPLETED' THEN 0 ELSE queue_position END, last_updated = NOW() WHERE booking_id = $2`,
      [status, id]
    );

    // If completed or billing/payment stages, create/update procurement and payment records
    if (status === 'COMPLETED' || status === 'PAYMENT_INITIATED' || status === 'BILL_GENERATED') {
      const quantity = parseFloat(booking.estimated_quantity_quintals || 10);
      const msp = parseFloat(booking.msp_per_quintal || 2275);
      const totalAmount = (quantity * msp).toFixed(2);
      const billNumber = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(id).padStart(3, '0')}`;
      const utrNumber = `UTR${Date.now().toString().slice(-9)}`;
      const procStatus = status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
      const payStatus = status === 'COMPLETED' ? 'CREDITED' : 'INITIATED';

      const procRes = await db.query(
        `SELECT id FROM procurement_records WHERE booking_id = $1`,
        [id]
      );

      let procurementId;
      if (procRes.rows.length > 0) {
        procurementId = procRes.rows[0].id;
        await db.query(
          `UPDATE procurement_records SET status = $1, total_amount = $2 WHERE id = $3`,
          [procStatus, totalAmount, procurementId]
        );
      } else {
        const insProc = await db.query(
          `INSERT INTO procurement_records 
           (booking_id, farmer_id, centre_id, crop_id, actual_quantity_quintals, quality_grade, total_amount, bill_number, status)
           VALUES ($1, $2, $3, $4, $5, 'Grade A', $6, $7, $8)
           RETURNING id`,
          [id, booking.farmer_id, booking.centre_id, booking.crop_id, quantity, totalAmount, billNumber, procStatus]
        );
        procurementId = insProc.rows[0].id;
      }

      const payRes = await db.query(
        `SELECT id, utr_number FROM payments WHERE procurement_id = $1`,
        [procurementId]
      );

      if (payRes.rows.length === 0) {
        await db.query(
          `INSERT INTO payments 
           (procurement_id, farmer_id, amount, payment_status, utr_number, initiated_date, credited_date)
           VALUES ($1, $2, $3, $4, $5, NOW(), ${status === 'COMPLETED' ? 'NOW()' : 'NULL'})`,
          [procurementId, booking.farmer_id, totalAmount, payStatus, utrNumber]
        );
      } else if (status === 'COMPLETED') {
        await db.query(
          `UPDATE payments 
           SET payment_status = 'CREDITED', 
               utr_number = COALESCE(utr_number, $1), 
               credited_date = COALESCE(credited_date, NOW())
           WHERE id = $2`,
          [utrNumber, payRes.rows[0].id]
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