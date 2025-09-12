require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const jwt = require('jsonwebtoken');
const { ClerkExpressRequireAuth, clerkClient } = require('@clerk/clerk-sdk-node');

const app = express();
const port = process.env.PORT || 5000;

// Middleware to check for admin role. First try session claims, then fall back to user publicMetadata.
const requireAdmin = async (req, res, next) => {
  try {
    // Prefer session claims if available
    const sessionRole = req.auth?.sessionClaims?.metadata?.role;
    if (sessionRole === 'admin') return next();

    // If no session claim, fetch user from Clerk and check publicMetadata
    const userId = req.auth?.userId;
    if (userId) {
      const user = await clerkClient.users.getUser(userId);
      const userRole = user?.publicMetadata?.role || user?.public_metadata?.role;
      if (userRole === 'admin') return next();
    }

    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Validate environment variables on startup
if (!process.env.CLERK_SECRET_KEY) {
  console.error("FATAL ERROR: CLERK_SECRET_KEY not configured");
  process.exit(1);
}

if (!process.env.GOOGLE_SCRIPT_URL) {
  console.warn("WARNING: GOOGLE_SCRIPT_URL not configured. Google Sheets integration will be disabled.");
}

if (!process.env.GOOGLE_SCRIPT_URL) {
  console.warn("WARNING: GOOGLE_SCRIPT_URL not configured. Google Sheets integration will be disabled.");
}

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://traveltrail-frontend.vercel.app",
      "https://trishelta.com",
      "https://www.trishelta.com",
      "http://trishelta.com",
      "http://www.trishelta.com",
      "https://trishelta.vercel.app",
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Security Middleware
app.use(helmet());
app.use(xss());

const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
let db;

if (!process.env.MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env");
  process.exit(1);
}

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

app.use((req, res, next) => {
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + req.path);
  next();
});

// Standardize error responses
const standardErrorResponse = (res, error, context) => {
  console.error('Error in ' + context + ':', error);
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    code: error.code || 'SERVER_ERROR'
  });
};

// API Endpoints

// NEW API ENDPOINT - GET /api/accommodations/filters/destinations
app.get("/api/accommodations/filters/destinations", async (req, res) => {
  try {
    const accommodationsCollection = db.collection("accommodations");
    const distinctDestinations = await accommodationsCollection.distinct(
      "destination"
    );
    res.json(distinctDestinations);
  } catch (error) {
    return standardErrorResponse(res, error, "fetching distinct destinations");
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
    return standardErrorResponse(res, error, "fetching distinct themes");
  }
});

// NEW API ENDPOINT - GET /api/accommodations/filters/amenities
app.get("/api/accommodations/filters/amenities", async (req, res) => {
  try {
    const accommodationsCollection = db.collection("accommodations");
    const distinctAmenities = await accommodationsCollection.distinct(
      "amenities"
    );
    // Flatten the array in case amenities are stored as arrays
    const flattenedAmenities = distinctAmenities.flat();
    res.json(flattenedAmenities);
  } catch (error) {
    return standardErrorResponse(res, error, "fetching distinct amenities");
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
    return standardErrorResponse(res, error, "fetching distinct trip destinations");
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
    return standardErrorResponse(res, error, "fetching distinct trip themes");
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
    return standardErrorResponse(res, error, "fetching distinct trip inclusions");
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
    return standardErrorResponse(res, error, "fetching distinct trip exclusions");
  }
});

// GET endpoint to fetch trips by theme with pagination
app.get("/api/trips/by-theme/:themeName", async (req, res) => {
  try {
    const { themeName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tripsCollection = db.collection("trips");

    const query = { themes: { $elemMatch: { $regex: '^' + themeName + '$', $options: "i" } } };

    const totalTrips = await tripsCollection.countDocuments(query);
    const trips = await tripsCollection.find(query).skip(skip).limit(limit).toArray();

    res.json({
      success: true,
      data: trips,
      pagination: {
        totalTrips,
        totalPages: Math.ceil(totalTrips / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    return standardErrorResponse(res, error, "fetching trips by theme");
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
    return standardErrorResponse(res, error, "fetching page content");
  }
});

// PUT endpoint to update CMS page content by key
app.put("/api/cms/pages/:pageKey", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
    return standardErrorResponse(res, error, "updating CMS page content");
  }
});

// UPDATED API ENDPOINT - POST /api/trips - to add a new trip package (Handling FormData and converting strings to arrays in backend)
app.post("/api/trips", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
      isInternational: newTripData.isInternational,
    };

    const result = await tripsCollection.insertOne(tripDataToInsert);
    console.log("Trip inserted result:", result); // More specific log message
    res.status(201).json({
      message: "Trip package added successfully!",
      tripId: result.insertedId,
    });
  } catch (error) {
    return standardErrorResponse(res, error, "adding new trip package");
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
    return standardErrorResponse(res, error, "fetching trip packages");
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
    return standardErrorResponse(res, error, "fetching trip package");
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
        destination: 1,
        themes: 1,
        amenities: 1,
      }) // Optimize response
      .toArray();

    res.json({ success: true, data: accommodations });
  } catch (error) {
    return standardErrorResponse(res, error, "fetching accommodations");
  }
});

// PUT endpoint to update a ACCOMMODATIONS by ID
app.put(
  "/api/accommodations/:accommodationId",
  ClerkExpressRequireAuth(),
  requireAdmin,
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
      return standardErrorResponse(res, error, "updating accommodation");
    }
  }
);

// PUT endpoint to update a trip by ID
app.put("/api/trips/:tripId", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
    return standardErrorResponse(res, error, "updating trip");
  }
});

// DELETE endpoint to remove a trip by ID
app.delete("/api/trips/:tripId", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
    return standardErrorResponse(res, error, "deleting trip");
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
    return standardErrorResponse(res, error, "fetching accommodation package");
  }
});

app.delete("/api/accommodations/:id", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
    return standardErrorResponse(res, error, "deleting accommodation");
  }
});

app.post("/api/accommodations", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
      destination: "string",
    };

    const errors = [];
    Object.entries(requiredFields).forEach(([field, type]) => {
      if (!accommodationData[field]) {
        errors.push('Missing ' + field);
      } else if (type === "array" && !Array.isArray(accommodationData[field])) {
        errors.push(field + ' must be an array');
      } else if (typeof accommodationData[field] !== type && type !== "array") {
        errors.push(field + ' must be ' + type);
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
    return standardErrorResponse(res, error, "adding accommodation");
  }
});

// GET /api/users/profile - Fetch user profile
app.get("/api/users/profile", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ clerkId: req.auth.userId });

    if (!user) {
      // Create user if not exists
      const newUser = {
        clerkId: req.auth.userId,
        createdAt: new Date(),
      };
      const result = await usersCollection.insertOne(newUser);
      return res.json({ user: { ...newUser, _id: result.insertedId } });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
});

// PUT /api/users/profile - Update user profile
app.put("/api/users/profile", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const usersCollection = db.collection("users");
    const result = await usersCollection.updateOne(
      { clerkId: req.auth.userId },
      { $set: req.body }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    return standardErrorResponse(res, error, "updating user profile");
  }
});

// GET /api/bookings/history - Get user's booking history
app.get("/api/bookings/history", ClerkExpressRequireAuth(), async (req, res) => {
  try {
    const bookingsCollection = db.collection("bookings");

    const bookings = await bookingsCollection
      .find({
        "user.clerkId": req.auth.userId,
      })
      .toArray();

    // Fetch trip details for each booking
    const tripsCollection = db.collection("trips");
    const tripPromises = bookings.map(async (booking) => {
      const trip = await tripsCollection.findOne({
        _id: new ObjectId(booking.tripId),
      });
      return { ...booking, tripName: trip?.name };
    });

    const enrichedBookings = await Promise.all(tripPromises);
    res.json(enrichedBookings);
  } catch (error) {
    return standardErrorResponse(res, error, "fetching booking history");
  }
});

// GET /api/admin/bookings - Get all bookings for admin view with pagination, sorting, and search
app.get("/api/admin/bookings", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortField = 'createdAt',
      sortOrder = 'desc',
      searchTerm = ''
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const bookingsCollection = db.collection("bookings");

    let pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "trips",
          localField: "tripId",
          foreignField: "_id",
          as: "tripDetails"
        }
      },
      {
        $unwind: {
          path: "$tripDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          "searchName": { $ifNull: ["$userDetails.name", "$guestUser.name"] },
          "searchEmail": { $ifNull: ["$userDetails.email", "$guestUser.email"] },
          "searchTripName": "$tripDetails.name"
        }
      }
    ];

    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'searchName': searchRegex },
            { 'searchEmail': searchRegex },
            { 'searchTripName': searchRegex },
          ]
        }
      });
    }

    pipeline.push({
      $project: {
        _id: 1,
        startDate: 1,
        endDate: 1,
        attendees: 1,
        createdAt: 1,
        status: { $ifNull: ["$status", "New"] },
        annotations: { $ifNull: ["$annotations", []] },
        "user.name": "$searchName",
        "user.email": "$searchEmail",
        "user.phone": { $ifNull: ["$userDetails.phone", "$guestUser.phone"] },
        "trip.name": "$searchTripName",
        "trip.destination": "$tripDetails.destination",
      }
    });

    const sortStage = { $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } };
    pipeline.push(sortStage);

    const countPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await bookingsCollection.aggregate(countPipeline).toArray();
    const totalBookings = totalResult.length > 0 ? totalResult[0].total : 0;

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    const bookings = await bookingsCollection.aggregate(pipeline).toArray();

    res.json({
      success: true,
      data: bookings,
      pagination: {
        totalBookings,
        totalPages: Math.ceil(totalBookings / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    return standardErrorResponse(res, error, "fetching all bookings for admin");
  }
});

// PUT /api/admin/bookings/:bookingId/status - Update booking status
app.put("/api/admin/bookings/:bookingId/status", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required." });
  }

  try {
    const result = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    res.json({ success: true, message: "Status updated successfully." });
  } catch (error) {
    return standardErrorResponse(res, error, "updating booking status");
  }
});

// POST /api/admin/bookings/:bookingId/annotations - Add a new annotation
app.post("/api/admin/bookings/:bookingId/annotations", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
  const { bookingId } = req.params;
  const { text } = req.body;
  const adminUsername = req.auth.userId; // Using clerk user id

  if (!text) {
    return res.status(400).json({ success: false, message: "Annotation text is required." });
  }

  const newAnnotation = {
    text: text,
    author: adminUsername || 'Admin',
    timestamp: new Date()
  };

  try {
    const result = await db.collection("bookings").updateOne(
      { _id: new ObjectId(bookingId) },
      { $push: { annotations: { $each: [newAnnotation], $position: 0 } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    res.json({ success: true, message: "Annotation added successfully.", annotation: newAnnotation });
  } catch (error) {
    return standardErrorResponse(res, error, "adding annotation");
  }
});

app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const newsletterCollection = db.collection("newsletter");
    const existingSubscriber = await newsletterCollection.findOne({ email });

    if (existingSubscriber) {
      return res.status(400).json({ message: "Email already subscribed" });
    }

    await newsletterCollection.insertOne({ email, createdAt: new Date() });

    res.status(201).json({ message: "Successfully subscribed to newsletter" });
  } catch (error) {
    return standardErrorResponse(res, error, "subscribing to newsletter");
  }
});

// POST /api/bookings - Create a new booking
app.post("/api/bookings", async (req, res) => {
  try {
    const { tripId, startDate, endDate, attendees, name, email, phone } = req.body;
    const authHeader = req.headers.authorization;

    let userId = null;
    let user = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const session = await clerkClient.verifyToken(token);
        const usersCollection = db.collection("users");
        user = await usersCollection.findOne({ clerkId: session.sub });
        if (user) {
          userId = user._id;
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        // Token is invalid, proceed as a guest booking
      }
    }

    const bookingsCollection = db.collection("bookings");
    const newBooking = {
      tripId: new ObjectId(tripId),
      startDate,
      endDate,
      attendees,
      createdAt: new Date(),
      status: 'New', // Default status
      annotations: [], // Initialize with empty array
    };

    if (userId) {
      newBooking.userId = userId;
    } else {
      newBooking.guestUser = { name, email, phone };
    }

    const result = await bookingsCollection.insertOne(newBooking);

    // After successful booking, send data to Google Apps Script
    const scriptPayload = {
      tripId,
      startDate,
      endDate,
      attendees,
      user: userId ? { name: user.name, email: user.email, phone: user.phone } : { name, email, phone },
    };

    fetch(process.env.BASE_URL + '/api/sheets-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scriptPayload),
    }).catch(error => console.error("Error sending data to Google Sheets:", error));


    res.status(201).json({
      message: "Booking created successfully",
      booking: {
        ...newBooking,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    return standardErrorResponse(res, error, "creating booking");
  }
});

app.get("/api/newsletter/subscribers", ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
  try {
    const newsletterCollection = db.collection("newsletter");
    const subscribers = await newsletterCollection.find({}).toArray();
    res.json({ subscribers });
  } catch (error) {
    return standardErrorResponse(res, error, "fetching newsletter subscribers");
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
    return standardErrorResponse(res, error, "sheets proxy");
  }
});

async function startServer() {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log('Backend server listening on port ' + port);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();