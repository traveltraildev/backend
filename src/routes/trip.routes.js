const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { requireAdmin } = require('../middleware/auth.middleware');
const {
    getDistinctTripDestinations,
    getDistinctTripThemes,
    getDistinctTripInclusions,
    getDistinctTripExclusions,
    getTripsByTheme,
    getAllTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip
} = require('../controllers/trip.controller');

const router = express.Router();

// Public routes
router.get('/filters/destinations', getDistinctTripDestinations);
router.get('/filters/themes', getDistinctTripThemes);
router.get('/filters/inclusions', getDistinctTripInclusions);
router.get('/filters/exclusions', getDistinctTripExclusions);
router.get('/by-theme/:themeName', getTripsByTheme);
router.get('/', getAllTrips);
router.get('/:tripId', getTripById);

// Admin routes
router.post('/', ClerkExpressRequireAuth(), requireAdmin, createTrip);
router.put('/:tripId', ClerkExpressRequireAuth(), requireAdmin, updateTrip);
router.delete('/:tripId', ClerkExpressRequireAuth(), requireAdmin, deleteTrip);

module.exports = router;