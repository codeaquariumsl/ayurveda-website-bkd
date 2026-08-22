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
        const isEmailEnabled = enableEmail !== undefined ? enableEmail : (process.env.ENABLE_EMAIL !== 'false');
        if (isEmailEnabled) {
            // 1. Send Alert Email to Owner (if OWNER_MAIL configured)
            const ownerEmail = process.env.OWNER_MAIL;
            if (ownerEmail) {
                const ownerSubject = `🚨 New Booking Alert: ${createdBooking.patientName} - ${createdBooking.packageName}`;
                const ownerHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2c7a4b; text-align: center; margin-bottom: 5px;">Siddhaka Ayurveda</h2>
                        <h3 style="color: #c0392b; border-bottom: 2px solid #2c7a4b; padding-bottom: 8px; margin-top: 0;">🚨 New Booking Notification</h3>
                        <p>You have received a new booking. Details are below:</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 6px 0;"><strong>Booking ID:</strong> ${createdBooking._id}</p>
                            <p style="margin: 6px 0;"><strong>Patient Name:</strong> ${createdBooking.patientName}</p>
                            <p style="margin: 6px 0;"><strong>Phone:</strong> ${createdBooking.patientDetails?.phone || 'N/A'}</p>
                            <p style="margin: 6px 0;"><strong>Email:</strong> ${createdBooking.patientDetails?.email || 'N/A'}</p>
                            <p style="margin: 6px 0;"><strong>Service / Package:</strong> ${createdBooking.packageName}</p>
                            <p style="margin: 6px 0;"><strong>Date:</strong> ${createdBooking.date}</p>
                            <p style="margin: 6px 0;"><strong>Time Slot:</strong> ${createdBooking.timeSlot}</p>
                            <p style="margin: 6px 0;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #2c7a4b; font-weight: bold;">${createdBooking.status}</span></p>
                            ${createdBooking.notes ? `<p style="margin: 6px 0;"><strong>Notes:</strong> ${createdBooking.notes}</p>` : ''}
                        </div>
                        <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">Siddhaka Ayurveda Admin Notification System</p>
                    </div>
                `;
                try {
                    await sendEmail({
                        bookingId: createdBooking._id,
                        email: ownerEmail,
                        subject: ownerSubject,
                        html: ownerHtml,
                        message: `New booking created for ${createdBooking.patientName} (${createdBooking.packageName}) on ${createdBooking.date} at ${createdBooking.timeSlot}.`,
                        type: 'booking_created'
                    });
                } catch (ownerEmailError) {
                    console.error('Failed to send creation Email to owner:', ownerEmailError);
                }
            }

            // 2. Send Confirmation Email to Patient
            if (createdBooking.patientDetails && createdBooking.patientDetails.email) {
                const subject = `Booking Confirmation - ${createdBooking.packageName}`;
                const html = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <h2 style="color: #2c7a4b; text-align: center;">Siddhaka Ayurveda</h2>
                        <h3 style="color: #333; border-bottom: 2px solid #2c7a4b; padding-bottom: 8px;">Booking Confirmation</h3>
                        <p>Dear <strong>${createdBooking.patientName}</strong>,</p>
                        <p>Thank you for choosing Siddhaka Ayurveda. Your booking has been successfully scheduled!</p>
                        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${createdBooking._id}</p>
                            <p style="margin: 5px 0;"><strong>Service / Package:</strong> ${createdBooking.packageName}</p>
                            <p style="margin: 5px 0;"><strong>Date:</strong> ${createdBooking.date}</p>
                            <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${createdBooking.timeSlot}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #2c7a4b; font-weight: bold;">${createdBooking.status}</span></p>
                            ${createdBooking.notes ? `<p style="margin: 5px 0;"><strong>Notes:</strong> ${createdBooking.notes}</p>` : ''}
                        </div>
                        <p>If you have any questions or need to make adjustments, feel free to contact us.</p>
                        <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">Siddhaka Ayurveda Clinic & Spa</p>
                    </div>
                `;
                try {
                    await sendEmail({
                        bookingId: createdBooking._id,
                        email: createdBooking.patientDetails.email,
                        subject,
                        html,
                        message: `Hello ${createdBooking.patientName}, your booking for ${createdBooking.packageName} on ${createdBooking.date} at ${createdBooking.timeSlot} has been created successfully. Status: ${createdBooking.status}.`,
                        type: 'booking_created'
                    });
                } catch (emailError) {
                    console.error('Failed to send creation Email to patient:', emailError);
                }
            }
        }

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
            const isEmailEnabled = enableEmail !== undefined ? enableEmail : (process.env.ENABLE_EMAIL !== 'false');
            if (isEmailEnabled) {
                const ownerEmail = process.env.OWNER_MAIL;
                if (ownerEmail) {
                    const ownerSubject = `🔄 Booking Update Alert: ${updatedBooking.patientName} - ${updatedBooking.packageName}`;
                    const ownerHtml = `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #2c7a4b; text-align: center; margin-bottom: 5px;">Siddhaka Ayurveda</h2>
                            <h3 style="color: #2980b9; border-bottom: 2px solid #2c7a4b; padding-bottom: 8px; margin-top: 0;">🔄 Booking Update Notification</h3>
                            <p>A booking has been modified:</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <p style="margin: 6px 0;"><strong>Booking ID:</strong> ${updatedBooking._id}</p>
                                <p style="margin: 6px 0;"><strong>Patient Name:</strong> ${updatedBooking.patientName}</p>
                                <p style="margin: 6px 0;"><strong>Phone:</strong> ${updatedBooking.patientDetails?.phone || 'N/A'}</p>
                                <p style="margin: 6px 0;"><strong>Email:</strong> ${updatedBooking.patientDetails?.email || 'N/A'}</p>
                                <p style="margin: 6px 0;"><strong>Service / Package:</strong> ${updatedBooking.packageName}</p>
                                <p style="margin: 6px 0;"><strong>Date:</strong> ${updatedBooking.date}</p>
                                <p style="margin: 6px 0;"><strong>Time Slot:</strong> ${updatedBooking.timeSlot}</p>
                                <p style="margin: 6px 0;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #2c7a4b; font-weight: bold;">${updatedBooking.status}</span></p>
                            </div>
                            <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">Siddhaka Ayurveda Admin Notification System</p>
                        </div>
                    `;
                    try {
                        await sendEmail({
                            bookingId: updatedBooking._id,
                            email: ownerEmail,
                            subject: ownerSubject,
                            html: ownerHtml,
                            message: `Booking updated for ${updatedBooking.patientName} (${updatedBooking.packageName}). Date: ${updatedBooking.date}, Time: ${updatedBooking.timeSlot}, Status: ${updatedBooking.status}.`,
                            type: 'booking_updated'
                        });
                    } catch (ownerEmailError) {
                        console.error('Failed to send update Email to owner:', ownerEmailError);
                    }
                }

                if (updatedBooking.patientDetails && updatedBooking.patientDetails.email) {
                    const subject = `Booking Update - ${updatedBooking.packageName}`;
                    const html = `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #2c7a4b; text-align: center;">Siddhaka Ayurveda</h2>
                            <h3 style="color: #333; border-bottom: 2px solid #2c7a4b; padding-bottom: 8px;">Booking Update</h3>
                            <p>Dear <strong>${updatedBooking.patientName}</strong>,</p>
                            <p>Your booking details have been updated:</p>
                            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <p style="margin: 5px 0;"><strong>Booking ID:</strong> ${updatedBooking._id}</p>
                                <p style="margin: 5px 0;"><strong>Service / Package:</strong> ${updatedBooking.packageName}</p>
                                <p style="margin: 5px 0;"><strong>Date:</strong> ${updatedBooking.date}</p>
                                <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${updatedBooking.timeSlot}</p>
                                <p style="margin: 5px 0;"><strong>Status:</strong> <span style="text-transform: capitalize; color: #2c7a4b; font-weight: bold;">${updatedBooking.status}</span></p>
                            </div>
                            <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">Siddhaka Ayurveda Clinic & Spa</p>
                        </div>
                    `;
                    try {
                        await sendEmail({
                            bookingId: updatedBooking._id,
                            email: updatedBooking.patientDetails.email,
                            subject,
                            html,
                            message: `Hello ${updatedBooking.patientName}, your booking for ${updatedBooking.packageName} has been updated. Date: ${updatedBooking.date}, Time: ${updatedBooking.timeSlot}, Status: ${updatedBooking.status}.`,
                            type: 'booking_updated'
                        });
                    } catch (emailError) {
                        console.error('Failed to send update Email to patient:', emailError);
                    }
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

// @desc    Test Email sending via Brevo SMTP
// @route   POST /api/bookings/test-email
// @access  Public
const testSendEmail = async (req, res) => {
    try {
        const { to, subject, html, message } = req.body || {};
        if (!to) {
            return res.status(400).json({ success: false, message: 'Recipient email "to" is required in request body (e.g. { "to": "email@example.com" })' });
        }
        const info = await sendEmail(
            to,
            subject || 'Brevo SMTP Test Email - Siddhaka Ayurveda',
            html || `<h2>Brevo SMTP Test</h2><p>${message || 'This is a test email sent from Siddhaka Ayurveda backend.'}</p>`
        );
        res.json({
            success: true,
            message: `Email successfully sent to ${to}`,
            info
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            code: error.code,
            response: error.response
        });
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
    getBookingNotificationLogs,
    testSendEmail
};

