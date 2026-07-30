const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

async function deleteLocations() {
  console.log('Deleting all locations from MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // Delete all location documents
  const deleteResult = await db.collection('locations').deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} location(s) from MongoDB.`);

  // Clear locationId references across classes, users, and volunteers
  await db.collection('classes').updateMany({}, { $set: { locationId: "" } });
  await db.collection('users').updateMany({}, { $unset: { locationId: "" } });
  await db.collection('volunteers').updateMany({}, { $unset: { locationId: "" } });
  await db.collection('volunteerAttendance').updateMany({}, { $set: { locationId: "" } });

  await client.close();
  console.log('MongoDB location cleanup completed.');

  // Update db.json
  const dbJsonPath = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    dbData.locations = [];
    if (dbData.classes) dbData.classes.forEach(c => c.locationId = "");
    if (dbData.users) dbData.users.forEach(u => delete u.locationId);
    if (dbData.volunteers) dbData.volunteers.forEach(v => delete v.locationId);
    fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log('db.json updated with empty locations array.');
  }
}

deleteLocations().catch(err => {
  console.error('Failed to delete locations:', err);
  process.exit(1);
});
