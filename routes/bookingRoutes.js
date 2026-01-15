const express = require('express');
const router = express.Router();
const {
    getBookings,
    getMyBookings,
    getBookingById,
    createBooking,
    updateBooking,
    getAvailableSlots,
    getSmsLogs,
    getEmailLogs
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getBookings)
    .post(protect, createBooking);

router.get('/mybookings', protect, getMyBookings);
router.get('/available-slots', getAvailableSlots);

router.route('/:id')
    .get(protect, getBookingById)
    .put(protect, updateBooking);

router.get('/:id/sms-logs', protect, admin, getSmsLogs);
router.get('/:id/email-logs', protect, admin, getEmailLogs);

module.exports = router;
