const Booking = require('../models/Booking');
const ServicePackage = require('../models/ServicePackage');

// @desc    Get all bookings (Admin only)
// @route   GET /api/bookings
// @access  Private/Admin
const getBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({}).sort({ date: 1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user bookings
// @route   GET /api/bookings/mybookings
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ patientId: req.user.patientId });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (booking) {
            if (req.user.role === 'admin' || booking.patientId.toString() === req.user.patientId.toString()) {
                res.json(booking);
            } else {
                res.status(403).json({ message: 'Not authorized' });
            }
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    try {
        const { packageId, date, timeSlot, notes } = req.body;

        const pkg = await ServicePackage.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }

        const booking = new Booking({
            patientId: req.user.patientId,
            patientName: req.user.name,
            packageId,
            packageName: pkg.name,
            date,
            timeSlot,
            notes,
            patientDetails: req.body.patientDetails || {}
        });

        const createdBooking = await booking.save();
        res.status(201).json(createdBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a booking
// @route   PUT /api/bookings/:id
// @access  Private
const updateBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (booking) {
            // Check authorization
            if (req.user.role !== 'admin' && booking.patientId.toString() !== req.user.patientId.toString()) {
                return res.status(403).json({ message: 'Not authorized' });
            }

            Object.assign(booking, req.body);
            const updatedBooking = await booking.save();
            res.json(updatedBooking);
        } else {
            res.status(404).json({ message: 'Booking not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get available time slots
// @route   GET /api/bookings/available-slots
// @access  Public
const getAvailableSlots = async (req, res) => {
    try {
        const { packageId, date } = req.query;
        if (!packageId || !date) {
            return res.status(400).json({ message: 'packageId and date are required' });
        }

        const pkg = await ServicePackage.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }

        const bookings = await Booking.find({
            packageId,
            date,
            status: { $ne: 'cancelled' }
        });

        const timeSlots = [];
        const durationInMinutes = pkg.duration;
        const concurrentSlots = pkg.concurrentServices;

        // Generate time slots from 9 AM to 5 PM
        for (let hour = 9; hour <= 16; hour++) {
            for (let minute = 0; minute < 60; minute += durationInMinutes) {
                if (hour === 17 && minute > 0) break;

                const startHour = hour;
                const startMinute = minute;
                const endMinute = minute + durationInMinutes;
                const endHour = hour + Math.floor(endMinute / 60);
                const adjustedEndMinute = endMinute % 60;

                const timeSlot = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

                // Count concurrent bookings that overlap with this time slot
                const concurrentBookings = bookings.filter((b) => {
                    const bookingTime = b.timeSlot || "";
                    if (!bookingTime) return false;

                    const bookingParts = bookingTime.split(':');
                    const bookingHour = parseInt(bookingParts[0]);
                    const bookingMinute = parseInt(bookingParts[1]);
                    const bookingEndMinute = bookingMinute + durationInMinutes;
                    // Simplified overlap check
                    const slotStartTime = startHour * 60 + startMinute;
                    const slotEndTime = endHour * 60 + adjustedEndMinute;
                    const bookingStartTime = bookingHour * 60 + bookingMinute;
                    const bookingEndTime = bookingHour * 60 + bookingEndMinute;

                    return !(slotEndTime <= bookingStartTime || slotStartTime >= bookingEndTime);
                }).length;

                if (concurrentBookings < concurrentSlots) {
                    timeSlots.push(timeSlot);
                }
            }
        }

        res.json(timeSlots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getBookings,
    getMyBookings,
    getBookingById,
    createBooking,
    updateBooking,
    getAvailableSlots
};
