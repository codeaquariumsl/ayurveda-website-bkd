const mongoose = require('mongoose');

const treatmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['head-care', 'body-care', 'facial-care', 'foot-care']
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    },
    benefits: [{
        type: String
    }]
}, {
    timestamps: true
});

const Treatment = mongoose.model('Treatment', treatmentSchema);

module.exports = Treatment;
