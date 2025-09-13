const { getDb } = require('../utils/db');

const standardErrorResponse = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
};

const subscribeToNewsletter = async (req, res) => {
    try {
        const db = await getDb();
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
};

const getNewsletterSubscribers = async (req, res) => {
    try {
        const db = await getDb();
        const newsletterCollection = db.collection("newsletter");
        const subscribers = await newsletterCollection.find({}).toArray();
        res.json({ subscribers });
    } catch (error) {
        return standardErrorResponse(res, error, "fetching newsletter subscribers");
    }
};

module.exports = {
    subscribeToNewsletter,
    getNewsletterSubscribers
};