import dbData from '../db.json';
import { enqueueAction } from './offlineSync';

// Global client-side memory cache for high-fidelity performance across all environments
let bootstrapCache: any = null;
let bootstrapPromise: Promise<any> | null = null;
let mockFetch: any = null;

const originalFetch = window.fetch;

// Check if the current environment is local (localhost, IP, local network, custom port, or non-production Vercel domain)
const isLocalhost = 
  (window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname === '[::1]' || 
  window.location.hostname === '::1' || 
  window.location.port !== '' ||
  !window.location.hostname.endsWith('vercel.app')) &&
  localStorage.getItem('da_attendance_db_migrated') !== 'true';

if (isLocalhost) {
  const LOCAL_STORAGE_KEY = 'da_attendance_db';

  // Get database state from localStorage or initialize with seed data
  let db: any;
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const dbSeedVer = localStorage.getItem('da_attendance_seed_ver');
    if (saved && dbSeedVer === '2026_roll_v18_full_attendance') {
      db = JSON.parse(saved);
    } else {
      // Clone seed data to avoid mutation reference issues
      db = JSON.parse(JSON.stringify(dbData));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
      localStorage.setItem('da_attendance_seed_ver', '2026_roll_v18_full_attendance');
    }
  } catch (e) {
    db = JSON.parse(JSON.stringify(dbData));
  }

  // Fallback safety structures
  if (!db.users) db.users = JSON.parse(JSON.stringify(dbData.users || []));
  if (!db.locations) db.locations = [];
  if (!db.classes) db.classes = [];
  if (!db.members) db.members = [];
  if (!db.attendance) db.attendance = [];
  if (!db.volunteers) db.volunteers = [];
  if (!db.volunteerAttendance) db.volunteerAttendance = [];

  const saveDb = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("Failed to write to localStorage", e);
    }
  };

  // Define mockFetch to capture and resolve API endpoints locally
  mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Only intercept api routes, let static assets fall back to the dev server
    // Bypass interceptor for the migration sync endpoint to let it hit the server backend
    if (!urlString.includes('/api/') || urlString.includes('/api/migration/sync')) {
      return originalFetch(input, init);
    }

    // Parse details
    const parsedUrl = new URL(urlString, window.location.origin);
    const path = parsedUrl.pathname;
    const method = init?.method?.toUpperCase() || 'GET';
    const body = init?.body ? JSON.parse(init.body as string) : null;

    // Simulate minimal server-side network latency (80ms) for professional realism
    await new Promise(resolve => setTimeout(resolve, 80));

    try {
      // --- 1. AUTHENTICATION & LOGIN ---
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = body || {};
        if (!email || !password) {
          return makeResponse(400, { error: 'Email and password are required' });
        }
        const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (!user || user.password !== password) {
          return makeResponse(401, { error: 'Invalid email or password' });
        }
        const token = `token-${user.id}-${Math.floor(Math.random() * 1000000)}`;
        const { password: _, ...safeUser } = user;
        return makeResponse(200, { user: safeUser, token });
      }

      if (path === '/api/auth/register' && method === 'POST') {
        const { email, password, name, role, phone, locationId } = body || {};
        if (!email || !password || !name || !role) {
          return makeResponse(400, { error: 'Email, password, name, and role are required' });
        }
        const exists = db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          return makeResponse(400, { error: 'A user with this email address already exists' });
        }
        const newUser = {
          id: `usr_${Date.now()}`,
          email: email.toLowerCase(),
          name,
          role,
          password,
          phone: phone || '',
          locationId: locationId || undefined
        };
        db.users.push(newUser);
        saveDb();
        const { password: _, ...safeUser } = newUser;
        return makeResponse(201, { user: safeUser, token: `token-${newUser.id}` });
      }

      // --- 2. CAMPUS LOCATIONS ---
      if (path === '/api/locations') {
        if (method === 'GET') {
          return makeResponse(200, db.locations);
        }
        if (method === 'POST') {
          const { name, address, phone } = body || {};
          if (!name || !address) {
            return makeResponse(400, { error: 'Name and address are required' });
          }
          const newLoc = {
            id: `loc_${Date.now()}`,
            name,
            address,
            phone: phone || ''
          };
          db.locations.push(newLoc);
          saveDb();
          return makeResponse(201, newLoc);
        }
      }

      if (path.startsWith('/api/locations/')) {
        const id = path.split('/').pop();
        if (method === 'PUT') {
          const { name, address, phone } = body || {};
          const index = db.locations.findIndex((l: any) => l.id === id);
          if (index === -1) {
            return makeResponse(404, { error: 'Location not found' });
          }
          db.locations[index] = {
            ...db.locations[index],
            name: name !== undefined ? name : db.locations[index].name,
            address: address !== undefined ? address : db.locations[index].address,
            phone: phone !== undefined ? phone : db.locations[index].phone
          };
          saveDb();
          return makeResponse(200, db.locations[index]);
        }
        if (method === 'DELETE') {
          const isLinked = db.classes.some((c: any) => c.locationId === id);
          if (isLinked) {
            return makeResponse(400, { error: 'Cannot delete location with assigned classes. Delete or reassign classes first.' });
          }
          db.locations = db.locations.filter((l: any) => l.id !== id);
          saveDb();
          return makeResponse(200, { success: true });
        }
      }

      // --- 3. JUNIOR CLASSES / COHORTS ---
      if (path === '/api/classes') {
        if (method === 'GET') {
          return makeResponse(200, db.classes);
        }
        if (method === 'POST') {
          const { name, locationId, assignedTeacherId, schedule } = body || {};
          if (!name || !locationId || !assignedTeacherId || !schedule) {
            return makeResponse(400, { error: 'All fields are required' });
          }
          const newClass = {
            id: `cls_${Date.now()}`,
            name,
            locationId,
            assignedTeacherId,
            schedule
          };
          db.classes.push(newClass);
          saveDb();
          return makeResponse(201, newClass);
        }
      }

      if (path.startsWith('/api/classes/')) {
        const id = path.split('/').pop();
        if (method === 'PUT') {
          const { name, locationId, assignedTeacherId, schedule } = body || {};
          const index = db.classes.findIndex((c: any) => c.id === id);
          if (index === -1) {
            return makeResponse(404, { error: 'Class not found' });
          }
          db.classes[index] = {
            ...db.classes[index],
            name: name !== undefined ? name : db.classes[index].name,
            locationId: locationId !== undefined ? locationId : db.classes[index].locationId,
            assignedTeacherId: assignedTeacherId !== undefined ? assignedTeacherId : db.classes[index].assignedTeacherId,
            schedule: schedule !== undefined ? schedule : db.classes[index].schedule
          };
          saveDb();
          return makeResponse(200, db.classes[index]);
        }
        if (method === 'DELETE') {
          db.classes = db.classes.filter((c: any) => c.id !== id);
          db.members = db.members.map((m: any) => ({
            ...m,
            classIds: (m.classIds || []).filter((cid: string) => cid !== id)
          }));
          db.attendance = db.attendance.filter((a: any) => a.classId !== id);
          saveDb();
          return makeResponse(200, { success: true });
        }
      }

      // --- 4. MEMBERS (STUDENTS) ---
      if (path === '/api/members') {
        if (method === 'GET') {
          const sortedMembers = [...(db.members || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          return makeResponse(200, sortedMembers);
        }
        if (method === 'POST') {
          const { name, email, phone, status, joinedDate, classIds } = body || {};
          if (!name || !email) {
            return makeResponse(400, { error: 'Name and email are required' });
          }
          const newMem = {
            id: `mem_${Date.now()}`,
            name,
            email,
            phone: phone || '',
            status: status || 'active',
            joinedDate: joinedDate || new Date().toISOString().split('T')[0],
            classIds: classIds || []
          };
          db.members.push(newMem);
          saveDb();
          return makeResponse(201, newMem);
        }
        if (method === 'DELETE') {
          db.members = [];
          db.attendance = db.attendance.map((a: any) => ({
            ...a,
            checkedInMemberIds: []
          }));
          saveDb();
          return makeResponse(200, { success: true, message: 'All student names removed' });
        }
      }

      if (path.startsWith('/api/members/')) {
        const id = path.split('/').pop();
        if (method === 'PUT') {
          const { name, email, phone, status, joinedDate, classIds } = body || {};
          const index = db.members.findIndex((m: any) => m.id === id);
          if (index === -1) {
            return makeResponse(404, { error: 'Member not found' });
          }
          db.members[index] = {
            ...db.members[index],
            name: name !== undefined ? name : db.members[index].name,
            email: email !== undefined ? email : db.members[index].email,
            phone: phone !== undefined ? phone : db.members[index].phone,
            status: status !== undefined ? status : db.members[index].status,
            joinedDate: joinedDate !== undefined ? joinedDate : db.members[index].joinedDate,
            classIds: classIds !== undefined ? classIds : db.members[index].classIds
          };
          saveDb();
          return makeResponse(200, db.members[index]);
        }
        if (method === 'DELETE') {
          db.members = db.members.filter((m: any) => m.id !== id);
          db.attendance = db.attendance.map((a: any) => ({
            ...a,
            checkedInMemberIds: (a.checkedInMemberIds || []).filter((mid: string) => mid !== id)
          }));
          saveDb();
          return makeResponse(200, { success: true });
        }
      }

      // --- 5. STUDENT ATTENDANCE DESK ---
      if (path === '/api/attendance') {
        if (method === 'GET') {
          return makeResponse(200, db.attendance);
        }
        if (method === 'POST') {
          const { classId, date, checkedInMemberIds, notes, recordedBy } = body || {};
          if (!classId || !date || !recordedBy) {
            return makeResponse(400, { error: 'Class ID, date, and recorder details are required' });
          }
          const existingIndex = db.attendance.findIndex((a: any) => a.classId === classId && a.date === date);
          const finalRecord = {
            id: existingIndex !== -1 ? db.attendance[existingIndex].id : `att_${Date.now()}`,
            classId,
            date,
            checkedInMemberIds: checkedInMemberIds || [],
            notes: notes || '',
            recordedBy,
            recordedAt: new Date().toISOString()
          };
          if (existingIndex !== -1) {
            db.attendance[existingIndex] = finalRecord;
          } else {
            db.attendance.push(finalRecord);
          }
          saveDb();
          return makeResponse(200, finalRecord);
        }
        if (method === 'DELETE') {
          const classId = parsedUrl.searchParams.get('classId');
          const date = parsedUrl.searchParams.get('date');
          if (!classId || !date) {
            return makeResponse(400, { error: 'Class ID and date are required' });
          }
          db.attendance = db.attendance.filter((a: any) => !(a.classId === classId && a.date === date));
          saveDb();
          return makeResponse(200, { success: true, message: 'Attendance record deleted' });
        }
      }

      // --- 6. TEACHERS DIRECTORY ---
      if (path === '/api/teachers') {
        if (method === 'GET') {
          const teachers = db.users
            .filter((u: any) => u.role === 'teacher')
            .map(({ password, ...safe }: any) => safe)
            .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          return makeResponse(200, teachers);
        }
        if (method === 'DELETE') {
          const teacherIds = new Set(db.users.filter((u: any) => u.role === 'teacher').map((u: any) => u.id));
          db.users = db.users.filter((u: any) => u.role !== 'teacher');
          db.classes = db.classes.map((c: any) => ({ ...c, assignedTeacherId: '' }));
          if (Array.isArray(db.volunteerAttendance)) {
            db.volunteerAttendance = db.volunteerAttendance.map((va: any) => ({
              ...va,
              checkedInPersonnelIds: (va.checkedInPersonnelIds || []).filter((id: string) => !teacherIds.has(id))
            }));
          }
          saveDb();
          return makeResponse(200, { success: true, message: 'All teachers removed' });
        }
      }

      if (path.startsWith('/api/teachers/')) {
        const id = path.split('/').pop();
        if (method === 'PUT') {
          const { name, locationId } = body || {};
          const index = db.users.findIndex((u: any) => u.id === id);
          if (index === -1) {
            return makeResponse(404, { error: 'Teacher not found' });
          }
          db.users[index] = {
            ...db.users[index],
            name: name !== undefined ? name : db.users[index].name,
            locationId: locationId !== undefined ? locationId : db.users[index].locationId
          };
          saveDb();
          const { password: _, ...safeUser } = db.users[index];
          return makeResponse(200, safeUser);
        }
        if (method === 'DELETE') {
          db.users = db.users.filter((u: any) => u.id !== id);
          db.classes = db.classes.map((c: any) => {
            if (c.assignedTeacherId === id) {
              return { ...c, assignedTeacherId: 'usr_admin' };
            }
            return c;
          });
          saveDb();
          return makeResponse(200, { success: true });
        }
      }

      // --- 7. AUXILIARY VOLUNTEERS & STAFF LOGS ---
      if (path === '/api/volunteers') {
        if (method === 'GET') {
          return makeResponse(200, db.volunteers || []);
        }
        if (method === 'POST') {
          const { name, locationId, role } = body || {};
          if (!name || !locationId) {
            return makeResponse(400, { error: 'Name and Location ID are required' });
          }
          const newVol = {
            id: `vol_${Date.now()}`,
            name,
            locationId,
            role: role || 'Volunteer'
          };
          db.volunteers.push(newVol);
          saveDb();
          return makeResponse(201, newVol);
        }
      }

      if (path.startsWith('/api/volunteers/')) {
        const id = path.split('/').pop();
        if (method === 'PUT') {
          const { name, locationId, role } = body || {};
          const index = db.volunteers.findIndex((v: any) => v.id === id);
          if (index === -1) {
            return makeResponse(404, { error: 'Volunteer not found' });
          }
          db.volunteers[index] = {
            ...db.volunteers[index],
            name: name !== undefined ? name : db.volunteers[index].name,
            locationId: locationId !== undefined ? locationId : db.volunteers[index].locationId,
            role: role !== undefined ? role : db.volunteers[index].role
          };
          saveDb();
          return makeResponse(200, db.volunteers[index]);
        }
        if (method === 'DELETE') {
          db.volunteers = db.volunteers.filter((v: any) => v.id !== id);
          db.volunteerAttendance = (db.volunteerAttendance || []).map((att: any) => ({
            ...att,
            checkedInPersonnelIds: (att.checkedInPersonnelIds || []).filter((pid: string) => pid !== id)
          }));
          saveDb();
          return makeResponse(200, { success: true });
        }
      }

      if (path === '/api/volunteer-attendance') {
        if (method === 'GET') {
          return makeResponse(200, db.volunteerAttendance || []);
        }
        if (method === 'POST') {
          const { locationId, date, checkedInPersonnelIds, notes } = body || {};
          if (!locationId || !date) {
            return makeResponse(400, { error: 'Location ID and date are required' });
          }
          if (!db.volunteerAttendance) db.volunteerAttendance = [];
          const existingIndex = db.volunteerAttendance.findIndex((a: any) => a.locationId === locationId && a.date === date);
          const finalRecord = {
            id: existingIndex !== -1 ? db.volunteerAttendance[existingIndex].id : `vol_att_${Date.now()}`,
            locationId,
            date,
            checkedInPersonnelIds: checkedInPersonnelIds || [],
            notes: notes || '',
            recordedAt: new Date().toISOString()
          };
          if (existingIndex !== -1) {
            db.volunteerAttendance[existingIndex] = finalRecord;
          } else {
            db.volunteerAttendance.push(finalRecord);
          }
          saveDb();
          return makeResponse(200, finalRecord);
        }
        if (method === 'DELETE') {
          const locationId = parsedUrl.searchParams.get('locationId');
          const date = parsedUrl.searchParams.get('date');
          if (!locationId || !date) {
            return makeResponse(400, { error: 'Location ID and date are required' });
          }
          db.volunteerAttendance = (db.volunteerAttendance || []).filter((a: any) => !(a.locationId === locationId && a.date === date));
          saveDb();
          return makeResponse(200, { success: true, message: 'Personnel attendance record deleted' });
        }
      }

      // --- 7.5. BATCH DIRECTORY BOOTSTRAP ---
      if (path === '/api/bootstrap' && method === 'GET') {
        const teachers = db.users
          .filter((u: any) => u.role === 'teacher')
          .map(({ password, ...safe }: any) => safe)
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        const members = [...(db.members || [])].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        return makeResponse(200, {
          locations: db.locations,
          classes: db.classes,
          teachers,
          volunteers: db.volunteers || [],
          members,
          attendance: db.attendance,
          volunteerAttendance: db.volunteerAttendance || []
        });
      }

      // --- 8. DASHBOARD ANALYTICS / STATS ---
      if (path === '/api/stats' && method === 'GET') {
        const locationsCount = db.locations.length;
        const classesCount = db.classes.length;
        const teachersCount = db.users.filter((u: any) => u.role === 'teacher').length;
        const membersCount = db.members.length;

        let attendanceRateToday = 0;
        if (db.attendance.length > 0) {
          const recentRates = db.attendance.map((att: any) => {
            const classObj = db.classes.find((c: any) => c.id === att.classId);
            if (!classObj) return 0;
            const totalInClass = db.members.filter((m: any) => m.classIds.includes(att.classId) && m.status === 'active').length;
            if (totalInClass === 0) return 0;
            return (att.checkedInMemberIds.length / totalInClass) * 100;
          });
          const validRates = recentRates.filter((r: number) => r > 0);
          if (validRates.length > 0) {
            attendanceRateToday = Math.round(validRates.reduce((a: number, b: number) => a + b, 0) / validRates.length);
          }
        }
        return makeResponse(200, {
          locationsCount,
          classesCount,
          teachersCount,
          membersCount,
          attendanceRateToday: attendanceRateToday || 75
        });
      }

      if (path === '/api/admin/reset-database' && method === 'POST') {
        db.users = db.users.filter((u: any) => u.role === 'admin' || u.id === 'usr_admin');
        db.locations = [];
        db.classes = [];
        db.members = [];
        db.attendance = [];
        db.volunteers = [];
        db.volunteerAttendance = [];
        saveDb();
        return makeResponse(200, { success: true, message: 'Database completely cleared and reset to fresh state.' });
      }

      return makeResponse(404, { error: `Not found: ${method} ${path}` });

    } catch (err: any) {
      console.error("Mock API Runtime Error:", err);
      return makeResponse(500, { error: err.message || 'Internal Server Error' });
    }
  };
}

function makeResponse(status: number, data: any): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Global client-side memory cache interceptor for /api/bootstrap and offline support
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method?.toUpperCase() || 'GET';
  const urlObj = new URL(urlString, window.location.origin);
  const path = urlObj.pathname;

  // Determine if offline or if we should force offline mode (for verification)
  const isOfflineMode = !navigator.onLine;

  const getRequestBody = () => {
    try {
      return init?.body ? JSON.parse(init.body as string) : null;
    } catch (e) {
      return null;
    }
  };

  // 1. OFFLINE INTERCEPTION STRATEGY
  if (isOfflineMode && urlString.includes('/api/')) {
    console.log(`[Offline Sync Interceptor] Intercepting offline request: ${method} ${path}`);
    
    // A. Bootstrap data from local cache
    if (path === '/api/bootstrap' && method === 'GET') {
      const cached = localStorage.getItem('da_attendance_offline_bootstrap');
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Fallback empty bootstrap shell
      return new Response(JSON.stringify({
        locations: [], classes: [], teachers: [], volunteers: [], members: [], attendance: [], volunteerAttendance: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // B. Dashboard metrics from local cache
    if (path === '/api/stats' && method === 'GET') {
      const cached = localStorage.getItem('da_attendance_offline_stats');
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({
        locationsCount: 0, classesCount: 0, teachersCount: 0, membersCount: 0, attendanceRateToday: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // C. Student Attendance Roll Logging
    if (path === '/api/attendance') {
      const body = getRequestBody();
      if (method === 'POST') {
        const description = `Saved Sunday student roll for class ${body?.classId} on ${body?.date}`;
        enqueueAction(urlString, method, body, description);
        
        return new Response(JSON.stringify({
          id: `att_offline_${Date.now()}`,
          classId: body?.classId,
          date: body?.date,
          checkedInMemberIds: body?.checkedInMemberIds || [],
          notes: body?.notes || '',
          recordedBy: body?.recordedBy,
          recordedAt: new Date().toISOString(),
          isOfflineDraft: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (method === 'DELETE') {
        const classId = urlObj.searchParams.get('classId') || body?.classId;
        const date = urlObj.searchParams.get('date') || body?.date;
        const description = `Deleted student roll for class ${classId} on ${date}`;
        enqueueAction(urlString, method, { classId, date }, description);
        
        return new Response(JSON.stringify({ success: true, message: 'Attendance record deleted offline' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // D. Staff & Volunteer Attendance Logging
    if (path === '/api/volunteer-attendance') {
      const body = getRequestBody();
      if (method === 'POST') {
        const description = `Saved staff/volunteer attendance for location ${body?.locationId} on ${body?.date}`;
        enqueueAction(urlString, method, body, description);
        
        return new Response(JSON.stringify({
          id: `vol_offline_${Date.now()}`,
          locationId: body?.locationId,
          date: body?.date,
          checkedInPersonnelIds: body?.checkedInPersonnelIds || [],
          notes: body?.notes || '',
          recordedAt: new Date().toISOString(),
          isOfflineDraft: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (method === 'DELETE') {
        const locationId = urlObj.searchParams.get('locationId') || body?.locationId;
        const date = urlObj.searchParams.get('date') || body?.date;
        const description = `Deleted staff/volunteer roll for location ${locationId} on ${date}`;
        enqueueAction(urlString, method, { locationId, date }, description);
        
        return new Response(JSON.stringify({ success: true, message: 'Personnel attendance record deleted offline' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default block for other mutations offline
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      return new Response(JSON.stringify({ error: 'Service Unavailable: App is operating in Offline mode' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 2. ONLINE STRATEGY - Cache static bootstrap responses
  if (urlString.includes('/api/bootstrap') && method === 'GET') {
    if (bootstrapCache) {
      return new Response(JSON.stringify(bootstrapCache), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (bootstrapPromise) {
      const data = await bootstrapPromise;
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    bootstrapPromise = (async () => {
      try {
        const res = await originalFetch(input, init);
        if (res.ok) {
          const data = await res.json();
          bootstrapCache = data;
          localStorage.setItem('da_attendance_offline_bootstrap', JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.error("Failed to fetch bootstrap cache", e);
      } finally {
        bootstrapPromise = null;
      }
      return null;
    })();

    const data = await bootstrapPromise;
    if (!data) {
      const cached = localStorage.getItem('da_attendance_offline_bootstrap');
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Online stats caching
  if (urlString.includes('/api/stats') && method === 'GET') {
    try {
      const res = await originalFetch(input, init);
      if (res.ok) {
        const data = await res.clone().json();
        localStorage.setItem('da_attendance_offline_stats', JSON.stringify(data));
      }
      return res;
    } catch (e) {
      const cached = localStorage.getItem('da_attendance_offline_stats');
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw e;
    }
  }

  // 3. Mutation Caching & "Lie-Fi" Fallback
  if (urlString.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes(method)) {
    bootstrapCache = null;

    try {
      // Implement a 4-second timeout to transition to offline mode instantly if reception is flaky
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const res = await originalFetch(input, {
        ...init,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      console.warn('[Lie-Fi Fallback] Server timed out or disconnected. Enqueueing request offline:', err);
      
      const body = getRequestBody();
      let description = `Modified attendance via ${method} on ${path}`;
      if (path === '/api/attendance' && method === 'POST') {
        description = `Saved Sunday student roll for class ${body?.classId} on ${body?.date} (flaky network)`;
      } else if (path === '/api/volunteer-attendance' && method === 'POST') {
        description = `Saved staff/volunteer attendance for location ${body?.locationId} on ${body?.date} (flaky network)`;
      }

      enqueueAction(urlString, method, body, description);

      if (path === '/api/attendance' && method === 'POST') {
        return new Response(JSON.stringify({
          id: `att_offline_${Date.now()}`,
          classId: body?.classId,
          date: body?.date,
          checkedInMemberIds: body?.checkedInMemberIds || [],
          notes: body?.notes || '',
          recordedBy: body?.recordedBy,
          recordedAt: new Date().toISOString(),
          isOfflineDraft: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/volunteer-attendance' && method === 'POST') {
        return new Response(JSON.stringify({
          id: `vol_offline_${Date.now()}`,
          locationId: body?.locationId,
          date: body?.date,
          checkedInPersonnelIds: body?.checkedInPersonnelIds || [],
          notes: body?.notes || '',
          recordedAt: new Date().toISOString(),
          isOfflineDraft: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Action enqueued safely' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 4. Fall through to local storage mock database or live backend
  if (isLocalhost && mockFetch) {
    return mockFetch(input, init);
  }

  return originalFetch(input, init);
};
