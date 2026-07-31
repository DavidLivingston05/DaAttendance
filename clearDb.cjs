const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

const cleanDbData = {
  users: [
    {
      id: "usr_admin",
      email: "admin@gmail.com",
      name: "Admin",
      role: "admin",
      password: "admin123",
      phone: "+1 (555) 0199"
    }
  ],
  locations: [],
  classes: [],
  members: [],
  attendance: [],
  volunteers: [],
  volunteerAttendance: []
};

async function clearAll() {
  console.log('Clearing MongoDB Atlas completely...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  await Promise.all([
    db.collection('users').deleteMany({ role: { $ne: 'admin' } }),
    db.collection('locations').deleteMany({}),
    db.collection('classes').deleteMany({}),
    db.collection('members').deleteMany({}),
    db.collection('attendance').deleteMany({}),
    db.collection('volunteers').deleteMany({}),
    db.collection('volunteerAttendance').deleteMany({})
  ]);

  // Ensure admin user exists in MongoDB
  const adminSeed = cleanDbData.users[0];
  await db.collection('users').updateOne(
    { email: adminSeed.email },
    { $set: adminSeed },
    { upsert: true }
  );

  await client.close();
  console.log('MongoDB Atlas collections cleared to 0.');

  // Write clean empty db.json
  const dbJsonPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(cleanDbData, null, 2), 'utf8');
  console.log('db.json reset to empty 0 state.');
}

clearAll().catch(err => {
  console.error('Failed to clear database:', err);
  process.exit(1);
});
