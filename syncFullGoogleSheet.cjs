const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://davidlivingston1824:Livingston@cluster0.j34xwec.mongodb.net/?appName=Cluster0";

const dates = [
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

const users = [
  { id: "usr_admin", email: "admin@gmail.com", name: "Admin", role: "admin", password: "admin123", phone: "+1 (555) 0199" },
  { id: "usr_jayesh", email: "jayesh@church.org", name: "Bro. Jayesh", role: "teacher", password: "password123" },
  { id: "usr_hannah", email: "hannah@church.org", name: "Sis. Hannah", role: "teacher", password: "password123" },
  { id: "usr_sheeba", email: "sheeba@church.org", name: "Sis. Sheeba", role: "teacher", password: "password123" },
  { id: "usr_magdalyn", email: "magdalyn@church.org", name: "Sis. Magdalyn", role: "teacher", password: "password123" },
  { id: "usr_surendar", email: "surendar@church.org", name: "Bro. Surendar Joshua", role: "teacher", password: "password123" },
  { id: "usr_anita", email: "anita@church.org", name: "Sis. Anita", role: "teacher", password: "password123" },
  { id: "usr_stella", email: "stella@church.org", name: "Sis. Stella", role: "teacher", password: "password123" },
  { id: "usr_jennifer", email: "jennifer@church.org", name: "Sis. Jennifer", role: "teacher", password: "password123" },
  { id: "usr_susanna", email: "susanna@church.org", name: "Sis. Susanna", role: "teacher", password: "password123" },
  { id: "usr_gracy", email: "gracy@church.org", name: "Sis. Gracy Bai", role: "teacher", password: "password123" }
];

const volunteers = [
  { id: "vol_gideon", name: "Bro. Gideon Prakash", role: "Director" },
  { id: "vol_sharon", name: "Sis. Sharon", role: "Volunteer" }
];

const classes = [
  { id: "cls_ll", name: "Little Lambs (LKG–UKG)", locationId: "", assignedTeacherId: "usr_jayesh, usr_hannah", schedule: "Sunday 09:00 AM" },
  { id: "cls_ls", name: "Little Stars (1st–2nd)", locationId: "", assignedTeacherId: "usr_sheeba", schedule: "Sunday 09:00 AM" },
  { id: "cls_ts", name: "Twinkle Stars (3rd–4th)", locationId: "", assignedTeacherId: "usr_magdalyn, usr_surendar", schedule: "Sunday 09:00 AM" },
  { id: "cls_bs", name: "Bright Stars (5th–6th)", locationId: "", assignedTeacherId: "usr_anita", schedule: "Sunday 09:00 AM" },
  { id: "cls_rs", name: "Rising Stars (7th–8th)", locationId: "", assignedTeacherId: "usr_stella", schedule: "Sunday 09:00 AM" },
  { id: "cls_ss", name: "Shining Stars (9th–10th)", locationId: "", assignedTeacherId: "usr_jennifer", schedule: "Sunday 09:00 AM" },
  { id: "cls_st", name: "Shooting Stars (11th–12th)", locationId: "", assignedTeacherId: "usr_susanna", schedule: "Sunday 09:00 AM" },
  { id: "cls_ms", name: "Morning Stars (College)", locationId: "", assignedTeacherId: "usr_gracy", schedule: "Sunday 09:00 AM" },
  { id: "cls_ps", name: "Pending / 1st Service", locationId: "", assignedTeacherId: "usr_admin", schedule: "Sunday 09:00 AM" }
];

// Teachers & Staff Attendance matrix across 11 dates
const personnelAttendanceMap = {
  "usr_jayesh":    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  "usr_hannah":    [0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
  "usr_sheeba":    [1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1],
  "usr_magdalyn":  [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  "usr_surendar":  [0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0],
  "usr_anita":     [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  "usr_stella":    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  "usr_jennifer":  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  "usr_susanna":   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  "usr_gracy":     [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  "vol_gideon":    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  "vol_sharon":    [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1]
};

// Students raw data grouped by class ID
const rawStudentsByClass = {
  cls_ll: [
    { name: "Aradhana",          att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Ashmal Rithik",     att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Gabyleona",         att: [0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0] },
    { name: "Jerome Mithran",    att: [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1] },
    { name: "Joel",              att: [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1] },
    { name: "Kaitlyn Jane",      att: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1] },
    { name: "Melvin Sam",        att: [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0] },
    { name: "Rebekah",           att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] },
    { name: "Yessica Blessy",    att: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
    { name: "Dheera Jonathan",   att: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  ],
  cls_ls: [
    { name: "Miriam",            att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] },
    { name: "Savitha",           att: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0] },
    { name: "Allan",             att: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0] },
    { name: "Dhiya",             att: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  ],
  cls_ts: [
    { name: "Alwin",             att: [0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1] },
    { name: "Blessy Pinky",      att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Bommi",             att: [1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0] },
    { name: "Jerrin",            att: [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1] }
  ],
  cls_bs: [
    { name: "Beryl",             att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] },
    { name: "Dicson",            att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Rafael Paul",       att: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Sweetlyn",          att: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1] }
  ],
  cls_rs: [
    { name: "Hasini",            att: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Sam",               att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }
  ],
  cls_ss: [
    { name: "Janani",            att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Nitish",            att: [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0] },
    { name: "Sathish",           att: [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] }
  ],
  cls_st: [
    { name: "Benjamin John",     att: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Dency",             att: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
    { name: "Dharshan",          att: [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] },
    { name: "Divya Dharshini",   att: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0] },
    { name: "Sripriya",          att: [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
    { name: "Divya",             att: [0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1] }
  ],
  cls_ms: [
    { name: "Cerline",           att: [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1] },
    { name: "Dharshini",         att: [0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1] },
    { name: "Merlyn Madhumitha", att: [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
    { name: "Pearlyn",           att: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1] }
  ],
  cls_ps: [
    { name: "Aakash",            att: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    { name: "Santosh",           att: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
    { name: "Harini",            att: [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0] },
    { name: "ASINI",             att: [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0] },
    { name: "Aaron",             att: [0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0] }
  ]
};

// Process members array & attendance records
const members = [];
const attendance = [];
let memIdCounter = 1;

for (const classId of Object.keys(rawStudentsByClass)) {
  const studentList = rawStudentsByClass[classId];
  studentList.forEach(s => {
    const memId = `mem_${String(memIdCounter++).padStart(3, '0')}`;
    members.push({
      id: memId,
      name: s.name.trim(),
      email: `${s.name.trim().toLowerCase().replace(/\s+/g, '.')}@church.org`,
      phone: "+1 (555) 01" + String(Math.floor(1000 + Math.random() * 9000)),
      status: "active",
      joinedDate: "2026-01-01",
      classIds: [classId]
    });

    s.memId = memId;
  });
}

// Build student attendance records per class & per date
let attIdCounter = 1;
for (const classId of Object.keys(rawStudentsByClass)) {
  const studentList = rawStudentsByClass[classId];

  dates.forEach((dateStr, dateIdx) => {
    const checkedInMemberIds = studentList
      .filter(s => s.att[dateIdx] === 1)
      .map(s => s.memId);

    attendance.push({
      id: `att_${String(attIdCounter++).padStart(4, '0')}`,
      classId,
      date: dateStr,
      checkedInMemberIds,
      notes: "Roll call logged",
      recordedBy: "usr_admin",
      recordedAt: `${dateStr}T10:30:00.000Z`
    });
  });
}

// Build volunteer (teachers & leaders) attendance records per location & per date
const volunteerAttendance = [];
let volAttIdCounter = 1;

dates.forEach((dateStr, dateIdx) => {
  const checkedInPersonnelIds = [];

  for (const personId of Object.keys(personnelAttendanceMap)) {
    if (personnelAttendanceMap[personId][dateIdx] === 1) {
      checkedInPersonnelIds.push(personId);
    }
  }

  volunteerAttendance.push({
    id: `vol_att_${String(volAttIdCounter++).padStart(4, '0')}`,
    locationId: "",
    date: dateStr,
    checkedInPersonnelIds,
    notes: "Leaders & staff attendance logged",
    recordedAt: `${dateStr}T10:30:00.000Z`
  });
});

async function syncFullGoogleSheet() {
  console.log('Connecting to MongoDB Atlas to sync full Google Sheets dataset...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('daattendance');

  // Upsert users
  for (const u of users) {
    await db.collection('users').updateOne({ id: u.id }, { $set: u }, { upsert: true });
  }
  console.log(`Upserted ${users.length} teachers/users.`);

  // Upsert volunteers
  for (const v of volunteers) {
    await db.collection('volunteers').updateOne({ id: v.id }, { $set: v }, { upsert: true });
  }
  console.log(`Upserted ${volunteers.length} volunteers/directors.`);

  // Upsert classes
  for (const c of classes) {
    await db.collection('classes').updateOne({ id: c.id }, { $set: c }, { upsert: true });
  }
  console.log(`Upserted ${classes.length} classes.`);

  // Upsert members
  for (const m of members) {
    await db.collection('members').updateOne({ id: m.id }, { $set: m }, { upsert: true });
  }
  console.log(`Upserted ${members.length} student members.`);

  // Upsert student attendance
  for (const a of attendance) {
    await db.collection('attendance').updateOne({ classId: a.classId, date: a.date }, { $set: a }, { upsert: true });
  }
  console.log(`Upserted ${attendance.length} student attendance logs.`);

  // Upsert volunteer attendance
  for (const va of volunteerAttendance) {
    await db.collection('volunteerAttendance').updateOne({ locationId: va.locationId, date: va.date }, { $set: va }, { upsert: true });
  }
  console.log(`Upserted ${volunteerAttendance.length} leadership/teacher attendance logs.`);

  await client.close();
  console.log('MongoDB Atlas sync complete.');

  // Update db.json
  const fullDb = {
    users,
    locations: [],
    classes,
    members,
    attendance,
    volunteers,
    volunteerAttendance
  };

  const dbJsonPath = path.join(__dirname, 'db.json');
  fs.writeFileSync(dbJsonPath, JSON.stringify(fullDb, null, 2), 'utf8');
  console.log('db.json successfully updated with full dataset.');
}

syncFullGoogleSheet().catch(err => {
  console.error('Failed to sync Google Sheet:', err);
  process.exit(1);
});
