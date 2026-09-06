const db = require('../config/database');

// GET /api/admin/stats
exports.getAdminStats = async (req, res) => {
  try {
    const { centreId } = req.query;
    let centreFilter = '';
    const params = [];

    if (centreId && centreId !== 'all') {
      centreFilter = 'WHERE sb.centre_id = $1';
      params.push(centreId);
    }

    // High level counts
    const bookingsSummary = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN sb.booking_date = CURRENT_DATE THEN 1 END) as today_bookings,
        COUNT(CASE WHEN sb.status = 'COMPLETED' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN sb.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as active_queue,
        COALESCE(SUM(sb.estimated_quantity_quintals), 0) as total_estimated_quintals
      FROM slot_bookings sb
      ${centreFilter}
    `, params);

    // Payments summary
    const paymentsSummary = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN p.payment_status = 'CREDITED' THEN p.amount ELSE 0 END), 0) as total_disbursed,
        COALESCE(SUM(CASE WHEN p.payment_status != 'CREDITED' THEN p.amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN p.payment_status = 'CREDITED' THEN 1 END) as credited_count
      FROM payments p
      JOIN procurement_records pr ON p.procurement_id = pr.id
      JOIN slot_bookings sb ON pr.booking_id = sb.id
      ${centreFilter}
    `, params);

    // Procurement records summary
    const procSummary = await db.query(`
      SELECT 
        COALESCE(SUM(pr.actual_quantity_quintals), 0) as actual_procured_quintals,
        COUNT(*) as total_procurements
      FROM procurement_records pr
      JOIN slot_bookings sb ON pr.booking_id = sb.id
      ${centreFilter}
    `, params);

    // Centre-wise capacity & stats
    const centresStats = await db.query(`
      SELECT 
        pc.id, pc.name, pc.district, pc.state, pc.daily_capacity_quintals,
        COUNT(sb.id) as total_bookings,
        COUNT(CASE WHEN sb.booking_date = CURRENT_DATE THEN 1 END) as today_bookings,
        COUNT(CASE WHEN sb.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END) as active_queue,
        COALESCE(SUM(CASE WHEN sb.booking_date = CURRENT_DATE THEN sb.estimated_quantity_quintals ELSE 0 END), 0) as today_booked_quintals
      FROM procurement_centres pc
      LEFT JOIN slot_bookings sb ON pc.id = sb.centre_id
      GROUP BY pc.id
      ORDER BY pc.id ASC
    `);

    // Crop-wise distribution
    const cropsStats = await db.query(`
      SELECT 
        c.id, c.name, c.season, c.msp_per_quintal,
        COUNT(sb.id) as total_bookings,
        COALESCE(SUM(sb.estimated_quantity_quintals), 0) as total_quantity,
        COALESCE(SUM(pr.total_amount), 0) as total_payout
      FROM crops c
      LEFT JOIN slot_bookings sb ON c.id = sb.crop_id
      LEFT JOIN procurement_records pr ON sb.id = pr.booking_id
      GROUP BY c.id
      ORDER BY total_bookings DESC
    `);

    const summary = bookingsSummary.rows[0] || {};
    const payment = paymentsSummary.rows[0] || {};
    const procurement = procSummary.rows[0] || {};

    res.json({
      success: true,
      stats: {
        totalBookings: parseInt(summary.total_bookings || 0),
        todayBookings: parseInt(summary.today_bookings || 0),
        completedBookings: parseInt(summary.completed_bookings || 0),
        activeQueue: parseInt(summary.active_queue || 0),
        totalEstimatedQuintals: parseFloat(summary.total_estimated_quintals || 0),
        actualProcuredQuintals: parseFloat(procurement.actual_procured_quintals || 0),
        totalDisbursed: parseFloat(payment.total_disbursed || 0),
        pendingAmount: parseFloat(payment.pending_amount || 0),
        creditedTransactions: parseInt(payment.credited_count || 0),
      },
      centres: centresStats.rows,
      crops: cropsStats.rows,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

// GET /api/admin/bookings
exports.getAdminBookings = async (req, res) => {
  try {
    const { centreId, status, cropId, search, date } = req.query;
    let query = `
      SELECT 
        sb.id, sb.token_number, sb.booking_date, sb.slot_time, 
        sb.estimated_quantity_quintals as quantity, sb.status, sb.created_at,
        f.id as farmer_id, f.full_name as farmer_name, f.phone_number, f.village, f.district as farmer_district,
        f.bank_account, f.bank_ifsc,
        pc.id as centre_id, pc.name as centre_name, pc.district as centre_district,
        c.id as crop_id, c.name as crop_name, c.msp_per_quintal,
        lq.queue_position, lq.current_status as queue_status,
        pr.bill_number, pr.actual_quantity_quintals, pr.quality_grade, pr.total_amount as procurement_amount, pr.status as procurement_status,
        pay.id as payment_id, pay.payment_status, pay.utr_number, pay.amount as payment_amount, pay.credited_date, pay.initiated_date
      FROM slot_bookings sb
      JOIN farmers f ON sb.farmer_id = f.id
      JOIN procurement_centres pc ON sb.centre_id = pc.id
      JOIN crops c ON sb.crop_id = c.id
      LEFT JOIN live_queue lq ON sb.id = lq.booking_id
      LEFT JOIN procurement_records pr ON sb.id = pr.booking_id
      LEFT JOIN payments pay ON pr.id = pay.procurement_id
      WHERE 1=1
    `;
    const params = [];

    if (centreId && centreId !== 'all') {
      params.push(centreId);
      query += ` AND sb.centre_id = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND sb.status = $${params.length}`;
    }

    if (cropId && cropId !== 'all') {
      params.push(cropId);
      query += ` AND sb.crop_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND sb.booking_date = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      query += ` AND (
        LOWER(f.full_name) LIKE $${pIdx} OR 
        f.phone_number LIKE $${pIdx} OR 
        LOWER(sb.token_number) LIKE $${pIdx} OR 
        LOWER(COALESCE(pr.bill_number, '')) LIKE $${pIdx} OR
        LOWER(COALESCE(pay.utr_number, '')) LIKE $${pIdx}
      )`;
    }

    query += ` ORDER BY sb.booking_date DESC, sb.slot_time ASC, sb.id DESC LIMIT 200`;

    const result = await db.query(query, params);
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('Admin bookings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// PATCH or POST /api/admin/bookings/:id/stage
exports.updateBookingStage = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, actualQuantity, qualityGrade } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    if (status === 'PAYMENT_CREDITED') {
      status = 'COMPLETED';
    }

    const bookingRes = await db.query(`
      SELECT sb.*, pc.name as centre_name, c.name as crop_name, c.msp_per_quintal
      FROM slot_bookings sb
      LEFT JOIN procurement_centres pc ON sb.centre_id = pc.id
      LEFT JOIN crops c ON sb.crop_id = c.id
      WHERE sb.id = $1
    `, [id]);

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

    // Manage procurement & payments records
    if (status === 'COMPLETED' || status === 'PAYMENT_INITIATED' || status === 'BILL_GENERATED' || status === 'QUALITY_CHECK' || status === 'WEIGHING') {
      const quantity = parseFloat(actualQuantity || booking.estimated_quantity_quintals || 10);
      const msp = parseFloat(booking.msp_per_quintal || 2275);
      const totalAmount = (quantity * msp).toFixed(2);
      const billNumber = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(id).padStart(3, '0')}`;
      const utrNumber = `UTR${Date.now().toString().slice(-9)}`;
      const grade = qualityGrade || 'Grade A';
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
          `UPDATE procurement_records 
           SET status = $1, actual_quantity_quintals = $2, quality_grade = $3, total_amount = $4 
           WHERE id = $5`,
          [procStatus, quantity, grade, totalAmount, procurementId]
        );
      } else {
        const insProc = await db.query(
          `INSERT INTO procurement_records 
           (booking_id, farmer_id, centre_id, crop_id, actual_quantity_quintals, quality_grade, total_amount, bill_number, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [id, booking.farmer_id, booking.centre_id, booking.crop_id, quantity, grade, totalAmount, billNumber, procStatus]
        );
        procurementId = insProc.rows[0].id;
      }

      if (status === 'PAYMENT_INITIATED' || status === 'COMPLETED') {
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
                 amount = $1,
                 utr_number = COALESCE(utr_number, $2), 
                 credited_date = COALESCE(credited_date, NOW())
             WHERE id = $3`,
            [totalAmount, utrNumber, payRes.rows[0].id]
          );
        }
      }
    }

    res.json({
      success: true,
      booking: updateRes.rows[0],
      status
    });
  } catch (error) {
    console.error('Admin update stage error:', error);
    res.status(500).json({ error: 'Failed to update booking stage' });
  }
};

// GET /api/admin/farmers
exports.getAdminFarmers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        f.id, f.full_name, f.phone_number, f.aadhar_number, f.village, f.district, f.state,
        f.bank_account, f.bank_ifsc, f.land_area_acres, f.created_at,
        COUNT(sb.id) as total_bookings,
        COUNT(CASE WHEN sb.status = 'COMPLETED' THEN 1 END) as completed_bookings,
        COALESCE(SUM(CASE WHEN sb.status = 'COMPLETED' THEN sb.estimated_quantity_quintals ELSE 0 END), 0) as delivered_quintals
      FROM farmers f
      LEFT JOIN slot_bookings sb ON f.id = sb.farmer_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      query += ` AND (LOWER(f.full_name) LIKE $${pIdx} OR f.phone_number LIKE $${pIdx} OR f.aadhar_number LIKE $${pIdx} OR LOWER(f.village) LIKE $${pIdx})`;
    }

    query += ` GROUP BY f.id ORDER BY f.id DESC LIMIT 100`;

    const result = await db.query(query, params);
    res.json({ farmers: result.rows });
  } catch (error) {
    console.error('Admin farmers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
};

// GET /api/admin/procurements
exports.getAdminProcurements = async (req, res) => {
  try {
    const { centreId, search } = req.query;
    let query = `
      SELECT 
        pr.*, 
        f.full_name as farmer_name, f.phone_number, f.bank_account, f.bank_ifsc,
        pc.name as centre_name, pc.district as centre_district,
        c.name as crop_name, c.msp_per_quintal,
        sb.token_number, sb.booking_date,
        p.id as payment_id, p.payment_status, p.utr_number, p.amount as payment_amount, p.initiated_date, p.credited_date
      FROM procurement_records pr
      JOIN farmers f ON pr.farmer_id = f.id
      JOIN procurement_centres pc ON pr.centre_id = pc.id
      JOIN crops c ON pr.crop_id = c.id
      JOIN slot_bookings sb ON pr.booking_id = sb.id
      LEFT JOIN payments p ON pr.id = p.procurement_id
      WHERE 1=1
    `;
    const params = [];

    if (centreId && centreId !== 'all') {
      params.push(centreId);
      query += ` AND pr.centre_id = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      query += ` AND (
        LOWER(f.full_name) LIKE $${pIdx} OR 
        LOWER(pr.bill_number) LIKE $${pIdx} OR 
        LOWER(COALESCE(p.utr_number, '')) LIKE $${pIdx} OR 
        f.phone_number LIKE $${pIdx}
      )`;
    }

    query += ` ORDER BY pr.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);
    res.json({ procurements: result.rows });
  } catch (error) {
    console.error('Admin procurements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch procurements' });
  }
};

// PATCH /api/admin/crops/:id/msp
exports.updateCropMsp = async (req, res) => {
  try {
    const { id } = req.params;
    const { msp } = req.body;

    if (!msp || isNaN(msp)) {
      return res.status(400).json({ error: 'Valid MSP is required' });
    }

    const result = await db.query(
      `UPDATE crops SET msp_per_quintal = $1 WHERE id = $2 RETURNING *`,
      [parseFloat(msp), id]
    );

    res.json({ success: true, crop: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update MSP' });
  }
};

// PATCH /api/admin/centres/:id/capacity
exports.updateCentreCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const { capacity } = req.body;

    if (!capacity || isNaN(capacity)) {
      return res.status(400).json({ error: 'Valid capacity is required' });
    }

    const result = await db.query(
      `UPDATE procurement_centres SET daily_capacity_quintals = $1 WHERE id = $2 RETURNING *`,
      [parseInt(capacity), id]
    );

    res.json({ success: true, centre: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update capacity' });
  }
};
