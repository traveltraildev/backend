// --- START OF FILE backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db("traveltrailCMS");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1);
  }
}

connectToDatabase();

const ADMIN_SECRET = process.env.ADMIN_SECRET || f8ad5f2de9357de19ec8e7b35ac06f8bdab8c6eeb382f7c7c30a8137935bb1707c4b8a597ff4b13ed0d253561ddcc9e3d2e07ecc6e99bf1dae07899dc215defd ;
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    req.admin = jwt.verify(token, ADMIN_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};
  // Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Replace with your admin credentials
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1233';

  const adminPasswordHash = process.env.ADMIN_PASSWORD || 
  bcrypt.hashSync('admin1233', 10); // Store the HASHED password in .env



  if (username !== adminUsername || !bcrypt.compareSync(password, adminPasswordHash)) {

    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ username }, ADMIN_SECRET, { expiresIn: '2h' });
  res.json({ token });
});
app.get('/api/admin/check-auth', requireAuth, (req, res) => {
  res.json({ authenticated: true });
});
// API Endpoints

// GET endpoint to fetch CMS page content by key
app.get('/api/cms/pages/:pageKey', async (req, res) => { // GET endpoint for CMS pages
  const pageKey = req.params.pageKey;
  try {
    const pageContent = await db.collection('cmsPages').findOne({ key: pageKey });
    if (pageContent) {
      res.json(pageContent);
    } else {
      res.status(404).json({ message: "Page content not found." });
    }
  } catch (error) {
    console.error("Error fetching page content:", error);
    res.status(500).json({ message: "Failed to fetch page content." });
  }
});

// PUT endpoint to update CMS page content by key
app.put('/api/cms/pages/:pageKey',requireAuth, async (req, res) => { // PUT endpoint for CMS pages
  const pageKey = req.params.pageKey;
  const updatedContent = req.body;

  if (!updatedContent || !updatedContent.title || !updatedContent.content) {
    return res.status(400).json({ message: "Invalid update data." });
  }

  try {
    const result = await db.collection('cmsPages').updateOne(
      { key: pageKey },
      {
        $set: {
          title: updatedContent.title,
          content: updatedContent.content,
        }
      },
      { upsert: true }
    );
    console.log("CMS Page Update result:", result); // More specific log message
    res.json({ message: "Page content updated successfully." });
  } catch (error) {
    console.error("Error updating CMS page content:", error);
    res.status(500).json({ message: "Failed to update page content." });
  }
});

// UPDATED API ENDPOINT - POST /api/trips - to add a new trip package (Handling FormData and converting strings to arrays in backend)
app.post('/api/trips',requireAuth, async (req, res) => { // POST endpoint for adding trips
  const newTripData = req.body; // Trip data from frontend request body (FormData)

  // Enhanced data validation (for ALL trip fields)
  if (!newTripData ||
    !newTripData.name ||
    !newTripData.desc ||
    typeof newTripData.price !== 'number' ||
    typeof newTripData.daysCount !== 'number' ||
    typeof newTripData.nightsCount !== 'number' ||
    !Array.isArray(newTripData.themes) ||
    !Array.isArray(newTripData.inclusions) ||
    !Array.isArray(newTripData.exclusions) ||
    !Array.isArray(newTripData.itineraries)
  ) {
    return res.status(400).json({ message: "Invalid trip data types" });
  }

  try {
    const tripsCollection = db.collection('trips');

    // Process comma-separated strings from FormData into arrays in backend BEFORE saving to MongoDB
    const tripDataToInsert = {
      name: newTripData.name,
      desc: newTripData.desc,
      price: parseInt(newTripData.price),
      daysCount: parseInt(newTripData.daysCount),
      nightsCount: parseInt(newTripData.nightsCount),
      category: newTripData.category,
      theme: newTripData.theme,
      themes: newTripData.themes,
      inclusions: newTripData.inclusions, 
      exclusions: newTripData.exclusions,
      images: newTripData.images, // Keep as array if frontend sends array
      itineraries: newTripData.itineraries, // itine
      availability: newTripData.availability === 'true',
      tripExpert: newTripData.tripExpert,
      destination: newTripData.destination,
    };

    const result = await tripsCollection.insertOne(tripDataToInsert);
    console.log("Trip inserted result:", result); // More specific log message
    res.status(201).json({ message: "Trip package added successfully!", tripId: result.insertedId });
  } catch (error) {
    console.error("Error adding new trip package:", error);
    res.status(500).json({ message: "Failed to add new trip package." });
  }
});

// NEW API ENDPOINT - GET /api/trips - to fetch all trip packages
app.get('/api/trips',requireAuth, async (req, res) => { // GET endpoint for all trips
  try {
    const tripsCollection = db.collection('trips');
    const trips = await tripsCollection.find({}).toArray();
    res.json(trips);
  } catch (error) {
    console.error("Error fetching trip packages:", error);
    res.status(500).json({ message: "Failed to fetch trip packages." });
  }
});

// NEW API ENDPOINT - GET /api/trips/:tripId - to fetch a single trip by ID
app.get('/api/trips/:tripId', async (req, res) => { // GET endpoint for a single trip
  const tripId = req.params.tripId;

  try {
    const tripsCollection = db.collection('trips');
    const trip = await tripsCollection.findOne({ _id: new ObjectId(tripId) });

    if (trip) {
      res.json(trip);
    } else {
      res.status(404).json({ message: "Trip package not found." });
    }
  } catch (error) {
    console.error("Error fetching trip package:", error);
    res.status(500).json({ message: "Failed to fetch trip package." });
  }
});

// PUT endpoint to update a trip by ID
app.put('/api/trips/:tripId',requireAuth, async (req, res) => {
  const tripId = req.params.tripId;
  const updatedData = req.body;

  // Remove immutable fields
  delete updatedData._id; // Prevent updating MongoDB's _id
  
  // Basic validation
  if (!updatedData || !updatedData.name || typeof updatedData.price !== 'number') {
    return res.status(400).json({ message: "Invalid trip data" });
  }

  try {
    const result = await db.collection('trips').updateOne(
      { _id: new ObjectId(tripId) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ 
      message: "Trip updated successfully", 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error("Error updating trip:", error);
    res.status(500).json({ message: "Failed to update trip" });
  }
});

// DELETE endpoint to remove a trip by ID
app.delete('/api/trips/:tripId',requireAuth, async (req, res) => {
  const tripId = req.params.tripId;

  try {
    const result = await db.collection('trips').deleteOne(
      { _id: new ObjectId(tripId) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Failed to delete trip" });
  }
});

app.post('/api/sheets-proxy', async (req, res) => {
  try {
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    // Google Script returns HTML even on success, so check response URL
    if (response.url.includes('exec')) {
      return res.status(200).json({ success: true });
    }
    res.status(500).json({ error: 'Sheets submission failed' });
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
// --- END OF FILE backend/server.js ---raries is already expected as JSON string from frontend