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
};

// Seed Firestore if empty
export async function seedFirestoreIfEmpty() {
  try {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    if (usersSnap.empty) {
      console.log('Seeding initial users to Firestore...');
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, COLLECTIONS.USERS, u.id), u);
      }
    }

    const divsSnap = await getDocs(collection(db, COLLECTIONS.DIVISIONS));
    if (divsSnap.empty) {
      console.log('Seeding initial divisions to Firestore...');
      for (const d of INITIAL_DIVISIONS) {
        await setDoc(doc(db, COLLECTIONS.DIVISIONS, d.id), d);
      }
    }

    const posSnap = await getDocs(collection(db, COLLECTIONS.POSITIONS));
    if (posSnap.empty) {
      console.log('Seeding initial positions to Firestore...');
      for (const p of INITIAL_POSITIONS) {
        await setDoc(doc(db, COLLECTIONS.POSITIONS, p.id), p);
      }
    }

    const officeSnap = await getDocs(collection(db, COLLECTIONS.OFFICE));
    if (officeSnap.empty) {
      console.log('Seeding initial office settings to Firestore...');
      await setDoc(doc(db, COLLECTIONS.OFFICE, 'main_config'), DEFAULT_OFFICE_SETTINGS);
    }

    const attSnap = await getDocs(collection(db, COLLECTIONS.ATTENDANCE));
    // No mock attendance records seeded - attendance collection starts clean in Firebase
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

// Subscribe Attendance Records
export function subscribeAttendance(callback: (records: AttendanceRecord[]) => void) {
  const q = query(collection(db, COLLECTIONS.ATTENDANCE), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const recs: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        const numPart = (data.id || '').replace('att-', '');
        const ts = Number(numPart);
        // Clean up legacy mock data with non-timestamp IDs (e.g. att-1, att-2, etc)
        if (!isNaN(ts) && ts > 1700000000000) {
          recs.push(data);
        } else {
          deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, docSnap.id)).catch(() => {});
        }
      });
      callback(recs);
    },
    (err) => {
      // Fallback without ordering if index is building
      return onSnapshot(collection(db, COLLECTIONS.ATTENDANCE), (snapshot) => {
        const recs: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as AttendanceRecord;
          const numPart = (data.id || '').replace('att-', '');
          const ts = Number(numPart);
          if (!isNaN(ts) && ts > 1700000000000) {
            recs.push(data);
          } else {
            deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, docSnap.id)).catch(() => {});
          }
        });
        recs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(recs);
      });
    }
  );
}

// Mutation functions
export async function saveUserFs(user: User) {
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), user, { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.DIVISIONS, division.id), division, { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.POSITIONS, position.id), position, { merge: true });
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
    await setDoc(doc(db, COLLECTIONS.OFFICE, 'main_config'), office, { merge: true });
  } catch (e) {
    console.error('Error saving office settings to Firestore:', e);
  }
}

export async function saveAttendanceFs(record: AttendanceRecord) {
  try {
    await setDoc(doc(db, COLLECTIONS.ATTENDANCE, record.id), record);
  } catch (e) {
    console.error('Error saving attendance to Firestore:', e);
  }
}

export async function deleteAttendanceFs(attendanceId: string) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.ATTENDANCE, attendanceId));
  } catch (e) {
    console.error('Error deleting attendance from Firestore:', e);
  }
}

