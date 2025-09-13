const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { requireAdmin } = require('../middleware/auth.middleware');
const {
    subscribeToNewsletter,
    getNewsletterSubscribers
} = require('../controllers/newsletter.controller');

const router = express.Router();

// Public routes
router.post('/subscribe', subscribeToNewsletter);

// Admin routes
router.get('/subscribers', ClerkExpressRequireAuth(), requireAdmin, getNewsletterSubscribers);

module.exports = router;