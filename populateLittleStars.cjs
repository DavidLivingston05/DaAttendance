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

// 4 Little Stars Students with attendance array corresponding to conductedDates
const rawStudents = [
  { id: "mem_ls_001", name: "Miriam",   att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] },
  { id: "mem_ls_002", name: "Savitha",  att: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0] },
  { id: "mem_ls_003", name: "Allan",    att: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
  { id: "mem_ls_004", name: "Dhiya",    att: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

async function populateLittleStars() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // 1. Create Teacher Sis. Sheeba
  const teacherObj = {
    id: "usr_sheeba",
    email: "sheeba@church.org",
    name: "Sis. Sheeba",
    role: "teacher",
    password: "password123",
    locationId: ""
  };
  await db.collection('users').updateOne(
    { id: "usr_sheeba" },
    { $set: teacherObj },
    { upsert: true }
  );

  // 2. Create Class Little Stars (1st–2nd)
  const classObj = {
    id: "cls_ls",
    name: "Little Stars (1st–2nd)",
    locationId: "",
    assignedTeacherId: "usr_sheeba",
    schedule: "Sunday 09:00 AM"
  };

  await db.collection('classes').updateOne(
    { id: "cls_ls" },
    { $set: classObj },
    { upsert: true }
  );
  console.log('Class Little Stars (1st–2nd) created/updated with teacher Sis. Sheeba.');

  // 3. Insert Students
  const memberDocs = rawStudents.map(s => ({
    id: s.id,
    name: s.name,
    email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@church.org`,
    phone: "+1 (555) 0100",
    status: "active",
    joinedDate: "2026-01-01",
    classIds: ["cls_ls"]
  }));

  for (const doc of memberDocs) {
    await db.collection('members').updateOne(
      { id: doc.id },
      { $set: doc },
      { upsert: true }
    );
  }
  console.log(`Upserted ${memberDocs.length} student(s) into Little Stars class.`);

  // 4. Insert Attendance logs per date
  let attCounter = 1;
  const attendanceDocs = [];

  conductedDates.forEach((dateStr, dateIdx) => {
    const checkedInMemberIds = rawStudents
      .filter(s => s.att[dateIdx] === 1)
      .map(s => s.id);

    const attDoc = {
      id: `att_ls_${String(attCounter++).padStart(3, '0')}`,
      classId: "cls_ls",
      date: dateStr,
      checkedInMemberIds,
      notes: "Roll call logged",
      recordedBy: "usr_sheeba",
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
  console.log(`Upserted ${attendanceDocs.length} attendance log(s) for Little Stars.`);

  await client.close();
  console.log('MongoDB population completed.');

  // 5. Update db.json
  const dbJsonPath = path.join(__dirname, 'db.json');
  if (fs.existsSync(dbJsonPath)) {
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    if (!dbData.classes) dbData.classes = [];
    if (!dbData.classes.some(c => c.id === 'cls_ls')) dbData.classes.push(classObj);
    
    if (!dbData.users) dbData.users = [];
    if (!dbData.users.some(u => u.id === 'usr_sheeba')) dbData.users.push(teacherObj);

    if (!dbData.members) dbData.members = [];
    memberDocs.forEach(m => {
      if (!dbData.members.some(existing => existing.id === m.id)) {
        dbData.members.push(m);
      }
    });

    if (!dbData.attendance) dbData.attendance = [];
    attendanceDocs.forEach(a => {
      const idx = dbData.attendance.findIndex(existing => existing.classId === a.classId && existing.date === a.date);
      if (idx >= 0) dbData.attendance[idx] = a;
      else dbData.attendance.push(a);
    });

    fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2), 'utf8');
    console.log('db.json updated.');
  }
}

populateLittleStars().catch(err => {
  console.error('Failed to populate Little Stars:', err);
  process.exit(1);
});
