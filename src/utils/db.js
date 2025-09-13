const { MongoClient } = require("mongodb");

let db;

async function connectToDatabase() {
  if (db) return;
  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();
    db = client.db("traveltrailCMS");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1);
  }
}

const getDb = async () => {
  if (db) return db;
  await connectToDatabase();
  return db;
};

module.exports = { connectToDatabase, getDb };
