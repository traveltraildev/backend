const mongoose = require('mongoose');

const UserWishlistItemSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemType'
  },
  itemType: {
    type: String,
    required: true,
    enum: ['Trip', 'Accommodation']
  }
}, {
  timestamps: true
});

// Ensure a user cannot have the same item in their wishlist twice
UserWishlistItemSchema.index({ userId: 1, item: 1 }, { unique: true });

// To efficiently query wishlists for a user
UserWishlistItemSchema.statics.findUserWishlist = function(userId) {
  return this.find({ userId }).populate('item');
};

module.exports = mongoose.model('UserWishlist', UserWishlistItemSchema);
