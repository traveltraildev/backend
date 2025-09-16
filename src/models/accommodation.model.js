const mongoose = require('mongoose');

const AccommodationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  destination: { type: String, required: true },
  images: [String],
  price: Number,
  basePrice: Number,
  roomType: String,
  bedType: String,
  maxOccupancy: Number,
  size: String,
  amenities: [String],
  overview: String,
  themes: [String],
  inclusions: [String],
  exclusions: [String],
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Accommodation', AccommodationSchema);
