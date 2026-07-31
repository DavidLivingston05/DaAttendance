const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

async function cleanExtraData() {
  const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
  console.log('Restoring MongoDB Atlas strictly to db.json state:', {
    usersCount: dbData.users?.length || 0,
    classesCount: dbData.classes?.length || 0,
    membersCount: dbData.members?.length || 0,
    attendanceCount: dbData.attendance?.length || 0
  });

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // Clear all collections completely
  await Promise.all([
    db.collection('users').deleteMany({}),
    db.collection('locations').deleteMany({}),
    db.collection('classes').deleteMany({}),
    db.collection('members').deleteMany({}),
    db.collection('attendance').deleteMany({}),
    db.collection('volunteers').deleteMany({}),
    db.collection('volunteerAttendance').deleteMany({})
  ]);

  // Insert exact dbData
  if (dbData.users && dbData.users.length > 0) {
    await db.collection('users').insertMany(dbData.users);
  }
  if (dbData.locations && dbData.locations.length > 0) {
    await db.collection('locations').insertMany(dbData.locations);
  }
  if (dbData.classes && dbData.classes.length > 0) {
    await db.collection('classes').insertMany(dbData.classes);
  }
  if (dbData.members && dbData.members.length > 0) {
    await db.collection('members').insertMany(dbData.members);
  }
  if (dbData.attendance && dbData.attendance.length > 0) {
    await db.collection('attendance').insertMany(dbData.attendance);
  }
  if (dbData.volunteers && dbData.volunteers.length > 0) {
    await db.collection('volunteers').insertMany(dbData.volunteers);
  }
  if (dbData.volunteerAttendance && dbData.volunteerAttendance.length > 0) {
    await db.collection('volunteerAttendance').insertMany(dbData.volunteerAttendance);
  }

  await client.close();
  console.log('MongoDB Atlas clean restore completed successfully!');
}

cleanExtraData().catch(err => {
  console.error('Failed to clean extra data:', err);
  process.exit(1);
});
