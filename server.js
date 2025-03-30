// --- START OF FILE backend/server.js ---
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Validate environment variables on startup
if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 32) {
  console.error("FATAL ERROR: ADMIN_SECRET not configured or too short");
  process.exit(1);
}

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new MongoClient(process.env.MONGODB_URI);
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

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// JWT verification to use environment variable
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [tokenType, token] = authHeader.split(" ");

  // Enhanced logging for debugging
  console.log(
    `Auth validation - Type: ${tokenType}, Token: ${token?.slice(0, 15)}...`
  );

  // Validate header format
  if (!token || !["Bearer", "AdminToken"].includes(tokenType)) {
    console.error("Invalid auth header format");
    return res.status(401).json({
      success: false,
      code: "INVALID_AUTH_HEADER",
      message:
        "Authorization header must be: Bearer <token> or AdminToken <token>",
    });
  }

  // JWT verification
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET, {
      algorithms: ["HS256"],
      clockTolerance: 15,
    });

    console.log(`Valid token for admin: ${decoded.username}`);

    // Attach decoded data to request object
    req.admin = {
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error(`JWT verification failed: ${error.message}`);

    // Detailed error response
    const errorCode = error.name.replace(/([A-Z])/g, "_$1").toUpperCase();
    const errorMessage = error.expiredAt
      ? "Session expired"
      : "Invalid credentials";

    res.status(401).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      systemNote: `Token validation failed at ${new Date().toISOString()}`,
    });
  }
};
// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Enhanced validation
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        code: "MISSING_CREDENTIALS",
        message: "Username and password are required",
      });
    }

    // Verify environment variables exist
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
      console.error("Admin credentials not configured");
      return res.status(500).json({
        success: false,
        code: "SERVER_ERROR",
        message: "Server configuration error",
      });
    }

    // Trim inputs for comparison
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // Validate credentials
    const usernameValid = cleanUsername === process.env.ADMIN_USERNAME;
    const passwordValid = bcrypt.compareSync(
      cleanPassword,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!usernameValid || !passwordValid) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid username or password",
      });
    }

    // Generate token
    const token = jwt.sign(
      { username: cleanUsername },
      process.env.ADMIN_SECRET,
      {
        expiresIn: "2h",
        algorithm: "HS256",
      }
    );

    res.json({
      success: true,
      adminToken: token,
      user: {
        username: cleanUsername,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Internal server error",
    });
  }
});
app.get("/api/admin/check-auth", requireAuth, (req, res) => {
  res.json({ authenticated: true });
});
// API Endpoints

// NEW API ENDPOINT - GET /api/accommodations/filters/destinations
app.get("/api/accommodations/filters/destinations", async (req, res) => {
  try {
    const accommodationsCollection = db.collection("accommodations");
    const distinctDestinations = await accommodationsCollection.distinct("destination");
    res.json(distinctDestinations);
  } catch (error) {
    console.error("Error fetching distinct destinations:", error);
    res.status(500).json({ message: "Failed to fetch destinations" });
  }
});

// NEW API ENDPOINT - GET /api/accommodations/filters/themes
app.get("/api/accommodations/filters/themes", async (req, res) => {
  try {
    const accommodationsCollection = db.collection("accommodations");
    const distinctThemes = await accommodationsCollection.distinct("themes");
    // Flatten the array in case themes are stored as arrays
    const flattenedThemes = distinctThemes.flat();
    res.json(flattenedThemes);
  } catch (error) {
    console.error("Error fetching distinct themes:", error);
    res.status(500).json({ message: "Failed to fetch themes" });
  }
});

// NEW API ENDPOINT - GET /api/accommodations/filters/amenities
app.get("/api/accommodations/filters/amenities", async (req, res) => {
  try {
    const accommodationsCollection = db.collection("accommodations");
    const distinctAmenities = await accommodationsCollection.distinct("amenities");
    // Flatten the array in case amenities are stored as arrays
    const flattenedAmenities = distinctAmenities.flat();
    res.json(flattenedAmenities);
  } catch (error) {
    console.error("Error fetching distinct amenities:", error);
    res.status(500).json({ message: "Failed to fetch amenities" });
  }
});

// NEW API ENDPOINTS FOR TRIP FILTERS

// GET endpoint to fetch distinct trip destinations
app.get("/api/trips/filters/destinations", async (req, res) => {
  try {
    const tripsCollection = db.collection("trips");
    const distinctDestinations = await tripsCollection.distinct("destination");
    res.json(distinctDestinations);
  } catch (error) {
    console.error("Error fetching distinct trip destinations:", error);
    res.status(500).json({ message: "Failed to fetch trip destinations" });
  }
});

// GET endpoint to fetch distinct trip themes
app.get("/api/trips/filters/themes", async (req, res) => {
  try {
    const tripsCollection = db.collection("trips");
    const distinctThemes = await tripsCollection.distinct("themes");
    // Flatten the array in case themes are stored as arrays
    const flattenedThemes = distinctThemes.flat();
    res.json(flattenedThemes);
  } catch (error) {
    console.error("Error fetching distinct trip themes:", error);
    res.status(500).json({ message: "Failed to fetch trip themes" });
  }
});

// GET endpoint to fetch distinct trip inclusions
app.get("/api/trips/filters/inclusions", async (req, res) => {
  try {
    const tripsCollection = db.collection("trips");
    const distinctInclusions = await tripsCollection.distinct("inclusions");
    // Flatten the array in case inclusions are stored as arrays
    const flattenedInclusions = distinctInclusions.flat();
    res.json(flattenedInclusions);
  } catch (error) {
    console.error("Error fetching distinct trip inclusions:", error);
    res.status(500).json({ message: "Failed to fetch trip inclusions" });
  }
});

// GET endpoint to fetch distinct trip exclusions
app.get("/api/trips/filters/exclusions", async (req, res) => {
  try {
    const tripsCollection = db.collection("trips");
    const distinctExclusions = await tripsCollection.distinct("exclusions");
    // Flatten the array in case exclusions are stored as arrays
    const flattenedExclusions = distinctExclusions.flat();
    res.json(flattenedExclusions);
  } catch (error) {
    console.error("Error fetching distinct trip exclusions:", error);
    res.status(500).json({ message: "Failed to fetch trip exclusions" });
  }
});

// GET endpoint to fetch CMS page content by key
app.get("/api/cms/pages/:pageKey", async (req, res) => {
  // GET endpoint for CMS pages
  const pageKey = req.params.pageKey;
  try {
    const pageContent = await db
      .collection("cmsPages")
      .findOne({ key: pageKey });
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
app.put("/api/cms/pages/:pageKey", requireAuth, async (req, res) => {
  // PUT endpoint for CMS pages
  const pageKey = req.params.pageKey;
  const updatedContent = req.body;

  if (!updatedContent || !updatedContent.title || !updatedContent.content) {
    return res.status(400).json({ message: "Invalid update data." });
  }

  try {
    const result = await db.collection("cmsPages").updateOne(
      { key: pageKey },
      {
        $set: {
          title: updatedContent.title,
          content: updatedContent.content,
        },
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
app.post("/api/trips", requireAuth, async (req, res) => {
  // POST endpoint for adding trips
  const newTripData = req.body; // Trip data from frontend request body (FormData)

  // Enhanced data validation (for ALL trip fields)
  if (
    !newTripData ||
    !newTripData.name ||
    !newTripData.desc ||
    typeof newTripData.price !== "number" ||
    typeof newTripData.daysCount !== "number" ||
    typeof newTripData.nightsCount !== "number" ||
    !Array.isArray(newTripData.themes) ||
    !Array.isArray(newTripData.inclusions) ||
    !Array.isArray(newTripData.exclusions) ||
    !Array.isArray(newTripData.itineraries)
  ) {
    return res.status(400).json({ message: "Invalid trip data types" });
  }

  try {
    const tripsCollection = db.collection("trips");

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
      availability: newTripData.availability === "true",
      tripExpert: newTripData.tripExpert,
      destination: newTripData.destination,
    };

    const result = await tripsCollection.insertOne(tripDataToInsert);
    console.log("Trip inserted result:", result); // More specific log message
    res.status(201).json({
      message: "Trip package added successfully!",
      tripId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding new trip package:", error);
    res.status(500).json({ message: "Failed to add new trip package." });
  }
});

// NEW API ENDPOINT - GET /api/trips - to fetch all trip packages
app.get("/api/trips", async (req, res) => {
  // GET endpoint for all trips
  try {
    const tripsCollection = db.collection("trips");
    const trips = await tripsCollection.find({}).toArray();
    res.json(trips);
  } catch (error) {
    console.error("Error fetching trip packages:", error);
    res.status(500).json({ message: "Failed to fetch trip packages." });
  }
});

// NEW API ENDPOINT - GET /api/trips/:tripId - to fetch a single trip by ID
app.get("/api/trips/:tripId", async (req, res) => {
  // GET endpoint for a single trip
  const tripId = req.params.tripId;

  try {
    const tripsCollection = db.collection("trips");
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
// NEW API ENDPOINT - GET ACCOMMODATIONS
app.get("/api/accommodations", async (req, res) => {
  try {
    const accommodations = await db
      .collection("accommodations")
      .find({})
      .project({
        _id: 1,
        name: 1,
        price: 1,
        roomType: 1,
        maxOccupancy: 1,
        images: 1,
      }) // Optimize response
      .toArray();

    res.json({ success: true, data: accommodations });
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({
      success: false,
      error: "Database operation failed",
    });
  }
});

// PUT endpoint to update a ACCOMMODATIONS by ID
app.put(
  "/api/accommodations/:accommodationId",
  requireAuth,
  async (req, res) => {
    const accommodationId = req.params.accommodationId;
    const updatedData = req.body;

    // Remove immutable fields
    delete updatedData._id; // Prevent updating MongoDB's _id

    // Basic validation
    if (
      !updatedData ||
      !updatedData.name ||
      typeof updatedData.price !== "number"
    ) {
      return res.status(400).json({ message: "Invalid accommodation data" });
    }

    try {
      const result = await db
        .collection("accommodations")
        .updateOne(
          { _id: new ObjectId(accommodationId) },
          { $set: updatedData }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Accommodation not found" });
      }

      res.json({
        message: "Accommodation updated successfully",
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error updating accommodation:", error);
      res.status(500).json({ message: "Failed to update accommodation" });
    }
  }
);

// PUT endpoint to update a trip by ID
app.put("/api/trips/:tripId", requireAuth, async (req, res) => {
  const tripId = req.params.tripId;
  const updatedData = req.body;

  // Remove immutable fields
  delete updatedData._id; // Prevent updating MongoDB's _id

  // Basic validation
  if (
    !updatedData ||
    !updatedData.name ||
    typeof updatedData.price !== "number"
  ) {
    return res.status(400).json({ message: "Invalid trip data" });
  }

  try {
    const result = await db
      .collection("trips")
      .updateOne({ _id: new ObjectId(tripId) }, { $set: updatedData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({
      message: "Trip updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating trip:", error);
    res.status(500).json({ message: "Failed to update trip" });
  }
});

// DELETE endpoint to remove a trip by ID
app.delete("/api/trips/:tripId", requireAuth, async (req, res) => {
  const tripId = req.params.tripId;

  try {
    const result = await db
      .collection("trips")
      .deleteOne({ _id: new ObjectId(tripId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Failed to delete trip" });
  }
});

app.get("/api/accommodations/:id", async (req, res) => {
  // GET endpoint for a single accommodation
  const accommodationId = req.params.id;

  try {
    const accommodationsCollection = db.collection("accommodations");
    const accommodation = await accommodationsCollection.findOne({
      _id: new ObjectId(accommodationId),
    });

    if (accommodation) {
      res.json(accommodation);
    } else {
      res.status(404).json({ message: "accommodation package not found." });
    }
  } catch (error) {
    console.error("Error fetching accommodation package:", error);
    res.status(500).json({ message: "Failed to fetch accommodation package." });
  }
});

app.delete("/api/accommodations/:id", requireAuth, async (req, res) => {
  try {
    const result = await db.collection("accommodations").deleteOne({
      _id: new ObjectId(req.params.id),
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Accommodation not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete accommodation" });
  }
});

app.post("/api/accommodations", requireAuth, async (req, res) => {
  try {
    const accommodationData = req.body;

    // Validation
    const requiredFields = {
      name: "string",
      price: "number",
      roomType: "string",
      bedType: "string",
      maxOccupancy: "number",
      size: "string",
      overview: "string",
      images: "array",
      themes: "array",
      amenities: "array",
    };

    const errors = [];
    Object.entries(requiredFields).forEach(([field, type]) => {
      if (!accommodationData[field]) {
        errors.push(`Missing ${field}`);
      } else if (type === "array" && !Array.isArray(accommodationData[field])) {
        errors.push(`${field} must be an array`);
      } else if (typeof accommodationData[field] !== type && type !== "array") {
        errors.push(`${field} must be ${type}`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    // Insert into MongoDB
    const result = await db
      .collection("accommodations")
      .insertOne(accommodationData);
    res.status(201).json({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding accommodation:", error);
    res.status(500).json({ message: "Failed to add accommodation" });
  }
});

// In server.js (backend) - Improve proxy handling:
app.post("/api/sheets-proxy", async (req, res) => {
  try {
    if (!process.env.GOOGLE_SCRIPT_URL) {
      console.error("GOOGLE_SCRIPT_URL not configured");
      return res
        .status(500)
        .json({ error: "Sheets integration not configured" });
    }

    const payload = {
      ...req.body,
      secret: process.env.GAS_SECRET,
    };

    const gasResponse = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseData = await gasResponse.json();
    res.status(gasResponse.status).json(responseData);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
// --- END OF FILE backend/server.js ---raries is already expected as JSON string from frontend
