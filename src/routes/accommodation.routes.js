const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { requireAdmin } = require('../middleware/auth.middleware');
const {
    getDistinctAccommodationDestinations,
    getDistinctAccommodationThemes,
    getDistinctAccommodationAmenities,
    getAllAccommodations,
    getAccommodationById,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation
} = require('../controllers/accommodation.controller');

const router = express.Router();

// Public routes
router.get('/filters/destinations', getDistinctAccommodationDestinations);
router.get('/filters/themes', getDistinctAccommodationThemes);
router.get('/filters/amenities', getDistinctAccommodationAmenities);
router.get('/', getAllAccommodations);
router.get('/:id', getAccommodationById);

// Admin routes
router.post('/', ClerkExpressRequireAuth(), requireAdmin, createAccommodation);
router.put('/:accommodationId', ClerkExpressRequireAuth(), requireAdmin, updateAccommodation);
router.delete('/:id', ClerkExpressRequireAuth(), requireAdmin, deleteAccommodation);

module.exports = router;