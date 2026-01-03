const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    patientName: String,
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServicePackage',
        required: true
    },
    packageName: String,
    date: {
        type: String, // String format YYYY-MM-DD
        required: true
    },
    timeSlot: String,
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
        default: 'pending'
    },
    notes: String,
    patientDetails: {
        email: String,
        phone: String,
        gender: String,
        country: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Booking', BookingSchema);
