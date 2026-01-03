const mongoose = require('mongoose');

const ServicePackageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    category: {
        type: String,
        enum: ['wellness', 'special', 'signature'],
        required: true
    },
    subcategory: {
        type: String,
        enum: ['head-hair', 'body-skin', 'facial', 'foot', 'full-day', 'half-day', '7-day']
    },
    description: String,
    includes: [String],
    benefits: String,
    image: String,
    focus: String,
    featured: {
        type: Boolean,
        default: false
    },
    concurrentServices: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ServicePackage', ServicePackageSchema);
