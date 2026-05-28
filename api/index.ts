import express from "express";
import path from "path";
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";
import dbData from "../db.json";

// Load local environment variables when developing locally
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined. Please verify your .env.local file or server environment settings.");
}

// Cached DB Connection for Serverless Scaling
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  const db = client.db("daattendance");

  // Perform automatic seeding if collections are empty
  await seedDatabase(db);

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

// High-fidelity DB auto-seeding routine
async function seedDatabase(db: Db) {
  try {
    // 1. Users / Access Credentials
    const userCount = await db.collection("users").countDocuments();
    if (userCount === 0 && dbData.users && dbData.users.length > 0) {
      await db.collection("users").insertMany(dbData.users);
      console.log("Seeded users collection successfully");
    }

    // 2. Campus Locations
    const locCount = await db.collection("locations").countDocuments();
    if (locCount === 0 && dbData.locations && dbData.locations.length > 0) {
      await db.collection("locations").insertMany(dbData.locations);
      console.log("Seeded locations collection successfully");
    }

    // 3. Sunday School Classes
    const classCount = await db.collection("classes").countDocuments();
    if (classCount === 0 && dbData.classes && dbData.classes.length > 0) {
      await db.collection("classes").insertMany(dbData.classes);
      console.log("Seeded classes collection successfully");
    }

    // 4. Students / Members
    const memberCount = await db.collection("members").countDocuments();
    if (memberCount === 0 && dbData.members && dbData.members.length > 0) {
      await db.collection("members").insertMany(dbData.members);
      console.log("Seeded members collection successfully");
    }

    // 5. Historical Student Attendance
    const attCount = await db.collection("attendance").countDocuments();
    if (attCount === 0 && dbData.attendance && dbData.attendance.length > 0) {
      await db.collection("attendance").insertMany(dbData.attendance);
      console.log("Seeded attendance collection successfully");
    }

    // 6. Senior Volunteers / Staff
    const volCount = await db.collection("volunteers").countDocuments();
    if (volCount === 0 && dbData.volunteers && dbData.volunteers.length > 0) {
      await db.collection("volunteers").insertMany(dbData.volunteers);
      console.log("Seeded volunteers collection successfully");
    }

    // 7. Volunteer Attendance Logs
    const volAttCount = await db.collection("volunteerAttendance").countDocuments();
    if (volAttCount === 0 && dbData.volunteerAttendance && dbData.volunteerAttendance.length > 0) {
      await db.collection("volunteerAttendance").insertMany(dbData.volunteerAttendance);
      console.log("Seeded volunteerAttendance collection successfully");
    }
  } catch (e) {
    console.error("Auto-seeding database warning:", e);
  }
}

// Middleware to inject connection pool into request lifecycle
app.use(async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    (req as any).db = db;
    next();
  } catch (e: any) {
    console.error("Database connection failure:", e);
    res.status(500).json({ error: "Cloud database connection failed", details: e.message });
  }
});

// ---------------------- CLOUD API ROUTES ----------------------

// 1. AUTHENTICATION & PORTAL LOGINS
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db: Db = (req as any).db;
  const user = await db.collection("users").findOne({ email: new RegExp("^" + email.trim() + "$", "i") });

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = `token-${user.id}-${Math.floor(Math.random() * 1000000)}`;
  const { password: _, _id, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, role, phone, locationId } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: "Email, password, name, and role are required" });
  }

  const db: Db = (req as any).db;
  const exists = await db.collection("users").findOne({ email: new RegExp("^" + email.trim() + "$", "i") });
  if (exists) {
    return res.status(400).json({ error: "A user with this email address already exists" });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    email: email.toLowerCase().trim(),
    name,
    role,
    password,
    phone: phone || "",
    locationId: locationId || undefined
  };

  await db.collection("users").insertOne(newUser);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, token: `token-${newUser.id}` });
});

// 2. CAMPUS LOCATIONS
app.get("/api/locations", async (req, res) => {
  const db: Db = (req as any).db;
  const locations = await db.collection("locations").find({}).toArray();
  res.json(locations.map(({ _id, ...rest }) => rest));
});

app.post("/api/locations", async (req, res) => {
  const { name, address, phone } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Name and address are required" });
  }

  const db: Db = (req as any).db;
  const newLoc = {
    id: `loc_${Date.now()}`,
    name,
    address,
    phone: phone || ""
  };
  await db.collection("locations").insertOne(newLoc);
  res.status(201).json(newLoc);
});

app.put("/api/locations/:id", async (req, res) => {
  const { id } = req.params;
  const { name, address, phone } = req.body;

  const db: Db = (req as any).db;
  const existing = await db.collection("locations").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Location not found" });
  }

  const updatedFields = {
    name: name !== undefined ? name : existing.name,
    address: address !== undefined ? address : existing.address,
    phone: phone !== undefined ? phone : existing.phone
  };

  await db.collection("locations").updateOne({ id }, { $set: updatedFields });
  res.json({ id, ...updatedFields });
});

app.delete("/api/locations/:id", async (req, res) => {
  const { id } = req.params;
  const db: Db = (req as any).db;

  const isLinked = await db.collection("classes").findOne({ locationId: id });
  if (isLinked) {
    return res.status(400).json({ error: "Cannot delete location with assigned classes. Delete or reassign classes first." });
  }

  await db.collection("locations").deleteOne({ id });
  res.json({ success: true });
});

// 3. SUNDAY SCHOOL CLASSES
app.get("/api/classes", async (req, res) => {
  const db: Db = (req as any).db;
  const classes = await db.collection("classes").find({}).toArray();
  res.json(classes.map(({ _id, ...rest }) => rest));
});

app.post("/api/classes", async (req, res) => {
  const { name, locationId, assignedTeacherId, schedule } = req.body;
  if (!name || !locationId || !assignedTeacherId || !schedule) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db: Db = (req as any).db;
  const newClass = {
    id: `cls_${Date.now()}`,
    name,
    locationId,
    assignedTeacherId,
    schedule
  };
  await db.collection("classes").insertOne(newClass);
  res.status(201).json(newClass);
});

app.put("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, locationId, assignedTeacherId, schedule } = req.body;

  const db: Db = (req as any).db;
  const existing = await db.collection("classes").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Class not found" });
  }

  const updatedFields = {
    name: name !== undefined ? name : existing.name,
    locationId: locationId !== undefined ? locationId : existing.locationId,
    assignedTeacherId: assignedTeacherId !== undefined ? assignedTeacherId : existing.assignedTeacherId,
    schedule: schedule !== undefined ? schedule : existing.schedule
  };

  await db.collection("classes").updateOne({ id }, { $set: updatedFields });
  res.json({ id, ...updatedFields });
});

app.delete("/api/classes/:id", async (req, res) => {
  const { id } = req.params;
  const db: Db = (req as any).db;

  await db.collection("classes").deleteOne({ id });
  // Cascade clean-ups
  await db.collection("members").updateMany({}, { $pull: { classIds: id } as any });
  await db.collection("attendance").deleteMany({ classId: id });

  res.json({ success: true });
});

// 4. JUNIOR STUDENTS / MEMBERS
app.get("/api/members", async (req, res) => {
  const db: Db = (req as any).db;
  const members = await db.collection("members").find({}).toArray();
  res.json(members.map(({ _id, ...rest }) => rest));
});

app.post("/api/members", async (req, res) => {
  const { name, email, phone, status, joinedDate, classIds } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  const db: Db = (req as any).db;
  const newMem = {
    id: `mem_${Date.now()}`,
    name,
    email,
    phone: phone || "",
    status: status || "active",
    joinedDate: joinedDate || new Date().toISOString().split("T")[0],
    classIds: classIds || []
  };

  await db.collection("members").insertOne(newMem);
  res.status(201).json(newMem);
});

app.put("/api/members/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, status, joinedDate, classIds } = req.body;

  const db: Db = (req as any).db;
  const existing = await db.collection("members").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Member not found" });
  }

  const updatedFields = {
    name: name !== undefined ? name : existing.name,
    email: email !== undefined ? email : existing.email,
    phone: phone !== undefined ? phone : existing.phone,
    status: status !== undefined ? status : existing.status,
    joinedDate: joinedDate !== undefined ? joinedDate : existing.joinedDate,
    classIds: classIds !== undefined ? classIds : existing.classIds
  };

  await db.collection("members").updateOne({ id }, { $set: updatedFields });
  res.json({ id, ...updatedFields });
});

app.delete("/api/members/:id", async (req, res) => {
  const { id } = req.params;
  const db: Db = (req as any).db;

  await db.collection("members").deleteOne({ id });
  // Cascade clean presence ticks out of attendance history
  await db.collection("attendance").updateMany({}, { $pull: { checkedInMemberIds: id } as any });

  res.json({ success: true });
});

// 5. ATTENDANCE SUBMISSION & HISTORIES
app.get("/api/attendance", async (req, res) => {
  const db: Db = (req as any).db;
  const attendance = await db.collection("attendance").find({}).toArray();
  res.json(attendance.map(({ _id, ...rest }) => rest));
});

app.post("/api/attendance", async (req, res) => {
  const { classId, date, checkedInMemberIds, notes, recordedBy } = req.body;
  if (!classId || !date || !recordedBy) {
    return res.status(400).json({ error: "Class ID, date, and recorder details are required" });
  }

  const db: Db = (req as any).db;
  const existing = await db.collection("attendance").findOne({ classId, date });

  const finalRecord = {
    id: existing ? existing.id : `att_${Date.now()}`,
    classId,
    date,
    checkedInMemberIds: checkedInMemberIds || [],
    notes: notes || "",
    recordedBy,
    recordedAt: new Date().toISOString()
  };

  if (existing) {
    await db.collection("attendance").updateOne({ classId, date }, { $set: finalRecord });
  } else {
    await db.collection("attendance").insertOne(finalRecord);
  }

  res.status(200).json(finalRecord);
});

app.delete("/api/attendance", async (req, res) => {
  const { classId, date } = req.query;
  if (!classId || !date) {
    return res.status(400).json({ error: "Class ID and date are required" });
  }

  const db: Db = (req as any).db;
  await db.collection("attendance").deleteOne({ classId: classId as string, date: date as string });
  res.status(200).json({ success: true, message: "Attendance record deleted" });
});

// 6. STAFF & TEACHERS DIRECTORY
app.get("/api/teachers", async (req, res) => {
  const db: Db = (req as any).db;
  const teachers = await db.collection("users").find({ role: "teacher" }).toArray();
  res.json(teachers.map(({ password, _id, ...safe }) => safe));
});

app.put("/api/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, locationId } = req.body;

  const db: Db = (req as any).db;
  const existing = await db.collection("users").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Teacher not found" });
  }

  const updatedFields = {
    name: name !== undefined ? name : existing.name,
    locationId: locationId !== undefined ? locationId : existing.locationId
  };

  await db.collection("users").updateOne({ id }, { $set: updatedFields });
  const updatedUser = await db.collection("users").findOne({ id });
  const { password: _, _id: __, ...safeUser } = updatedUser!;
  res.json(safeUser);
});

app.delete("/api/teachers/:id", async (req, res) => {
  const { id } = req.params;
  const db: Db = (req as any).db;

  await db.collection("users").deleteOne({ id });
  // Unassign deleted teacher from cohorts
  await db.collection("classes").updateMany({ assignedTeacherId: id }, { $set: { assignedTeacherId: "usr_admin" } });

  res.json({ success: true });
});

// 7. PHYSICAL VOLUNTEERS DIRECTORY
app.get("/api/volunteers", async (req, res) => {
  const db: Db = (req as any).db;
  const volunteers = await db.collection("volunteers").find({}).toArray();
  res.json(volunteers.map(({ _id, ...rest }) => rest));
});

app.post("/api/volunteers", async (req, res) => {
  const { name, locationId, role } = req.body;
  if (!name || !locationId) {
    return res.status(400).json({ error: "Name and Location ID are required" });
  }

  const db: Db = (req as any).db;
  const newVol = {
    id: `vol_${Date.now()}`,
    name,
    locationId,
    role: role || "Volunteer"
  };

  await db.collection("volunteers").insertOne(newVol);
  res.status(201).json(newVol);
});

app.put("/api/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, locationId, role } = req.body;

  const db: Db = (req as any).db;
  const existing = await db.collection("volunteers").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Volunteer not found" });
  }

  const updatedFields = {
    name: name !== undefined ? name : existing.name,
    locationId: locationId !== undefined ? locationId : existing.locationId,
    role: role !== undefined ? role : existing.role
  };

  await db.collection("volunteers").updateOne({ id }, { $set: updatedFields });
  res.json({ id, ...updatedFields });
});

app.delete("/api/volunteers/:id", async (req, res) => {
  const { id } = req.params;
  const db: Db = (req as any).db;

  await db.collection("volunteers").deleteOne({ id });
  // Remove from volunteer checks
  await db.collection("volunteerAttendance").updateMany({}, { $pull: { checkedInPersonnelIds: id } as any });

  res.json({ success: true });
});

// 8. STAFF & VOLUNTEER ATTENDANCE LOGS
app.get("/api/volunteer-attendance", async (req, res) => {
  const db: Db = (req as any).db;
  const attendance = await db.collection("volunteerAttendance").find({}).toArray();
  res.json(attendance.map(({ _id, ...rest }) => rest));
});

app.post("/api/volunteer-attendance", async (req, res) => {
  const { locationId, date, checkedInPersonnelIds, notes } = req.body;
  if (!locationId || !date) {
    return res.status(400).json({ error: "Location ID and date are required" });
  }

  const db: Db = (req as any).db;
  const existing = await db.collection("volunteerAttendance").findOne({ locationId, date });

  const finalRecord = {
    id: existing ? existing.id : `vol_att_${Date.now()}`,
    locationId,
    date,
    checkedInPersonnelIds: checkedInPersonnelIds || [],
    notes: notes || "",
    recordedAt: new Date().toISOString()
  };

  if (existing) {
    await db.collection("volunteerAttendance").updateOne({ locationId, date }, { $set: finalRecord });
  } else {
    await db.collection("volunteerAttendance").insertOne(finalRecord);
  }

  res.status(200).json(finalRecord);
});

app.delete("/api/volunteer-attendance", async (req, res) => {
  const { locationId, date } = req.query;
  if (!locationId || !date) {
    return res.status(400).json({ error: "Location ID and date are required" });
  }

  const db: Db = (req as any).db;
  await db.collection("volunteerAttendance").deleteOne({ locationId: locationId as string, date: date as string });
  res.status(200).json({ success: true, message: "Personnel attendance record deleted" });
});

// 9. CORE RECALCULATING STATISTICS
app.get("/api/stats", async (req, res) => {
  try {
    const db: Db = (req as any).db;
    const locationsCount = await db.collection("locations").countDocuments();
    const classesCount = await db.collection("classes").countDocuments();
    const teachersCount = await db.collection("users").countDocuments({ role: "teacher" });
    const membersCount = await db.collection("members").countDocuments();

    // Query databases to map attendance rates
    const attendance = await db.collection("attendance").find({}).toArray();
    const classes = await db.collection("classes").find({}).toArray();
    const members = await db.collection("members").find({}).toArray();

    let attendanceRateToday = 0;
    if (attendance.length > 0) {
      const recentRates = attendance.map((att: any) => {
        const classObj = classes.find((c: any) => c.id === att.classId);
        if (!classObj) return 0;
        const totalInClass = members.filter((m: any) => m.classIds && m.classIds.includes(att.classId) && m.status === "active").length;
        if (totalInClass === 0) return 0;
        return (att.checkedInMemberIds.length / totalInClass) * 100;
      });
      const validRates = recentRates.filter((r: number) => r > 0);
      if (validRates.length > 0) {
        attendanceRateToday = Math.round(validRates.reduce((a: number, b: number) => a + b, 0) / validRates.length);
      }
    }

    res.json({
      locationsCount,
      classesCount,
      teachersCount,
      membersCount,
      attendanceRateToday: attendanceRateToday || 75
    });
  } catch (e: any) {
    res.status(500).json({ error: "Stats calculation failed", details: e.message });
  }
});

export default app;
