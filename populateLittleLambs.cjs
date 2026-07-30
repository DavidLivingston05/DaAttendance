const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

const conductedDates = [
  "2026-04-19",
  "2026-03-08",
  "2026-03-15",
  "2026-03-22",
  "2026-02-08",
  "2026-02-15",
  "2026-02-22",
  "2026-01-04",
  "2026-01-11",
  "2026-01-18",
  "2026-01-25"
];

// 10 Little Lambs Students with attendance array corresponding to conductedDates
const rawStudents = [
  { id: "mem_ll_001", name: "Aradhana",          att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "mem_ll_002", name: "Ashmal Rithik",     att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "mem_ll_003", name: "Gabyleona",         att: [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0] },
  { id: "mem_ll_004", name: "Jerome Mithran",    att: [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1] },
  { id: "mem_ll_005", name: "Joel",              att: [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1] },
  { id: "mem_ll_006", name: "Kaitlyn Jane",      att: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1] },
  { id: "mem_ll_007", name: "Melvin Sam",        att: [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0] },
  { id: "mem_ll_008", name: "Rebekah",           att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] },
  { id: "mem_ll_009", name: "Yessica Blessy",    att: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
  { id: "mem_ll_010", name: "Dheera Jonathan",   att: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

async function populateLittleLambs() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // 1. Create Class Little Lambs (LKG-UKG)
  const classObj = {
    id: "cls_ll",
    name: "Little Lambs (LKG–UKG)",
    locationId: "",
    schedule: "Sunday 09:00 AM"
  };

  await db.collection('classes').updateOne(
    { id: "cls_ll" },
    { $set: classObj },
    { upsert: true }
  );
  console.log('Class Little Lambs (LKG–UKG) created/updated.');

  // 2. Insert Students
  const memberDocs = rawStudents.map(s => ({
    id: s.id,
    name: s.name,
    email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@church.org`,
    phone: "+1 (555) 0100",
    status: "active",
    joinedDate: "2026-01-01",
    classIds: ["cls_ll"]
  }));

  for (const doc of memberDocs) {
    await db.collection('members').updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`Upserted ${memberDocs.length} student(s) into Little Lambs class.`);

  // 3. Insert Attendance logs per date
  let attCounter = 1;
  const attendanceDocs = [];

  conductedDates.forEach((dateStr, dateIdx) => {
    const checkedInMemberIds = rawStudents
      .filter(s => s.att[dateIdx] === 1)
      .map(s => s.id);

    const attDoc = {
      id: `att_ll_${String(attCounter++).padStart(3, '0')}`,
      classId: "cls_ll",
      date: dateStr,
      checkedInMemberIds,
      notes: "Roll call logged",
      recordedBy: "usr_admin",
      recordedAt: `${dateStr}T10:30:00.000Z`
    };

    attendanceDocs.push(attDoc);
  });

  for (const doc of attendanceDocs) {
    await db.collection('attendance').updateOne(
      { classId: doc.classId, date: doc.date },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`Upserted ${attendanceDocs.length} attendance log(s) for Little Lambs.`);

  await client.close();
  console.log('MongoDB population completed.');

  // 4. Update db.json
  const dbJsonPath = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    dbData.classes = [classObj];
    dbData.members = memberDocs;
    dbData.attendance = attendanceDocs;
    fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log('db.json updated.');
  }
}

populateLittleLambs().catch(err => {
  console.error('Failed to populate Little Lambs:', err);
  process.exit(1);
});
