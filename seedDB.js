require('dotenv').config();
const { MongoClient } = require('mongodb');
const cmsData = require('../traveltrail-frontend/src/data/cmsData').default;
const trips = require('../traveltrail-frontend/src/data/trips.js').default;

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("traveltrailCMS");
    
    // Seed CMS Pages
    const cmsPagesCollection = db.collection('cmsPages');
    await cmsPagesCollection.deleteMany({});
    console.log("Cleared existing CMS pages collection.");
    const pagesToInsert = Object.entries(cmsData).map(([key, value]) => ({ key, ...value }));
    const cmsResult = await cmsPagesCollection.insertMany(pagesToInsert);
    console.log(`Database seeded with ${cmsResult.insertedCount} CMS pages.`);

    // Seed Trips
    const tripsCollection = db.collection('trips');
    await tripsCollection.deleteMany({});
    console.log("Cleared existing trips collection.");
    // The trips data is an array of objects, but the last one is empty.
    // I will filter out empty objects before inserting.
    const tripsToInsert = trips.filter(trip => trip.name);
    const tripsResult = await tripsCollection.insertMany(tripsToInsert);
    console.log(`Database seeded with ${tripsResult.insertedCount} trips.`);

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seedDatabase();