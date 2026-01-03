const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    dateOfBirth: String,
    address: String,
    country: String,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', '']
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Patient', PatientSchema);
