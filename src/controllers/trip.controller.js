const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
};

const getDistinctTripDestinations = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const distinctDestinations = await tripsCollection.distinct("destination");
        res.json(distinctDestinations);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct trip destinations");
    }
};

const getDistinctTripThemes = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const distinctThemes = await tripsCollection.distinct("themes");
        const flattenedThemes = distinctThemes.flat();
        res.json(flattenedThemes);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct trip themes");
    }
};

const getDistinctTripInclusions = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const distinctInclusions = await tripsCollection.distinct("inclusions");
        const flattenedInclusions = distinctInclusions.flat();
        res.json(flattenedInclusions);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct trip inclusions");
    }
};

const getDistinctTripExclusions = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const distinctExclusions = await tripsCollection.distinct("exclusions");
        const flattenedExclusions = distinctExclusions.flat();
        res.json(flattenedExclusions);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct trip exclusions");
    }
};

const getTripsByTheme = async (req, res) => {
    try {
        const db = await getDb();
        const { themeName } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const tripsCollection = db.collection("trips");
        const query = { themes: { $elemMatch: { $regex: '^' + themeName + '$', $options: "i" } } };
        const totalTrips = await tripsCollection.countDocuments(query);
        const trips = await tripsCollection.find(query).skip(skip).limit(limit).toArray();
        res.json({ success: true, data: trips, pagination: { totalTrips, totalPages: Math.ceil(totalTrips / limit), currentPage: page, limit } });
    } catch (error) {
        return standardErrorResponse(res, error, "fetching trips by theme");
    }
};

const getAllTrips = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const { isFeatured } = req.query;
        let query = {};
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }
        const trips = await tripsCollection.find(query).toArray();
        res.json(trips);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching all trips");
    }
};

const getTripById = async (req, res) => {
    try {
        const db = await getDb();
        const tripsCollection = db.collection("trips");
        const trip = await tripsCollection.findOne({ _id: new ObjectId(req.params.tripId) });
        if (trip) {
            res.json(trip);
        } else {
            res.status(404).json({ message: "Trip package not found." });
        }
    } catch (error) {
        return standardErrorResponse(res, error, "fetching trip by id");
    }
};

const createTrip = async (req, res) => {
    try {
        const db = await getDb();
        // ... validation logic ...
        const tripsCollection = db.collection("trips");
        const result = await tripsCollection.insertOne(req.body);
        res.status(201).json({ message: "Trip package added successfully!", tripId: result.insertedId });
    } catch (error) {
        return standardErrorResponse(res, error, "creating trip");
    }
};

const updateTrip = async (req, res) => {
    try {
        const db = await getDb();
        const { tripId } = req.params;
        const updatedData = req.body;
        delete updatedData._id;
        const result = await db.collection("trips").updateOne({ _id: new ObjectId(tripId) }, { $set: updatedData });
        if (result.matchedCount === 0) return res.status(404).json({ message: "Trip not found" });
        res.json({ message: "Trip updated successfully", modifiedCount: result.modifiedCount });
    } catch (error) {
        return standardErrorResponse(res, error, "updating trip");
    }
};

const deleteTrip = async (req, res) => {
    try {
        const db = await getDb();
        const { tripId } = req.params;
        const result = await db.collection("trips").deleteOne({ _id: new ObjectId(tripId) });
        if (result.deletedCount === 0) return res.status(404).json({ message: "Trip not found" });
        res.json({ message: "Trip deleted successfully" });
    } catch (error) {
        return standardErrorResponse(res, error, "deleting trip");
    }
};

module.exports = {
    getDistinctTripDestinations,
    getDistinctTripThemes,
    getDistinctTripInclusions,
    getDistinctTripExclusions,
    getTripsByTheme,
    getAllTrips,
    getTripById,
    createTrip,
    updateTrip,
    deleteTrip
};