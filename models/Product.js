const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    subtitle: String,
    description: String,
    image: String,
    category: {
        type: String,
        enum: ['oils', 'gels', 'lotions', 'shampoos']
    },
    keyIngredients: [String],
    freeFrom: [String],
    benefits: [String]
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
