const express = require('express');
const router = express.Router();
const {
    getTreatments,
    getTreatmentById,
    createTreatment,
    updateTreatment,
    deleteTreatment
} = require('../controllers/treatmentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(getTreatments)
    .post(protect, admin, createTreatment);

router.route('/:id')
    .get(getTreatmentById)
    .put(protect, admin, updateTreatment)
    .delete(protect, admin, deleteTreatment);

module.exports = router;
