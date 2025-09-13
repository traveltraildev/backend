const { MongoClient, ObjectId } = require("mongodb");
const { clerkClient } = require('@clerk/clerk-sdk-node');

let db;
const connectToDatabase = async () => {
  if (db) return db;
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  db = client.db("traveltrailCMS");
  return db;
};

const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Internal server error',
      code: error.code || 'SERVER_ERROR'
    });
  };

const getAdminBookings = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc', searchTerm = '' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const bookingsCollection = db.collection("bookings");

        let pipeline = [];

        pipeline.push(
            { $lookup: { from: 'trips', localField: 'tripId', foreignField: '_id', as: 'tripInfo' } },
            { $unwind: { path: '$tripInfo', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'accommodations', localField: 'accommodationId', foreignField: '_id', as: 'accommodationInfo' } },
            { $unwind: { path: '$accommodationInfo', preserveNullAndEmptyArrays: true } }
        );

        if (searchTerm) {
            const searchRegex = { $regex: searchTerm, $options: 'i' };
            pipeline.push({
                $match: {
                    $or: [
                        { 'guestUser.name': searchRegex },
                        { 'guestUser.email': searchRegex },
                        { 'guestUser.phone': searchRegex },
                        { 'userDetails.name': searchRegex },
                        { 'userDetails.email': searchRegex },
                        { 'tripInfo.name': searchRegex },
                        { 'accommodationInfo.name': searchRegex },
                        { 'tripName': searchRegex }
                    ]
                }
            });
        }

        if (sortField === 'attendees') {
            pipeline.push({ $addFields: { totalAttendees: { $add: [{ $ifNull: ["$attendees.adults", 0] }, { $ifNull: ["$attendees.children", 0] }] } } });
        }

        const countPipeline = [...pipeline, { $count: 'total' }];
        const totalBookingsResult = await bookingsCollection.aggregate(countPipeline).toArray();
        const totalBookings = totalBookingsResult.length > 0 ? totalBookingsResult[0].total : 0;

        const sortStage = { $sort: { [sortField === 'attendees' ? 'totalAttendees' : sortField]: sortOrder === 'asc' ? 1 : -1 } };
        pipeline.push(sortStage, { $skip: skip }, { $limit: limitNum });

        const bookings = await bookingsCollection.aggregate(pipeline).toArray();

        const clerkIds = [...new Set(bookings.map(b => b.clerkId).filter(id => id))];
        let clerkUsers = [];
        if (clerkIds.length > 0) {
            clerkUsers = await clerkClient.users.getUserList({ userId: clerkIds });
        }
        const clerkUserMap = new Map(clerkUsers.map(u => [u.id, u]));

        const enrichedBookings = bookings.map(booking => {
            let userDetails = {};
            if (booking.clerkId) {
                const clerkUser = clerkUserMap.get(booking.clerkId);
                userDetails = {
                    name: clerkUser ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim() : 'Unknown User',
                    email: clerkUser ? clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress : 'No email',
                    phone: booking.phone,
                };
            } else if (booking.guestUser) {
                userDetails = { name: booking.guestUser.name, email: booking.guestUser.email, phone: booking.guestUser.phone };
            }

            return {
                ...booking,
                tripName: booking.tripInfo?.name || booking.accommodationInfo?.name || booking.tripName || 'N/A',
                userName: userDetails.name || 'Guest',
                userEmail: userDetails.email || 'N/A',
                userPhone: userDetails.phone || 'N/A',
                value: booking.price,
                isGuest: !booking.clerkId,
                bookingType: booking.tripId ? 'Trip' : (booking.accommodationId ? 'Accommodation' : 'Lead'),
            };
        });

        res.json({
            success: true,
            data: enrichedBookings,
            pagination: { totalBookings, totalPages: Math.ceil(totalBookings / limitNum), currentPage: pageNum, limit: limitNum },
        });

    } catch (error) {
        return standardErrorResponse(res, error, "fetching all bookings for admin");
    }
};

const getBookingStats = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const bookingsCollection = db.collection("bookings");
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = await bookingsCollection.aggregate([
            {
                $facet: {
                    "totalBookings": [{ $count: "count" }],
                    "newLeads": [{ $match: { "createdAt": { $gte: thirtyDaysAgo } } }, { $count: "count" }],
                    "followUpsRequired": [{ $match: { "status": { $in: ['New', 'Contacted'] } } }, { $count: "count" }],
                    "totalValue": [{ $group: { _id: null, total: { $sum: "$price" } } }]
                }
            },
            {
                $project: {
                    totalBookings: { $arrayElemAt: ["$totalBookings.count", 0] },
                    newLeads: { $arrayElemAt: ["$newLeads.count", 0] },
                    followUpsRequired: { $arrayElemAt: ["$followUpsRequired.count", 0] },
                    totalValue: { $arrayElemAt: ["$totalValue.total", 0] }
                }
            }
        ]).toArray();

        const responseStats = {
            totalBookings: stats[0]?.totalBookings || 0,
            newLeads: stats[0]?.newLeads || 0,
            followUpsRequired: stats[0]?.followUpsRequired || 0,
            totalValue: stats[0]?.totalValue || 0
        };

        res.json({ success: true, data: responseStats });
    } catch (error) {
        return standardErrorResponse(res, error, "fetching booking stats");
    }
};

const updateBookingStatus = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { bookingId } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required." });
        }
        const result = await db.collection("bookings").updateOne({ _id: new ObjectId(bookingId) }, { $set: { status: status } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }
        res.json({ success: true, message: "Status updated successfully." });
    } catch (error) {
        return standardErrorResponse(res, error, "updating booking status");
    }
};

const addBookingAnnotation = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { bookingId } = req.params;
        const { text } = req.body;
        const adminUsername = req.auth.userId; 
        if (!text) {
            return res.status(400).json({ success: false, message: "Annotation text is required." });
        }
        const newAnnotation = { text: text, author: adminUsername || 'Admin', timestamp: new Date() };
        const result = await db.collection("bookings").updateOne({ _id: new ObjectId(bookingId) }, { $push: { annotations: { $each: [newAnnotation], $position: 0 } } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }
        res.json({ success: true, message: "Annotation added successfully.", annotation: newAnnotation });
    } catch (error) {
        return standardErrorResponse(res, error, "adding annotation");
    }
};

const getUserBookingHistory = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const bookingsCollection = db.collection("bookings");
        const bookings = await bookingsCollection.find({ clerkId: req.auth.userId }).toArray();
        const tripsCollection = db.collection("trips");
        const tripPromises = bookings.map(async (booking) => {
            const trip = await tripsCollection.findOne({ _id: new ObjectId(booking.tripId) });
            return { ...booking, tripName: trip?.name };
        });
        const enrichedBookings = await Promise.all(tripPromises);
        res.json(enrichedBookings);
    } catch (error) {
        return standardErrorResponse(res, error, "fetching booking history");
    }
};

const createBooking = async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { tripId, accommodationId, startDate, endDate, attendees, firstName, lastName, email, phone, price, isManual, tripName } = req.body;
        const authHeader = req.headers.authorization;

        let clerkId = null;
        let userDetails = {};

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                const session = await clerkClient.verifyToken(token);
                clerkId = session.sub;
                const clerkUser = await clerkClient.users.getUser(clerkId);
                userDetails.name = `${clerkUser.firstName} ${clerkUser.lastName}`.trim();
                userDetails.email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;
            } catch (error) {
                console.warn("Could not verify token for booking, proceeding as guest.", error.message);
            }
        }

        const bookingsCollection = db.collection("bookings");
        const newBooking = {
            startDate,
            endDate,
            attendees,
            price,
            phone,
            createdAt: new Date(),
            status: 'New',
            annotations: [],
            isManual: isManual || false,
        };

        if (tripId) newBooking.tripId = new ObjectId(tripId);
        else if (accommodationId) newBooking.accommodationId = new ObjectId(accommodationId);
        else if (isManual && tripName) newBooking.tripName = tripName;

        if (isManual || !clerkId) {
            newBooking.guestUser = { name: `${firstName} ${lastName}`, email, phone };
        } else {
            newBooking.clerkId = clerkId;
            newBooking.userDetails = userDetails;
        }

        const result = await bookingsCollection.insertOne(newBooking);

        const scriptPayload = { tripId, accommodationId, startDate, endDate, attendees, user: { name: `${firstName} ${lastName}`, email, phone } };
        fetch(process.env.BASE_URL + '/api/sheets-proxy', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(scriptPayload),
        }).catch(error => console.error("Error sending data to Google Sheets:", error));

        res.status(201).json({ message: "Booking created successfully", booking: { ...newBooking, _id: result.insertedId } });
    } catch (error) {
        return standardErrorResponse(res, error, "creating booking");
    }
};

module.exports = {
    getAdminBookings,
    getBookingStats,
    updateBookingStatus,
    addBookingAnnotation,
    getUserBookingHistory,
    createBooking,
    connectToDatabase // Export connectToDatabase to be used in other controllers
};