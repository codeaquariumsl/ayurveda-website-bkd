const mongoose = require('mongoose');

const SmsLogSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    patientPhone: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed'],
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending'],
        default: 'pending'
    },
    providerResponse: {
        type: Object
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SmsLog', SmsLogSchema);
