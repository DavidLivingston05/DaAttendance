// Core offline storage and synchronization engine for DaAttendance

export interface OfflineAction {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  description: string;
}

const OFFLINE_QUEUE_KEY = 'da_attendance_offline_queue';
const BOOTSTRAP_CACHE_KEY = 'da_attendance_offline_bootstrap';
const STATS_CACHE_KEY = 'da_attendance_offline_stats';

// Get all pending changes from the offline queue
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse offline sync queue', e);
    return [];
  }
}

// Save the offline queue back to local storage
export function saveOfflineQueue(queue: OfflineAction[]) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    triggerSyncStateUpdate();
  } catch (e) {
    console.error('Failed to write offline sync queue', e);
  }
}

// Add a new modification request to the queue
export function enqueueAction(url: string, method: string, body: any, description: string): OfflineAction {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    url,
    method,
    body,
    timestamp: Date.now(),
    description
  };
  queue.push(newAction);
  saveOfflineQueue(queue);
  
  // Patch local bootstrap state so that the UI updates immediately
  patchLocalBootstrap(newAction);
  
  return newAction;
}

// Dispatches a global event so the UI can listen and refresh itself instantly
export function triggerSyncStateUpdate() {
  window.dispatchEvent(new CustomEvent('da_attendance_sync_update'));
}

// Patches the locally cached bootstrap records to keep UI perfectly consistent while offline
export function patchLocalBootstrap(action: OfflineAction) {
  try {
    const rawBootstrap = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!rawBootstrap) return;

    const bootstrap = JSON.parse(rawBootstrap);
    if (!bootstrap.attendance) bootstrap.attendance = [];
    if (!bootstrap.volunteerAttendance) bootstrap.volunteerAttendance = [];

    const urlObj = new URL(action.url, window.location.origin);
    const pathname = urlObj.pathname;

    // A. Student Attendance Actions
    if (pathname === '/api/attendance') {
      if (action.method === 'POST') {
        const { classId, date, checkedInMemberIds, notes, recordedBy } = action.body || {};
        const existingIndex = bootstrap.attendance.findIndex(
          (a: any) => a.classId === classId && a.date === date
        );

        const record = {
          id: existingIndex !== -1 ? bootstrap.attendance[existingIndex].id : `att_offline_${Date.now()}`,
          classId,
          date,
          checkedInMemberIds: checkedInMemberIds || [],
          notes: notes || '',
          recordedBy,
          recordedAt: new Date(action.timestamp).toISOString(),
          isOfflineDraft: true
        };

        if (existingIndex !== -1) {
          bootstrap.attendance[existingIndex] = record;
        } else {
          bootstrap.attendance.push(record);
        }
      } else if (action.method === 'DELETE') {
        const classId = urlObj.searchParams.get('classId') || action.body?.classId;
        const date = urlObj.searchParams.get('date') || action.body?.date;
        if (classId && date) {
          bootstrap.attendance = bootstrap.attendance.filter(
            (a: any) => !(a.classId === classId && a.date === date)
          );
        }
      }
    }

    // B. Volunteer Attendance Actions
    if (pathname === '/api/volunteer-attendance') {
      if (action.method === 'POST') {
        const { locationId, date, checkedInPersonnelIds, notes } = action.body || {};
        const existingIndex = bootstrap.volunteerAttendance.findIndex(
          (a: any) => a.locationId === locationId && a.date === date
        );

        const record = {
          id: existingIndex !== -1 ? bootstrap.volunteerAttendance[existingIndex].id : `vol_offline_${Date.now()}`,
          locationId,
          date,
          checkedInPersonnelIds: checkedInPersonnelIds || [],
          notes: notes || '',
          recordedAt: new Date(action.timestamp).toISOString(),
          isOfflineDraft: true
        };

        if (existingIndex !== -1) {
          bootstrap.volunteerAttendance[existingIndex] = record;
        } else {
          bootstrap.volunteerAttendance.push(record);
        }
      } else if (action.method === 'DELETE') {
        const locationId = urlObj.searchParams.get('locationId') || action.body?.locationId;
        const date = urlObj.searchParams.get('date') || action.body?.date;
        if (locationId && date) {
          bootstrap.volunteerAttendance = bootstrap.volunteerAttendance.filter(
            (a: any) => !(a.locationId === locationId && a.date === date)
          );
        }
      }
    }

    // Save patched bootstrap back to localStorage cache
    localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(bootstrap));
    console.log('[Offline Sync] Patched local bootstrap cache successfully');
    
    // Patch stats dynamically too to reflect attendance percentages
    patchLocalStats(bootstrap);
  } catch (e) {
    console.error('Failed to patch local bootstrap cache offline', e);
  }
}

// Patches local dashboard metrics so that dashboard rate numbers adjust dynamically offline
export function patchLocalStats(patchedBootstrap: any) {
  try {
    const rawStats = localStorage.getItem(STATS_CACHE_KEY);
    if (!rawStats) return;

    const stats = JSON.parse(rawStats);
    const classes = patchedBootstrap.classes || [];
    const members = patchedBootstrap.members || [];
    const attendance = patchedBootstrap.attendance || [];

    let attendanceRateToday = 0;
    if (attendance.length > 0) {
      const recentRates = attendance.map((att: any) => {
        const classObj = classes.find((c: any) => c.id === att.classId);
        if (!classObj) return 0;
        const totalInClass = members.filter(
          (m: any) => m.classIds.includes(att.classId) && m.status === 'active'
        ).length;
        if (totalInClass === 0) return 0;
        return (att.checkedInMemberIds.length / totalInClass) * 100;
      });
      const validRates = recentRates.filter((r: number) => r > 0);
      if (validRates.length > 0) {
        attendanceRateToday = Math.round(
          validRates.reduce((a: number, b: number) => a + b, 0) / validRates.length
        );
      }
    }

    stats.attendanceRateToday = attendanceRateToday;
    localStorage.setItem(STATS_CACHE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to patch local stats offline', e);
  }
}

// Execute synchronization of all pending actions in sequential chronological order
export async function syncOfflineQueue(originalFetch: typeof window.fetch): Promise<{ success: boolean; count: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, count: 0 };
  }

  console.log(`[Offline Sync] Synchronizing ${queue.length} pending actions with MongoDB...`);
  let syncedCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    try {
      // Re-fire request to the live backend
      const res = await originalFetch(action.url, {
        method: action.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: action.body ? JSON.stringify(action.body) : undefined
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      console.log(`[Offline Sync] Action ${action.id} synced successfully:`, action.description);
      syncedCount++;
      
      // Remove successfully synced item from queue immediately
      const currentQueue = getOfflineQueue();
      // Remove by ID, since new items could have been enqueued in parallel
      const updatedQueue = currentQueue.filter(item => item.id !== action.id);
      saveOfflineQueue(updatedQueue);
    } catch (err) {
      console.error(`[Offline Sync] Synchronization paused at action ${action.id} due to error:`, err);
      triggerSyncStateUpdate();
      return { success: false, count: syncedCount };
    }
  }

  // Once fully synchronized, invalidate local client bootstrap memory cache so fresh remote data is fetched
  // This is handled by main.tsx and App.tsx by forcing a reload of bootstrap data
  console.log('[Offline Sync] Sync complete! Queue is clean.');
  triggerSyncStateUpdate();
  return { success: true, count: syncedCount };
}
