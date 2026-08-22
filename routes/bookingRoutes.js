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
    getEmailLogs,
    getWhatsappLogs,
    getAllNotificationLogs,
    getBookingNotificationLogs,
    testSendEmail
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/test-email', testSendEmail);

router.get('/', protect, admin, getBookings);
router.post('/', createBooking);

router.get('/mybookings', protect, getMyBookings);
router.get('/available-slots', getAvailableSlots);
router.get('/notification-logs/all', protect, admin, getAllNotificationLogs);

router.route('/:id')
    .get(protect, getBookingById)
    .put(protect, updateBooking);

router.get('/:id/sms-logs', protect, admin, getSmsLogs);
router.get('/:id/email-logs', protect, admin, getEmailLogs);
router.get('/:id/whatsapp-logs', protect, admin, getWhatsappLogs);
router.get('/:id/all-notification-logs', protect, admin, getBookingNotificationLogs);

module.exports = router;
