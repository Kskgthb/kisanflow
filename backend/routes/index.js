const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middleware/auth');

// Auth
router.post('/auth/register', authController.registerFarmer);
router.post('/auth/login', authController.loginFarmer);

// Bookings
router.get('/centres', bookingController.getCentres);
router.get('/centres/:centreId/slots/:date', bookingController.getAvailableSlots);
router.post('/bookings', authMiddleware, bookingController.createBooking);
router.get('/bookings/farmer/:farmerId', authMiddleware, bookingController.getFarmerBookings);

module.exports = router;