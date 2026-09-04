const db = require('../config/database');

exports.recordWeighing = async (req, res) => {
    try {
        const { bookingId, actualQuantity, qualityGrade } = req.body;
        
        // Get booking details
        const bookingResult = await db.query(
            `SELECT sb.*, c.msp_per_quintal 
             FROM slot_bookings sb
             JOIN crops c ON sb.crop_id = c.id
             WHERE sb.id = $1`,
            [bookingId]
        );
        
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const booking = bookingResult.rows[0];
        const totalAmount = actualQuantity * booking.msp_per_quintal;
        const billNumber = `BILL-${Date.now()}`;
        
        // Create procurement record
        const result = await db.query(
            `INSERT INTO procurement_records (booking_id, farmer_id, centre_id, crop_id, actual_quantity_quintals, quality_grade, total_amount, bill_number, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'APPROVED')
             RETURNING *`,
            [bookingId, booking.farmer_id, booking.centre_id, booking.crop_id, actualQuantity, qualityGrade, totalAmount, billNumber]
        );
        
        // Update booking status
        await db.query(
            `UPDATE slot_bookings SET status = 'COMPLETED' WHERE id = $1`,
            [bookingId]
        );
        
        // Create payment record
        await db.query(
            `INSERT INTO payments (procurement_id, farmer_id, amount, payment_status)
             VALUES ($1, $2, $3, 'INITIATED')`,
            [result.rows[0].id, booking.farmer_id, totalAmount]
        );
        
        // Create notification
        await db.query(
            `INSERT INTO notifications (farmer_id, type, message)
             VALUES ($1, 'SMS', $2)`,
            [booking.farmer_id, `Your produce has been weighed. Total amount: ₹${totalAmount}. Bill: ${billNumber}`]
        );
        
        res.status(201).json({
            success: true,
            procurement: result.rows[0],
            message: 'Weighing recorded successfully'
        });
    } catch (error) {
        console.error('Weighing error:', error);
        res.status(500).json({ error: 'Failed to record weighing' });
    }
};

exports.getProcurementStatus = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        const result = await db.query(
            `SELECT pr.*, p.payment_status, p.utr_number, p.credited_date
             FROM procurement_records pr
             LEFT JOIN payments p ON pr.id = p.procurement_id
             WHERE pr.booking_id = $1`,
            [bookingId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No procurement record found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch status' });
    }
};