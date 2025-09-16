const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist
} = require('../controllers/wishlist.controller');

const router = express.Router();

// All wishlist routes require authentication
router.use(ClerkExpressRequireAuth());

router.get('/', getWishlist);
router.post('/', addToWishlist);
router.delete('/:itemId', removeFromWishlist);

module.exports = router;
