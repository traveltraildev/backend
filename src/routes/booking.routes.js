const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { requireAdmin } = require('../middleware/auth.middleware');
const {
    getAdminBookings,
    getBookingStats,
    updateBookingStatus,
    addBookingAnnotation,
    getUserBookingHistory,
    createBooking
} = require('../controllers/booking.controller');

const router = express.Router();
const adminRouter = express.Router();

// --- General User Routes ---
router.post('/', createBooking);
router.get('/history', ClerkExpressRequireAuth(), getUserBookingHistory);


// --- Admin Routes ---
adminRouter.use(ClerkExpressRequireAuth(), requireAdmin);

adminRouter.get('/', getAdminBookings);
adminRouter.get('/stats', getBookingStats);
adminRouter.put('/:bookingId/status', updateBookingStatus);
adminRouter.post('/:bookingId/annotations', addBookingAnnotation);


module.exports = { 
    bookingRoutes: router, 
    adminBookingRoutes: adminRouter 
};