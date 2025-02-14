// --- START OF FILE backend/server.js ---
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');

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
app.put('/api/cms/pages/:pageKey', async (req, res) => { // PUT endpoint for CMS pages
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
app.post('/api/trips', async (req, res) => { // POST endpoint for adding trips
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
app.get('/api/trips', async (req, res) => { // GET endpoint for all trips
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


app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
// --- END OF FILE backend/server.js ---raries is already expected as JSON string from frontend