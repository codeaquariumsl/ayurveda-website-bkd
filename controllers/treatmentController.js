const Treatment = require('../models/Treatment');

// @desc    Get all treatments
// @route   GET /api/treatments
// @access  Public
const getTreatments = async (req, res) => {
    try {
        const treatments = await Treatment.find({});
        res.json(treatments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single treatment
// @route   GET /api/treatments/:id
// @access  Public
const getTreatmentById = async (req, res) => {
    try {
        const treatment = await Treatment.findById(req.params.id);
        if (treatment) {
            res.json(treatment);
        } else {
            res.status(404).json({ message: 'Treatment not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a treatment
// @route   POST /api/treatments
// @access  Private/Admin
const createTreatment = async (req, res) => {
    try {
        const treatment = new Treatment(req.body);
        const createdTreatment = await treatment.save();
        res.status(201).json(createdTreatment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a treatment
// @route   PUT /api/treatments/:id
// @access  Private/Admin
const updateTreatment = async (req, res) => {
    try {
        const treatment = await Treatment.findById(req.params.id);
        if (treatment) {
            Object.assign(treatment, req.body);
            const updatedTreatment = await treatment.save();
            res.json(updatedTreatment);
        } else {
            res.status(404).json({ message: 'Treatment not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a treatment
// @route   DELETE /api/treatments/:id
// @access  Private/Admin
const deleteTreatment = async (req, res) => {
    try {
        const treatment = await Treatment.findById(req.params.id);
        if (treatment) {
            await Treatment.deleteOne({ _id: req.params.id });
            res.json({ message: 'Treatment removed' });
        } else {
            res.status(404).json({ message: 'Treatment not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getTreatments,
    getTreatmentById,
    createTreatment,
    updateTreatment,
    deleteTreatment
};
