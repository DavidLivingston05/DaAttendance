// Types for Gym & Studio Attendance Tracker

export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  locationId?: string; // Optional: restrict teacher to physical location
}

export interface Location {
  id: string;
  name: string;
  address: string;
  phone?: string;
}

export interface ClassSession {
  id: string;
  name: string;
  locationId: string;
  assignedTeacherId: string; // User.id
  schedule: string; // e.g. "Mon, Wed, Fri 18:00"
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  joinedDate: string; // YYYY-MM-DD
  classIds: string[]; // Classes this member belongs to
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  checkedInMemberIds: string[]; // Member IDs who were marked present
  notes?: string;
  recordedBy: string; // User.id (Teacher/Admin who did the roll)
  recordedAt: string; // ISO string
}

export interface DashboardStats {
  locationsCount: number;
  classesCount: number;
  teachersCount: number;
  membersCount: number;
  attendanceRateToday: number;
}
