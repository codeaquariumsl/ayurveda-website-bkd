const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: false
    },
    patientEmail: {
        type: String,
        required: true
    },
    subject: {
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

module.exports = mongoose.model('EmailLog', EmailLogSchema);
