const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

async function run() {
  const dbData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
  console.log('Loaded db.json with:', {
    users: dbData.users?.length,
    locations: dbData.locations?.length,
    classes: dbData.classes?.length,
    members: dbData.members?.length,
    attendance: dbData.attendance?.length,
    volunteers: dbData.volunteers?.length,
    volunteerAttendance: dbData.volunteerAttendance?.length
  });

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB Atlas successfully.');

  const db = client.db('daattendance');

  // Upsert Users
  if (dbData.users && dbData.users.length > 0) {
    for (const u of dbData.users) {
      await db.collection('users').updateOne(
        { email: u.email.toLowerCase() },
        { $set: u },
        { upsert: true }
      );
    }
    console.log('Users upserted:', dbData.users.length);
  }

  // Replace/Upsert Locations
  if (dbData.locations && dbData.locations.length > 0) {
    for (const loc of dbData.locations) {
      await db.collection('locations').updateOne(
        { id: loc.id },
        { $set: loc },
        { upsert: true }
      );
    }
    console.log('Locations upserted:', dbData.locations.length);
  }

  // Replace/Upsert Classes
  if (dbData.classes && dbData.classes.length > 0) {
    for (const cls of dbData.classes) {
      await db.collection('classes').updateOne(
        { id: cls.id },
        { $set: cls },
        { upsert: true }
      );
    }
    console.log('Classes upserted:', dbData.classes.length);
  }

  // Replace/Upsert Members (Students)
  if (dbData.members && dbData.members.length > 0) {
    for (const m of dbData.members) {
      await db.collection('members').updateOne(
        { id: m.id },
        { $set: m },
        { upsert: true }
      );
    }
    console.log('Members (Students) upserted:', dbData.members.length);
  }

  // Replace/Upsert Attendance
  if (dbData.attendance && dbData.attendance.length > 0) {
    for (const att of dbData.attendance) {
      await db.collection('attendance').updateOne(
        { id: att.id },
        { $set: att },
        { upsert: true }
      );
    }
    console.log('Student Attendance logs upserted:', dbData.attendance.length);
  }

  // Replace/Upsert Volunteers
  if (dbData.volunteers && dbData.volunteers.length > 0) {
    for (const v of dbData.volunteers) {
      await db.collection('volunteers').updateOne(
        { id: v.id },
        { $set: v },
        { upsert: true }
      );
    }
    console.log('Volunteers upserted:', dbData.volunteers.length);
  }

  // Replace/Upsert Volunteer Attendance
  if (dbData.volunteerAttendance && dbData.volunteerAttendance.length > 0) {
    for (const va of dbData.volunteerAttendance) {
      await db.collection('volunteerAttendance').updateOne(
        { id: va.id },
        { $set: va },
        { upsert: true }
      );
    }
    console.log('Volunteer Attendance logs upserted:', dbData.volunteerAttendance.length);
  }

  await client.close();
  console.log('MongoDB sync completed successfully!');
}

run().catch(err => {
  console.error('MongoDB sync error:', err);
  process.exit(1);
});
