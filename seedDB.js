// --- START OF FILE backend/seedDB.js ---
require('dotenv').config();
const { MongoClient } = require('mongodb');
const cmsData = require('../traveltrail-frontend/src/data/cmsData').default; // Import cmsData

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("traveltrailCMS");
    const cmsPagesCollection = db.collection('cmsPages');

    // Clear existing data (optional, but useful for reseeding)
    await cmsPagesCollection.deleteMany({});
    console.log("Cleared existing CMS pages collection.");

    // Insert data from cmsData
    const pagesToInsert = Object.entries(cmsData).map(([key, value]) => ({ key, ...value })); // Convert cmsData object to array of documents
    const result = await cmsPagesCollection.insertMany(pagesToInsert);
    console.log(`Database seeded with ${result.insertedCount} CMS pages.`);

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seedDatabase();
// --- END OF FILE backend/seedDB.js ---