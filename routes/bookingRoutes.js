const express = require('express');
const router = express.Router();
const {
    getBookings,
    getMyBookings,
    getBookingById,
    createBooking,
    updateBooking,
    getAvailableSlots
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

module.exports = router;
