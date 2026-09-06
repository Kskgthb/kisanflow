const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const { sendSMS, sendFast2SMS } = require('../services/smsService');

// Auth
router.post('/auth/register', authController.registerFarmer);
router.post('/auth/login', authController.loginFarmer);

// Bookings
router.get('/centres', bookingController.getCentres);
router.get('/centres/:centreId/slots/:date', bookingController.getAvailableSlots);
router.post('/bookings', authMiddleware, bookingController.createBooking);
router.get('/bookings/farmer/:farmerId', authMiddleware, bookingController.getFarmerBookings);
router.get('/bookings/:id', bookingController.getBookingById);
router.patch('/bookings/:id/status', bookingController.updateBookingStatus);
router.post('/bookings/:id/status', bookingController.updateBookingStatus);

// Payments
router.get('/payments/farmer/:farmerId', bookingController.getFarmerPayments);

// Admin / Mandi Officer Portal
router.get('/admin/stats', adminController.getAdminStats);
router.get('/admin/bookings', adminController.getAdminBookings);
router.patch('/admin/bookings/:id/stage', adminController.updateBookingStage);
router.post('/admin/bookings/:id/stage', adminController.updateBookingStage);
router.get('/admin/farmers', adminController.getAdminFarmers);
router.get('/admin/procurements', adminController.getAdminProcurements);
router.patch('/admin/crops/:id/msp', adminController.updateCropMsp);
router.patch('/admin/centres/:id/capacity', adminController.updateCentreCapacity);

// Diagnostic SMS test endpoint
router.get('/test-sms/:phone', async (req, res) => {
  const phone = req.params.phone.replace(/[^0-9]/g, '').slice(-10);
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      apiKeyConfigured: false,
      error: 'FAST2SMS_API_KEY environment variable is NOT present in Vercel backend environment variables.',
      tip: 'Please add FAST2SMS_API_KEY to your Vercel backend (kisanflow-tgvk) settings and Redeploy.'
    });
  }

  try {
    const result = await sendFast2SMS(phone, 'KisanFlow Alert: Token KISAN-TEST Queue 1. Mandi Samiti Ludhiana.', apiKey);
    return res.json({
      success: true,
      apiKeyConfigured: true,
      result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      apiKeyConfigured: true,
      error: err.message
    });
  }
});

module.exports = router;