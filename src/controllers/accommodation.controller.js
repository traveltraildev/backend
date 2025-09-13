const { getDb } = require('../utils/db');
const { ObjectId } = require('mongodb');

const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
};

const getDistinctAccommodationDestinations = async (req, res) => {
    try {
        const db = await getDb();
        const accommodationsCollection = db.collection("accommodations");
        const distinctDestinations = await accommodationsCollection.distinct("destination");
        res.json(distinctDestinations);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct accommodation destinations");
    }
};

const getDistinctAccommodationThemes = async (req, res) => {
    try {
        const db = await getDb();
        const accommodationsCollection = db.collection("accommodations");
        const distinctThemes = await accommodationsCollection.distinct("themes");
        const flattenedThemes = distinctThemes.flat();
        res.json(flattenedThemes);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct accommodation themes");
    }
};

const getDistinctAccommodationAmenities = async (req, res) => {
    try {
        const db = await getDb();
        const accommodationsCollection = db.collection("accommodations");
        const distinctAmenities = await accommodationsCollection.distinct("amenities");
        const flattenedAmenities = distinctAmenities.flat();
        res.json(flattenedAmenities);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching distinct accommodation amenities");
    }
};

const getAllAccommodations = async (req, res) => {
    try {
        const db = await getDb();
        const accommodationsCollection = db.collection("accommodations");
        const { isFeatured } = req.query;
        let query = {};
        if (isFeatured === 'true') {
            query.isFeatured = true;
        }
        const accommodations = await accommodationsCollection.find(query).project({ _id: 1, name: 1, basePrice: "$price", roomType: 1, maxOccupancy: 1, images: 1, destination: 1, themes: 1, amenities: 1, extraAdultFee: 1, extraChildFee: 1, baseOccupancy: 1 }).toArray();
        res.json({ success: true, data: accommodations });
    } catch (error) {
        return standardErrorResponse(res, error, "fetching accommodations");
    }
};

const getAccommodationById = async (req, res) => {
    try {
        const db = await getDb();
        const accommodation = await db.collection("accommodations").findOne({ _id: new ObjectId(req.params.id) });
        if (accommodation) {
            accommodation.basePrice = accommodation.price;
            delete accommodation.price;
            res.json(accommodation);
        } else {
            res.status(404).json({ message: "Accommodation package not found." });
        }
    } catch (error) {
        return standardErrorResponse(res, error, "fetching accommodation by id");
    }
};

const createAccommodation = async (req, res) => {
    try {
        const db = await getDb();
        const accommodationData = req.body;
        if (accommodationData.basePrice) {
            accommodationData.price = accommodationData.basePrice;
            delete accommodationData.basePrice;
        }
        // ... validation logic ...
        const result = await db.collection("accommodations").insertOne(accommodationData);
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        return standardErrorResponse(res, error, "adding accommodation");
    }
};

const updateAccommodation = async (req, res) => {
    try {
        const db = await getDb();
        const { accommodationId } = req.params;
        const updatedData = req.body;
        if (updatedData.basePrice) {
            updatedData.price = updatedData.basePrice;
            delete updatedData.basePrice;
        }
        delete updatedData._id;
        const result = await db.collection("accommodations").updateOne({ _id: new ObjectId(accommodationId) }, { $set: updatedData });
        if (result.matchedCount === 0) return res.status(404).json({ message: "Accommodation not found" });
        res.json({ message: "Accommodation updated successfully", modifiedCount: result.modifiedCount });
    } catch (error) {
        return standardErrorResponse(res, error, "updating accommodation");
    }
};

const deleteAccommodation = async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.collection("accommodations").deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) return res.status(404).json({ success: false, error: "Accommodation not found" });
        res.json({ success: true });
    } catch (error) {
        return standardErrorResponse(res, error, "deleting accommodation");
    }
};

module.exports = {
    getDistinctAccommodationDestinations,
    getDistinctAccommodationThemes,
    getDistinctAccommodationAmenities,
    getAllAccommodations,
    getAccommodationById,
    createAccommodation,
    updateAccommodation,
    deleteAccommodation
};