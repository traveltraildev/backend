const mongoose = require('mongoose');

const WishlistItemSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
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

WishlistItemSchema.index({ userId: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('WishlistItem', WishlistItemSchema);
