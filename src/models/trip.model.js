const mongoose = require('mongoose');

const ItinerarySchema = new mongoose.Schema({
  activities: [String],
  overview: String,
});

const TripSchema = new mongoose.Schema({
  name: { type: String, required: true },
  destination: { type: String, required: true },
  images: [String],
  daysCount: Number,
  nightsCount: Number,
  price: Number,
  desc: String,
  themes: [String],
  inclusions: [String],
  exclusions: [String],
  itineraries: [ItinerarySchema],
  isFeatured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
