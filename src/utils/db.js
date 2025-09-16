const { MongoClient } = require("mongodb");
const mongoose = require('mongoose');

// Register models
require('../models/trip.model');
require('../models/accommodation.model');
require('../models/userWishlist.model');

let db;
let mongooseConnection;

async function connectToDatabase() {
  if (db) return;
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    db = client.db("traveltrailCMS");
    console.log("Connected to MongoDB Atlas (Native Driver)");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas (Native Driver):", error);
    process.exit(1);
  }
}

async function connectMongoose() {
  if (mongooseConnection) return mongooseConnection;
  try {
    mongooseConnection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: 'traveltrailCMS'
    });
    console.log("Connected to MongoDB Atlas (Mongoose)");
    return mongooseConnection;
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas (Mongoose):", error);
    process.exit(1);
  }
}

const getDb = async () => {
  if (db) return db;
  await connectToDatabase();
  return db;
};

module.exports = { connectToDatabase, getDb, connectMongoose, mongoose };
