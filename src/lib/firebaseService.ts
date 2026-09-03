import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Division,
  Position,
  OfficeSettings,
  AttendanceRecord,
  RolePermissionsConfig,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_DIVISIONS,
  INITIAL_POSITIONS,
  DEFAULT_OFFICE_SETTINGS,
  getInitialAttendances,
} from './mockData';

const COLLECTIONS = {
  USERS: 'users',
  DIVISIONS: 'divisions',
  POSITIONS: 'positions',
  OFFICE: 'offices',
  ATTENDANCE: 'attendance',
  SYSTEM_CONFIG: 'system_config',
};

// Helper to sanitize undefined values before writing to Firestore
function sanitizeFirestorePayload<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

// Seed Firestore if empty
export async function seedFirestoreIfEmpty() {
  try {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.id), sanitizeFirestorePayload(u));
      }
    }

    const divsSnap = await getDocs(collection(db, COLLECTIONS.DIVISIONS));
    if (divsSnap.empty) {
      console.log('Seeding initial divisions to Firestore...');
      for (const d of INITIAL_DIVISIONS) {
        await setDoc(doc(db, COLLECTIONS.DIVISIONS, d.id), sanitizeFirestorePayload(d));
      }
    }

    const posSnap = await getDocs(collection(db, COLLECTIONS.POSITIONS));
    if (posSnap.empty) {
      console.log('Seeding initial positions to Firestore...');
      for (const p of INITIAL_POSITIONS) {
        await setDoc(doc(db, COLLECTIONS.POSITIONS, p.id), sanitizeFirestorePayload(p));
      }
    }

    const officeSnap = await getDocs(collection(db, COLLECTIONS.OFFICE));
    if (officeSnap.empty) {
      console.log('Seeding initial office settings to Firestore...');
      await setDoc(doc(db, COLLECTIONS.OFFICE, 'main_config'), sanitizeFirestorePayload(DEFAULT_OFFICE_SETTINGS));
    }
  } catch (err) {
    console.warn('Error during Firestore seeding check:', err);
  }
}

// Subscribe Users
export function subscribeUsers(callback: (users: User[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.USERS),
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as User);
      });
      callback(users);
    },
    (err) => console.warn('Users listener error:', err)
  );
}

// Subscribe Divisions
export function subscribeDivisions(callback: (divisions: Division[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.DIVISIONS),
    (snapshot) => {
      const divs: Division[] = [];
      snapshot.forEach((doc) => {
        divs.push(doc.data() as Division);
      });
      callback(divs);
    },
    (err) => console.warn('Divisions listener error:', err)
  );
}

// Subscribe Positions
export function subscribePositions(callback: (positions: Position[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.POSITIONS),
    (snapshot) => {
      const pos: Position[] = [];
      snapshot.forEach((doc) => {
        pos.push(doc.data() as Position);
      });
      callback(pos);
    },
    (err) => console.warn('Positions listener error:', err)
  );
}

// Subscribe Office Settings
export function subscribeOfficeSettings(callback: (office: OfficeSettings) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.OFFICE, 'main_config'),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as OfficeSettings);
      }
    },
    (err) => console.warn('Office listener error:', err)
  );
}

// Subscribe Role Permissions Config
export function subscribeRolePermissions(callback: (config: RolePermissionsConfig) => void) {
  return onSnapshot(
    doc(db, COLLECTIONS.SYSTEM_CONFIG, 'role_permissions'),
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as RolePermissionsConfig);
      }
    },
    (err) => console.warn('Role permissions listener error:', err)
  );
}

// Fetch Attendance Directly from Firestore
export async function fetchAttendanceDirectlyFs(): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    const recs: AttendanceRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as AttendanceRecord;
      recs.push({
        ...data,
        id: data.id || docSnap.id,
      });
    });
    recs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return recs;
  } catch (err) {
    console.error('Error fetching attendance directly from Firestore:', err);
    return [];
  }
}

// Check Firestore Health & Connectivity
export async function checkFirestoreHealth(): Promise<{
  connected: boolean;
  totalAttendance: number;
  totalUsers: number;
  error?: string;
}> {
  try {
    const [attSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.ATTENDANCE)),
      getDocs(collection(db, COLLECTIONS.USERS)),
    ]);
    return {
      connected: true,
      totalAttendance: attSnap.size,
      totalUsers: usersSnap.size,
    };
  } catch (err: any) {
    return {
      connected: false,
      totalAttendance: 0,
      totalUsers: 0,
      error: err?.message || String(err),
    };
  }
}

// Subscribe Attendance Records (Realtime across all users)
export function subscribeAttendance(callback: (records: AttendanceRecord[]) => void) {
  return onSnapshot(
    collection(db, COLLECTIONS.ATTENDANCE),
    (snapshot) => {
      const recs: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        recs.push({
          ...data,
          id: data.id || docSnap.id,
        });
      });
      // Sort newest first in memory without requiring composite cloud indexes
      recs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(recs);
    },
    (err) => {
      console.warn('Attendance collection listener error:', err);
    }
  );
}

// Mutation functions
export async function saveUserFs(user: User) {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), sanitizeFirestorePayload(user), { merge: true });
  } catch (e) {
    console.error('Error saving user to Firestore:', e);
  }
}

export async function deleteUserFs(userId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
  } catch (e) {
    console.error('Error deleting user from Firestore:', e);
  }
}

export async function saveDivisionFs(division: Division) {
  try {
    await setDoc(doc(db, COLLECTIONS.DIVISIONS, division.id), sanitizeFirestorePayload(division), { merge: true });
  } catch (e) {
    console.error('Error saving division to Firestore:', e);
  }
}

export async function deleteDivisionFs(divisionId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.DIVISIONS, divisionId));
  } catch (e) {
    console.error('Error deleting division from Firestore:', e);
  }
}

export async function savePositionFs(position: Position) {
  try {
    await setDoc(doc(db, COLLECTIONS.POSITIONS, position.id), sanitizeFirestorePayload(position), { merge: true });
  } catch (e) {
    console.error('Error saving position to Firestore:', e);
  }
}

export async function deletePositionFs(positionId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.POSITIONS, positionId));
  } catch (e) {
    console.error('Error deleting position from Firestore:', e);
  }
}

export async function saveOfficeSettingsFs(office: OfficeSettings) {
  try {
    await setDoc(doc(db, COLLECTIONS.OFFICE, 'main_config'), sanitizeFirestorePayload(office), { merge: true });
  } catch (e) {
    console.error('Error saving office settings to Firestore:', e);
  }
}

export async function saveAttendanceFs(record: AttendanceRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = sanitizeFirestorePayload(record);
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), payload, { merge: true });
    console.log('[Firestore] Attendance saved successfully:', record.id, record.employeeName, record.type);
    return { success: true };
  } catch (e: any) {
    console.error('[Firestore] Error saving attendance to Firestore:', e);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function deleteAttendanceFs(attendanceId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId));
  } catch (e) {
    console.error('Error deleting attendance from Firestore:', e);
  }
}

export async function saveRolePermissionsFs(config: RolePermissionsConfig): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS.SYSTEM_CONFIG, 'role_permissions'), sanitizeFirestorePayload(config), { merge: true });
    console.log('[Firestore] Role permissions saved successfully');
  } catch (e) {
    console.error('Error saving role permissions to Firestore:', e);
  }
}


