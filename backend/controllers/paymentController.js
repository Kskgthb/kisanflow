const db = require('../config/database');

exports.getPaymentHistory = async (req, res) => {
    try {
        const { farmerId } = req.params;
        
        const result = await db.query(
            `SELECT p.*, pr.bill_number, pr.actual_quantity_quintals, c.name as crop_name
             FROM payments p
             JOIN procurement_records pr ON p.procurement_id = pr.id
             JOIN crops c ON pr.crop_id = c.id
             WHERE p.farmer_id = $1
             ORDER BY p.initiated_date DESC`,
            [farmerId]
        );
        
        res.json({ payments: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { status, utrNumber } = req.body;
        
        await db.query(
            `UPDATE payments SET payment_status = $1, utr_number = $2, 
             credited_date = CASE WHEN $1 = 'CREDITED' THEN NOW() ELSE credited_date END
             WHERE id = $3`,
            [status, utrNumber, paymentId]
        );
        
        res.json({ success: true, message: 'Payment status updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update payment' });
    }
};