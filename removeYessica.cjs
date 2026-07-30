const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

async function removeYessica() {
  console.log('Searching for Yessica Blessy in MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // Find member(s) matching Yessica
  const yessicaMembers = await db.collection('members').find({
    name: { $regex: /yessica/i }
  }).toArray();

  console.log(`Found ${yessicaMembers.length} member(s) matching 'Yessica':`, yessicaMembers.map(m => ({ id: m.id, name: m.name })));

  const yessicaIds = yessicaMembers.map(m => m.id);

  if (yessicaIds.length > 0) {
    // Delete from members collection
    const deleteRes = await db.collection('members').deleteMany({
      id: { $in: yessicaIds }
    });
    console.log(`Deleted ${deleteRes.deletedCount} member document(s) from 'members' collection.`);

    // Remove ID from all attendance records
    const updateRes = await db.collection('attendance').updateMany(
      { checkedInMemberIds: { $in: yessicaIds } },
      { $pull: { checkedInMemberIds: { $in: yessicaIds } } }
    );
    console.log(`Updated ${updateRes.modifiedCount} attendance log(s) removing Yessica from checked-in lists.`);
  } else {
    console.log('No member found with name matching Yessica.');
  }

  await client.close();
  console.log('MongoDB cleanup completed.');

  // Clean db.json if present
  const dbJsonPath = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    if (dbData.members) {
      dbData.members = dbData.members.filter(m => !/yessica/i.test(m.name));
    }
    if (dbData.attendance && yessicaIds.length > 0) {
      dbData.attendance.forEach(a => {
        if (a.checkedInMemberIds) {
          a.checkedInMemberIds = a.checkedInMemberIds.filter(id => !yessicaIds.includes(id));
        }
      });
    }
    fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log('db.json updated.');
  }
}

removeYessica().catch(err => {
  console.error('Failed to remove Yessica records:', err);
  process.exit(1);
});
