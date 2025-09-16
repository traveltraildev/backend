const UserWishlist = require('../models/userWishlist.model');

// Get all items in the user's wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const wishlist = await UserWishlist.findUserWishlist(userId);
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
  }
};

// Add an item to the user's wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId, itemType } = req.body;

    if (!itemId || !itemType) {
      return res.status(400).json({ message: 'itemId and itemType are required' });
    }

    const wishlistItem = new UserWishlist({
      userId,
      item: itemId,
      itemType
    });

    await wishlistItem.save();
    res.status(201).json(wishlistItem);
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Item already in wishlist' });
    }
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
};

// Remove an item from the user's wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { itemId } = req.params;

    const result = await UserWishlist.deleteOne({ userId, item: itemId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    res.status(200).json({ message: 'Item removed from wishlist' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
