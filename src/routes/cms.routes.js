const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { requireAdmin } = require('../middleware/auth.middleware');
const {
    getPageContent,
    updatePageContent
} = require('../controllers/cms.controller');

const router = express.Router();

// Public routes
router.get('/pages/:pageKey', getPageContent);

// Admin routes
router.put('/pages/:pageKey', ClerkExpressRequireAuth(), requireAdmin, updatePageContent);

module.exports = router;