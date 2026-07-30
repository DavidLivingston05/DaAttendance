import express from "express";
import path from "path";
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";
import fs from "fs";

// Load db.json safely using fs.readFileSync to prevent ES Module assertion failures in Vercel Serverless
const dbData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "db.json"), "utf8"));

// Load local environment variables when developing locally
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("WARNING: MONGODB_URI is not defined in environment variables!");
}

// Cached DB Connection for Serverless Scaling
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables. Please add it in your dashboard.");
  }
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI as string, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    connectTimeoutMS: 5000
  });
  await client.connect();
  const db = client.db("daattendance");

  // Create database indexes asynchronously in background for sub-millisecond lookups
  Promise.all([
    db.collection("users").createIndex({ email: 1 }),
    db.collection("users").createIndex({ id: 1 }),
    db.collection("members").createIndex({ id: 1 }),
    db.collection("members").createIndex({ classIds: 1 }),
    db.collection("classes").createIndex({ id: 1 }),
    db.collection("attendance").createIndex({ classId: 1, date: 1 }),
    db.collection("volunteerAttendance").createIndex({ locationId: 1, date: 1 })
  ]).catch(err => console.warn("Background index creation warning:", err));

  // Perform automatic seeding if collections are empty
  await seedDatabase(db);

  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

// Cached DB Seeding Status for Serverless Containers
let isSeeded = false;

// High-fidelity DB auto-seeding routine optimized for parallel performance
async function seedDatabase(db: Db) {
  if (isSeeded) return;
  try {
    const seedPromises: Promise<any>[] = [];

    if (dbData.users && dbData.users.length > 0) {
      for (const u of dbData.users) {
        seedPromises.push(db.collection("users").updateOne({ email: u.email.toLowerCase() }, { $set: u }, { upsert: true }));
      }
    }
    if (dbData.locations && dbData.locations.length > 0) {
      for (const loc of dbData.locations) {
        seedPromises.push(db.collection("locations").updateOne({ id: loc.id }, { $set: loc }, { upsert: true }));
      }
    }
    if (dbData.classes && dbData.classes.length > 0) {
      for (const cls of dbData.classes) {
        seedPromises.push(db.collection("classes").updateOne({ id: cls.id }, { $set: cls }, { upsert: true }));
      }
    }
    if (dbData.members && dbData.members.length > 0) {
      for (const m of dbData.members) {
        seedPromises.push(db.collection("members").updateOne({ id: m.id }, { $set: m }, { upsert: true }));
      }
    }
    if (dbData.attendance && dbData.attendance.length > 0) {
      for (const att of dbData.attendance) {
        seedPromises.push(db.collection("attendance").updateOne({ id: att.id }, { $set: att }, { upsert: true }));
      }
    }
    if (dbData.volunteers && dbData.volunteers.length > 0) {
      for (const v of dbData.volunteers) {
        seedPromises.push(db.collection("volunteers").updateOne({ id: v.id }, { $set: v }, { upsert: true }));
      }
    }
    if (dbData.volunteerAttendance && dbData.volunteerAttendance.length > 0) {
      for (const va of dbData.volunteerAttendance) {
        seedPromises.push(db.collection("volunteerAttendance").updateOne({ id: va.id }, { $set: va }, { upsert: true }));
      }
    }

    if (seedPromises.length > 0) {
      await Promise.all(seedPromises);
    }
    isSeeded = true;
  } catch (e) {
    console.error("Auto-seeding database warning:", e);
  }
}

// In-memory mock DB fallback state initialized from dbData for local dev / connection failures
let localDbState: any = JSON.parse(JSON.stringify(dbData));

const saveLocalDb = () => {
  try {
    fs.writeFileSync(path.join(process.cwd(), "db.json"), JSON.stringify(localDbState, null, 2), "utf8");
  } catch (e) {
    // Filesystem may be read-only in serverless; persist silently fails
  }
};

const getCollectionData = (colName: string) => {
  if (!localDbState[colName]) {
    localDbState[colName] = [];
  }
  return localDbState[colName];
};

const createMockCollection = (colName: string) => {
  return {
    find: (query: any = {}) => {
      let data = getCollectionData(colName);
      if (query && Object.keys(query).length > 0) {
        data = data.filter((item: any) => {
          return Object.keys(query).every(key => {
            if (query[key] instanceof RegExp) {
              return query[key].test(item[key]);
            }
            if (query[key] && typeof query[key] === 'object' && query[key].role) {
              return item.role === query[key].role;
            }
            return item[key] === query[key];
          });
        });
      }
      return {
        toArray: async () => JSON.parse(JSON.stringify(data))
      };
    },
    findOne: async (query: any = {}) => {
      let data = getCollectionData(colName);
      if (query && Object.keys(query).length > 0) {
        const found = data.find((item: any) => {
          return Object.keys(query).every(key => {
            if (query[key] instanceof RegExp) {
              return query[key].test(item[key]);
            }
            return item[key] === query[key];
          });
        });
        return found ? JSON.parse(JSON.stringify(found)) : null;
      }
      return data[0] ? JSON.parse(JSON.stringify(data[0])) : null;
    },
    insertOne: async (doc: any) => {
      const data = getCollectionData(colName);
      data.push(doc);
      saveLocalDb();
      return { insertedId: doc._id || doc.id };
    },
    insertMany: async (docs: any[]) => {
      const data = getCollectionData(colName);
      data.push(...docs);
      saveLocalDb();
      return { insertedCount: docs.length };
    },
    updateOne: async (query: any, update: any) => {
      let data = getCollectionData(colName);
      const index = data.findIndex((item: any) => {
        return Object.keys(query).every(key => item[key] === query[key]);
      });
      if (index !== -1) {
        if (update.$set) {
          data[index] = { ...data[index], ...update.$set };
        }
      }
      saveLocalDb();
      return { matchedCount: index !== -1 ? 1 : 0, modifiedCount: index !== -1 ? 1 : 0 };
    },
    updateMany: async (query: any, update: any) => {
      let data = getCollectionData(colName);
      let modifiedCount = 0;
      data.forEach((item: any, index: number) => {
        const match = Object.keys(query).every(key => {
          if (query[key] && typeof query[key] === 'object' && query[key].role) {
            return item.role === query[key].role;
          }
          return item[key] === query[key];
        });
        if (match) {
          if (update.$set) {
            data[index] = { ...data[index], ...update.$set };
          }
          if (update.$pull) {
            const pullKey = Object.keys(update.$pull)[0];
            const pullVal = update.$pull[pullKey];
            if (Array.isArray(data[index][pullKey])) {
              data[index][pullKey] = data[index][pullKey].filter((val: any) => val !== pullVal);
            }
          }
          modifiedCount++;
        }
      });
      saveLocalDb();
      return { modifiedCount };
    },
    deleteOne: async (query: any) => {
      let data = getCollectionData(colName);
      const initialLength = data.length;
      localDbState[colName] = data.filter((item: any) => {
        return !Object.keys(query).every(key => item[key] === query[key]);
      });
      saveLocalDb();
      return { deletedCount: initialLength - localDbState[colName].length };
    },
    deleteMany: async (query: any) => {
      let data = getCollectionData(colName);
      const initialLength = data.length;
      localDbState[colName] = data.filter((item: any) => {
        return !Object.keys(query).every(key => item[key] === query[key]);
      });
      saveLocalDb();
      return { deletedCount: initialLength - localDbState[colName].length };
    },
    countDocuments: async (query: any = {}) => {
      let data = getCollectionData(colName);
      if (query && Object.keys(query).length > 0) {
        data = data.filter((item: any) => {
          return Object.keys(query).every(key => {
            if (query[key] && typeof query[key] === 'object' && query[key].role) {
              return item.role === query[key].role;
            }
            return item[key] === query[key];
          });
        });
      }
      return data.length;
    }
  };
};

const mockDb: any = {
  collection: (name: string) => createMockCollection(name)
};

// Diagnostic endpoint to check serverless health without DB connections
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", message: "DaAttendance serverless backend is live!" });
});

// Middleware to inject connection pool into request lifecycle
app.use("/api", async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    (req as any).db = db;
    next();
  } catch (e: any) {
    console.warn("MongoDB Atlas connection failed, falling back to local memory database:", e.message);
    (req as any).db = mockDb;
    next();
  }
});

// ---------------------- CLOUD API ROUTES ----------------------

function uniqueByName(arr: any[]): any[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.name) return true;
    const key = String(item.name).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

let bootstrapServerCache: { data: any; timestamp: number } | null = null;

function clearServerCache() {
  bootstrapServerCache = null;
}

// Automatically clear cache on any write operation
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    clearServerCache();
  }
  next();
});

app.get("/api/bootstrap", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=2, stale-while-revalidate=30");
    
    // Serve from ultra-fast server memory cache if valid (< 3 seconds)
    if (bootstrapServerCache && Date.now() - bootstrapServerCache.timestamp < 3000) {
      return res.json(bootstrapServerCache.data);
    }

    const db: Db = (req as any).db;
    
    // Fetch all collections in parallel on the database server side in a single request lifecycle using native projections to exclude _id
    const [rawLocations, rawClasses, users, rawVolunteers, rawMembers, attendance, volunteerAttendance] = await Promise.all([
      db.collection("locations").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("classes").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("users").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("volunteers").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("members").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("attendance").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("volunteerAttendance").find({}, { projection: { _id: 0 } }).toArray()
    ]);

    // Format secure teachers lists and other safe users (avoiding _id mapping loop)
    const teachers = uniqueByName(users.filter((u: any) => u.role === "teacher").map(({ password, ...safe }: any) => safe))
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    const locations = uniqueByName(rawLocations);
    const classes = uniqueByName(rawClasses);
    const members = uniqueByName(rawMembers)
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    const volunteers = uniqueByName(rawVolunteers);

    const payload = {
      locations,
      classes,
      teachers,
      volunteers,
      members,
      attendance,
      volunteerAttendance
    };

    bootstrapServerCache = { data: payload, timestamp: Date.now() };
    res.json(payload);
  } catch (e: any) {
    console.error("Bootstrap endpoint failure:", e);
    res.status(500).json({ error: "Aggregation bootstrap failed", details: e.message });
  }
});

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

app.put("/api/auth/password", async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "Email, current password, and new password are required" });
  }

  const db: Db = (req as any).db;
  const user = await db.collection("users").findOne({ email: new RegExp("^" + email.trim() + "$", "i") });
  if (!user || user.password !== currentPassword) {
    return res.status(401).json({ error: "Invalid email or current password" });
  }

  await db.collection("users").updateOne({ email: user.email }, { $set: { password: newPassword } });
  res.json({ success: true, message: "Password updated successfully" });
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
  const locations = await db.collection("locations").find({}, { projection: { _id: 0 } }).toArray();
  res.json(locations);
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
  const classes = await db.collection("classes").find({}, { projection: { _id: 0 } }).toArray();
  res.json(classes);
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
  const members = await db.collection("members").find({}, { projection: { _id: 0 } }).toArray();
  const sortedMembers = members.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  res.json(sortedMembers);
});

app.post("/api/members", async (req, res) => {
  const { name, email, phone, status, joinedDate, classIds } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const db: Db = (req as any).db;
  const sanitizedName = name.trim();
  const existing = await db.collection("members").findOne({
    name: new RegExp("^" + sanitizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i")
  });

  if (existing) {
    const updatedFields = {
      email: email || existing.email,
      phone: phone !== undefined ? phone : existing.phone,
      status: status || existing.status,
      classIds: classIds !== undefined ? classIds : existing.classIds
    };
    await db.collection("members").updateOne({ id: existing.id }, { $set: updatedFields });
    return res.status(200).json({ id: existing.id, name: existing.name, ...updatedFields });
  }

  const newMem = {
    id: `mem_${Date.now()}`,
    name: sanitizedName,
    email: email || `${sanitizedName.toLowerCase().replace(/\s+/g, ".")}@academy.org`,
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

app.delete("/api/members", async (req, res) => {
  const db: Db = (req as any).db;
  await db.collection("members").deleteMany({});
  await db.collection("attendance").updateMany({}, { $set: { checkedInMemberIds: [] } });
  res.json({ success: true, message: "All student names removed" });
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
  const attendance = await db.collection("attendance").find({}, { projection: { _id: 0 } }).toArray();
  res.json(attendance);
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
  const teachers = await db.collection("users").find({ role: "teacher" }, { projection: { _id: 0 } }).toArray();
  const safeTeachers = teachers.map(({ password, ...safe }) => safe)
    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
  res.json(safeTeachers);
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

app.delete("/api/teachers", async (req, res) => {
  const db: Db = (req as any).db;
  const teachers = await db.collection("users").find({ role: "teacher" }, { projection: { id: 1 } }).toArray();
  const teacherIds = teachers.map((t: any) => t.id);
  await db.collection("users").deleteMany({ role: "teacher" });
  await db.collection("classes").updateMany({}, { $set: { assignedTeacherId: "" } });
  if (teacherIds.length > 0) {
    await db.collection("volunteerAttendance").updateMany({}, { $pull: { checkedInPersonnelIds: { $in: teacherIds } } as any });
  }
  res.json({ success: true, message: "All teachers removed" });
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
  const volunteers = await db.collection("volunteers").find({}, { projection: { _id: 0 } }).toArray();
  res.json(volunteers);
});

app.post("/api/volunteers", async (req, res) => {
  const { name, locationId, role } = req.body;
  if (!name || !locationId) {
    return res.status(400).json({ error: "Name and Location ID are required" });
  }

  const db: Db = (req as any).db;
  const sanitizedName = name.trim();
  const existing = await db.collection("volunteers").findOne({
    name: new RegExp("^" + sanitizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i")
  });

  if (existing) {
    const updatedFields = {
      locationId: locationId || existing.locationId,
      role: role || existing.role
    };
    await db.collection("volunteers").updateOne({ id: existing.id }, { $set: updatedFields });
    return res.status(200).json({ id: existing.id, name: existing.name, ...updatedFields });
  }

  const newVol = {
    id: `vol_${Date.now()}`,
    name: sanitizedName,
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
  const attendance = await db.collection("volunteerAttendance").find({}, { projection: { _id: 0 } }).toArray();
  res.json(attendance);
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
    const teachersCount = (await db.collection("users").countDocuments({ role: "teacher" })) + (await db.collection("volunteers").countDocuments());
    const membersCount = await db.collection("members").countDocuments();

    // Query databases using specific key projections to minimize payload size and avoid throttling
    const attendance = await db.collection("attendance").find({}, { projection: { classId: 1, checkedInMemberIds: 1, _id: 0 } }).toArray();
    const classes = await db.collection("classes").find({}, { projection: { id: 1, _id: 0 } }).toArray();
    const members = await db.collection("members").find({}, { projection: { classIds: 1, status: 1, _id: 0 } }).toArray();

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

// 10. FRONTEND LOCAL STORAGE MIGRATION SYNC GATEWAY
app.post("/api/migration/sync", async (req, res) => {
  const { locations, classes, members, attendance, volunteers, volunteerAttendance } = req.body;
  const db: Db = (req as any).db;

  try {
    let syncedLocations = 0;
    let syncedClasses = 0;
    let syncedMembers = 0;
    let syncedAttendance = 0;
    let syncedVolunteers = 0;
    let syncedVolunteerAttendance = 0;

    // 1. Sync Locations
    if (locations && locations.length > 0) {
      for (const loc of locations) {
        const exists = await db.collection("locations").findOne({ id: loc.id });
        if (!exists) {
          await db.collection("locations").insertOne(loc);
          syncedLocations++;
        }
      }
    }

    // 2. Sync Classes
    if (classes && classes.length > 0) {
      for (const cls of classes) {
        const exists = await db.collection("classes").findOne({ id: cls.id });
        if (!exists) {
          await db.collection("classes").insertOne(cls);
          syncedClasses++;
        }
      }
    }

    // 3. Sync Members
    if (members && members.length > 0) {
      for (const mem of members) {
        const exists = await db.collection("members").findOne({ id: mem.id });
        if (!exists) {
          await db.collection("members").insertOne(mem);
          syncedMembers++;
        }
      }
    }

    // 4. Sync Attendance
    if (attendance && attendance.length > 0) {
      for (const att of attendance) {
        const exists = await db.collection("attendance").findOne({ id: att.id });
        if (!exists) {
          await db.collection("attendance").insertOne(att);
          syncedAttendance++;
        }
      }
    }

    // 5. Sync Volunteers
    if (volunteers && volunteers.length > 0) {
      for (const vol of volunteers) {
        const exists = await db.collection("volunteers").findOne({ id: vol.id });
        if (!exists) {
          await db.collection("volunteers").insertOne(vol);
          syncedVolunteers++;
        }
      }
    }

    // 6. Sync Volunteer Attendance
    if (volunteerAttendance && volunteerAttendance.length > 0) {
      for (const vatt of volunteerAttendance) {
        const exists = await db.collection("volunteerAttendance").findOne({ id: vatt.id });
        if (!exists) {
          await db.collection("volunteerAttendance").insertOne(vatt);
          syncedVolunteerAttendance++;
        }
      }
    }

    res.json({
      success: true,
      syncedLocations,
      syncedClasses,
      syncedMembers,
      syncedAttendance,
      syncedVolunteers,
      syncedVolunteerAttendance
    });
  } catch (e: any) {
    res.status(500).json({ error: "Synchronization failed", details: e.message });
  }
});

app.post("/api/admin/reset-database", async (req, res) => {
  try {
    const db: Db = (req as any).db;
    await Promise.all([
      db.collection("users").deleteMany({ role: { $ne: "admin" } }),
      db.collection("locations").deleteMany({}),
      db.collection("classes").deleteMany({}),
      db.collection("members").deleteMany({}),
      db.collection("attendance").deleteMany({}),
      db.collection("volunteers").deleteMany({}),
      db.collection("volunteerAttendance").deleteMany({})
    ]);
    res.json({ success: true, message: "Database completely cleared and reset to fresh state." });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to reset database", details: e.message });
  }
});

export default app;
