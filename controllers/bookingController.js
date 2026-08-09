const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ServicePackage = require('../models/ServicePackage');
const SmsLog = require('../models/SmsLog');
const EmailLog = require('../models/EmailLog');
const WhatsappLog = require('../models/WhatsappLog');
const { sendSMS } = require('../utils/smsService');
const { sendEmail } = require('../utils/emailService');
const { sendWhatsApp } = require('../utils/whatsappService');

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
        const { packageId, date, timeSlot, notes, patientDetails } = req.body;
        let pkgName = '';
        let finalPackageId = packageId;

        // Handle special case for "consultation" or non-ObjectId strings
        if (packageId === 'consultation') {
            pkgName = 'General Consultation';
            finalPackageId = null; // Or keep it as 'consultation' if the model allows it
        } else {
            // Check if packageId is a valid MongoDB ObjectId
            if (mongoose.Types.ObjectId.isValid(packageId)) {
                const pkg = await ServicePackage.findById(packageId);
                if (pkg) {
                    pkgName = pkg.name;
                } else {
                    return res.status(404).json({ message: 'Package not found' });
                }
            } else {
                // If not a valid ID, treat it as a custom package name if provided
                pkgName = notes?.includes('Book') ? notes.replace('Book ', '') : (packageId || 'General Service');
                finalPackageId = null;
            }
        }

        const patientId = req.user ? req.user.patientId : null;
        const patientName = req.user ? req.user.name : (patientDetails?.name || 'Guest');

        const booking = new Booking({
            patientId,
            patientName,
            packageId: finalPackageId,
            packageName: pkgName,
            date,
            timeSlot,
            notes,
            patientDetails: patientDetails || {}
        });

        const createdBooking = await booking.save();

        const { enableSMS, enableEmail, enableWhatsApp } = req.app.locals.notifications || {};

        // Send SMS Notification
        if (enableSMS && createdBooking.patientDetails && createdBooking.patientDetails.phone) {
            const message = `Hello ${createdBooking.patientName}, your booking for ${createdBooking.packageName} on ${createdBooking.date} at ${createdBooking.timeSlot} has been created successfully. Status: ${createdBooking.status}.`;
            try {
                await sendSMS({
                    bookingId: createdBooking._id,
                    phone: createdBooking.patientDetails.phone,
                    message,
                    type: 'booking_created'
                });
            } catch (smsError) {
                console.error('Failed to send creation SMS:', smsError);
            }
        }

        // Send Email Notification
        // if (enableEmail && createdBooking.patientDetails && createdBooking.patientDetails.email) {
        //     const subject = 'Booking Confirmation';
        //     const message = `Hello ${createdBooking.patientName}, your booking for ${createdBooking.packageName} on ${createdBooking.date} at ${createdBooking.timeSlot} has been created successfully. Status: ${createdBooking.status}.`;
        //     try {
        //         await sendEmail({
        //             bookingId: createdBooking._id,
        //             email: createdBooking.patientDetails.email,
        //             subject,
        //             message,
        //             type: 'booking_created'
        //         });
        //     } catch (emailError) {
        //         console.error('Failed to send creation Email:', emailError);
        //     }
        // }

        // Send WhatsApp Notification to Owner & Patient/Client
        const isWhatsAppEnabled = enableWhatsApp !== undefined ? enableWhatsApp : (process.env.ENABLE_WHATSAPP !== 'false');
        if (isWhatsAppEnabled) {
            // 1. Send to Owner
            const ownerPhone = process.env.OWNER_WHATSAPP_NUMBER;
            const waMessage = `🚨 *New Booking Alert!*\n\n` +
                `*Booking ID:* ${createdBooking._id}\n` +
                `*Patient Name:* ${createdBooking.patientName}\n` +
                `*Phone:* ${createdBooking.patientDetails?.phone || 'N/A'}\n` +
                `*Email:* ${createdBooking.patientDetails?.email || 'N/A'}\n` +
                `*Service/Package:* ${createdBooking.packageName}\n` +
                `*Date:* ${createdBooking.date}\n` +
                `*Time Slot:* ${createdBooking.timeSlot}\n` +
                `*Status:* ${createdBooking.status}\n` +
                `*Notes:* ${createdBooking.notes || 'None'}`;

            try {
                await sendWhatsApp({
                    bookingId: createdBooking._id,
                    phone: ownerPhone,
                    message: waMessage,
                    type: 'booking_created'
                });
            } catch (waError) {
                console.error('Failed to send creation WhatsApp message to owner:', waError);
            }

            // 2. Send to Patient/Client if phone is provided
            if (createdBooking.patientDetails && createdBooking.patientDetails.phone) {
                const clientMessage = `Hello ${createdBooking.patientName}, your booking for ${createdBooking.packageName} on ${createdBooking.date} at ${createdBooking.timeSlot} has been created successfully. Status: ${createdBooking.status}. Thank you for choosing Siddhaka Ayurveda!`;
                try {
                    await sendWhatsApp({
                        bookingId: createdBooking._id,
                        phone: createdBooking.patientDetails.phone,
                        message: clientMessage,
                        type: 'booking_created'
                    });
                } catch (waClientError) {
                    console.error('Failed to send creation WhatsApp message to client:', waClientError);
                }
            }
        }

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

            const { enableSMS, enableEmail } = req.app.locals.notifications;

            // Send SMS Notification for updates
            if (enableSMS && updatedBooking.patientDetails && updatedBooking.patientDetails.phone) {
                const message = `Hello ${updatedBooking.patientName}, your booking for ${updatedBooking.packageName} has been updated. Date: ${updatedBooking.date}, Time: ${updatedBooking.timeSlot}, Status: ${updatedBooking.status}.`;
                try {
                    await sendSMS({
                        bookingId: updatedBooking._id,
                        phone: updatedBooking.patientDetails.phone,
                        message,
                        type: 'booking_updated'
                    });
                } catch (smsError) {
                    console.error('Failed to send update SMS:', smsError);
                }
            }

            // Send Email Notification for updates
            if (enableEmail && updatedBooking.patientDetails && updatedBooking.patientDetails.email) {
                const subject = 'Booking Update';
                const message = `Hello ${updatedBooking.patientName}, your booking for ${updatedBooking.packageName} has been updated. Date: ${updatedBooking.date}, Time: ${updatedBooking.timeSlot}, Status: ${updatedBooking.status}.`;
                try {
                    await sendEmail({
                        bookingId: updatedBooking._id,
                        email: updatedBooking.patientDetails.email,
                        subject,
                        message,
                        type: 'booking_updated'
                    });
                } catch (emailError) {
                    console.error('Failed to send update Email:', emailError);
                }
            }

            // Send WhatsApp Notification for updates
            const isWhatsAppEnabled = req.app.locals.notifications?.enableWhatsApp !== undefined
                ? req.app.locals.notifications.enableWhatsApp
                : (process.env.ENABLE_WHATSAPP !== 'false');

            if (isWhatsAppEnabled && updatedBooking.patientDetails && updatedBooking.patientDetails.phone) {
                const message = `Hello ${updatedBooking.patientName}, your booking for ${updatedBooking.packageName} has been updated. Date: ${updatedBooking.date}, Time: ${updatedBooking.timeSlot}, Status: ${updatedBooking.status}.`;
                try {
                    await sendWhatsApp({
                        bookingId: updatedBooking._id,
                        phone: updatedBooking.patientDetails.phone,
                        message,
                        type: 'booking_updated'
                    });
                } catch (waUpdateError) {
                    console.error('Failed to send update WhatsApp message:', waUpdateError);
                }
            }

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
                // const concurrentBookings = bookings.filter((b) => {
                //     const bookingTime = b.timeSlot || "";
                //     if (!bookingTime) return false;

                //     const bookingParts = bookingTime.split(':');
                //     const bookingHour = parseInt(bookingParts[0]);
                //     const bookingMinute = parseInt(bookingParts[1]);
                //     const bookingEndMinute = bookingMinute + durationInMinutes;
                //     // Simplified overlap check
                //     const slotStartTime = startHour * 60 + startMinute;
                //     const slotEndTime = endHour * 60 + adjustedEndMinute;
                //     const bookingStartTime = bookingHour * 60 + bookingMinute;
                //     const bookingEndTime = bookingHour * 60 + bookingEndMinute;

                //     return !(slotEndTime <= bookingStartTime || slotStartTime >= bookingEndTime);
                // }).length;

                // if (concurrentBookings < concurrentSlots) {
                //     timeSlots.push(timeSlot);
                // }
                timeSlots.push(timeSlot);
            }
        }

        res.json(timeSlots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get SMS logs for a booking
// @route   GET /api/bookings/:id/sms-logs
// @access  Private/Admin
const getSmsLogs = async (req, res) => {
    try {
        const smsLogs = await SmsLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 });
        res.json(smsLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Email logs for a booking
// @route   GET /api/bookings/:id/email-logs
// @access  Private/Admin
const getEmailLogs = async (req, res) => {
    try {
        const emailLogs = await EmailLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 });
        res.json(emailLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get WhatsApp logs for a booking
// @route   GET /api/bookings/:id/whatsapp-logs
// @access  Private/Admin
const getWhatsappLogs = async (req, res) => {
    try {
        const whatsappLogs = await WhatsappLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 });
        res.json(whatsappLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all notification logs (SMS, WhatsApp, Email)
// @route   GET /api/bookings/notification-logs/all
// @access  Private/Admin
const getAllNotificationLogs = async (req, res) => {
    try {
        const [smsLogs, emailLogs, whatsappLogs] = await Promise.all([
            SmsLog.find({}).populate('bookingId', 'patientName packageName date timeSlot').sort({ createdAt: -1 }),
            EmailLog.find({}).populate('bookingId', 'patientName packageName date timeSlot').sort({ createdAt: -1 }),
            WhatsappLog.find({}).populate('bookingId', 'patientName packageName date timeSlot').sort({ createdAt: -1 })
        ]);

        const formattedSms = smsLogs.map(log => ({
            _id: log._id,
            channel: 'SMS',
            bookingId: log.bookingId?._id || log.bookingId,
            patientName: log.bookingId?.patientName || 'N/A',
            packageName: log.bookingId?.packageName || 'N/A',
            recipient: log.patientPhone,
            message: log.message,
            type: log.type,
            status: log.status,
            providerResponse: log.providerResponse,
            createdAt: log.createdAt
        }));

        const formattedEmail = emailLogs.map(log => ({
            _id: log._id,
            channel: 'Email',
            bookingId: log.bookingId?._id || log.bookingId,
            patientName: log.bookingId?.patientName || 'N/A',
            packageName: log.bookingId?.packageName || 'N/A',
            recipient: log.patientEmail,
            message: log.message,
            type: log.type,
            status: log.status,
            providerResponse: log.providerResponse,
            createdAt: log.createdAt
        }));

        const formattedWhatsapp = whatsappLogs.map(log => ({
            _id: log._id,
            channel: 'WhatsApp',
            bookingId: log.bookingId?._id || log.bookingId,
            patientName: log.bookingId?.patientName || 'N/A',
            packageName: log.bookingId?.packageName || 'N/A',
            recipient: log.recipientPhone,
            message: log.message,
            type: log.type,
            status: log.status,
            providerResponse: log.providerResponse,
            createdAt: log.createdAt
        }));

        const allLogs = [...formattedSms, ...formattedEmail, ...formattedWhatsapp].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(allLogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all notification logs for a specific booking
// @route   GET /api/bookings/:id/all-notification-logs
// @access  Private/Admin
const getBookingNotificationLogs = async (req, res) => {
    try {
        const [smsLogs, emailLogs, whatsappLogs] = await Promise.all([
            SmsLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 }),
            EmailLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 }),
            WhatsappLog.find({ bookingId: req.params.id }).sort({ createdAt: -1 })
        ]);

        const formattedSms = smsLogs.map(log => ({ ...log._doc, channel: 'SMS', recipient: log.patientPhone }));
        const formattedEmail = emailLogs.map(log => ({ ...log._doc, channel: 'Email', recipient: log.patientEmail }));
        const formattedWhatsapp = whatsappLogs.map(log => ({ ...log._doc, channel: 'WhatsApp', recipient: log.recipientPhone }));

        const allLogs = [...formattedSms, ...formattedEmail, ...formattedWhatsapp].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(allLogs);
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
    getAvailableSlots,
    getSmsLogs,
    getEmailLogs,
    getWhatsappLogs,
    getAllNotificationLogs,
    getBookingNotificationLogs
};
