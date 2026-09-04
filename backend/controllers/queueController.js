const db = require('../config/database');

exports.getLiveQueue = async (req, res) => {
    try {
        const { centreId } = req.params;
        
        const result = await db.query(
            `SELECT lq.*, sb.token_number, sb.slot_time, f.full_name as farmer_name, f.phone_number
             FROM live_queue lq
             JOIN slot_bookings sb ON lq.booking_id = sb.id
             JOIN farmers f ON sb.farmer_id = f.id
             WHERE lq.centre_id = $1 AND sb.booking_date = CURRENT_DATE
             ORDER BY lq.queue_position ASC`,
            [centreId]
        );
        
        res.json({ queue: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
};

exports.checkInFarmer = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        await db.query(
            `UPDATE slot_bookings SET status = 'CHECKED_IN' WHERE id = $1`,
            [bookingId]
        );
        
        await db.query(
            `UPDATE live_queue SET current_status = 'CHECKED_IN' WHERE booking_id = $1`,
            [bookingId]
        );
        
        res.json({ success: true, message: 'Farmer checked in successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Check-in failed' });
    }
};

exports.updateQueueStatus = async (req, res) => {
    try {
        const { queueId } = req.params;
        const { status } = req.body;
        
        await db.query(
            `UPDATE live_queue SET current_status = $1, last_updated = NOW() WHERE id = $2`,
            [status, queueId]
        );
        
        res.json({ success: true, message: 'Queue status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update queue status' });
    }
};

exports.getFarmerQueuePosition = async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        const result = await db.query(
            `SELECT lq.queue_position, lq.current_status, lq.estimated_wait_minutes,
                    sb.token_number
             FROM live_queue lq
             JOIN slot_bookings sb ON lq.booking_id = sb.id
             WHERE lq.booking_id = $1`,
            [bookingId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Queue position not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get queue position' });
    }
};