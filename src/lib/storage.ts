import {
  User,
  Division,
  Position,
  OfficeSettings,
  AttendanceRecord,
  DashboardStats,
  WeeklyTrend,
  MonthlyTrend,
} from '../types';
import {
  INITIAL_DIVISIONS,
  INITIAL_POSITIONS,
  DEFAULT_OFFICE_SETTINGS,
  INITIAL_USERS,
  getInitialAttendances,
} from './mockData';
import {
  seedFirestoreIfEmpty,
  subscribeUsers,
  subscribeDivisions,
  subscribePositions,
  subscribeOfficeSettings,
  subscribeAttendance,
  saveUserFs,
  deleteUserFs,
  saveDivisionFs,
  deleteDivisionFs,
  savePositionFs,
  deletePositionFs,
  saveOfficeSettingsFs,
  saveAttendanceFs,
} from './firebaseService';

const STORAGE_KEYS = {
  USERS: 'absensi_pwa_users_v1',
  DIVISIONS: 'absensi_pwa_divisions_v1',
  POSITIONS: 'absensi_pwa_positions_v1',
  OFFICE: 'absensi_pwa_office_v1',
  ATTENDANCE: 'absensi_pwa_attendance_v1',
  CURRENT_USER: 'absensi_pwa_current_user_v1',
  THEME: 'absensi_pwa_theme_v1',
};

// Seed initial local state if missing
export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DIVISIONS)) {
    localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(INITIAL_DIVISIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.POSITIONS)) {
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(INITIAL_POSITIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.OFFICE)) {
    localStorage.setItem(STORAGE_KEYS.OFFICE, JSON.stringify(DEFAULT_OFFICE_SETTINGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(getInitialAttendances()));
  }
}

// Global Firebase Realtime Sync Hook/Initializer
export function setupRealtimeFirebaseSync(onDataUpdated?: () => void) {
  // 1. Seed Firestore if empty
  seedFirestoreIfEmpty();

  // 2. Subscriptions
  const unsub1 = subscribeUsers((users) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub2 = subscribeDivisions((divs) => {
    localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub3 = subscribePositions((pos) => {
    localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(pos));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub4 = subscribeOfficeSettings((office) => {
    localStorage.setItem(STORAGE_KEYS.OFFICE, JSON.stringify(office));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub5 = subscribeAttendance((recs) => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(recs));
    if (onDataUpdated) onDataUpdated();
  });

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
    unsub5();
  };
}

// Users Management
export function getUsers(): User[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : INITIAL_USERS;
}

export function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  users.forEach((u) => saveUserFs(u));
}

export function saveUser(user: User): User {
  const users = getUsers();
  const existingIdx = users.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    users[existingIdx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Sync to Firestore
  saveUserFs(user);

  // If current logged in user was updated
  const curr = getCurrentUser();
  if (curr && curr.id === user.id) {
    setCurrentUser(user);
  }
  return user;
}

export function deleteUser(id: string) {
  const users = getUsers().filter((u) => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  deleteUserFs(id);
}

// Current User Session
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

// Divisions
export function getDivisions(): Division[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.DIVISIONS);
  return data ? JSON.parse(data) : INITIAL_DIVISIONS;
}

export function saveDivisions(divs: Division[]) {
  localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
  divs.forEach((d) => saveDivisionFs(d));
}

export function saveDivision(div: Division): Division {
  const divs = getDivisions();
  const idx = divs.findIndex((d) => d.id === div.id);
  if (idx >= 0) {
    divs[idx] = div;
  } else {
    divs.push(div);
  }
  saveDivisions(divs);
  return div;
}

export function deleteDivision(id: string) {
  const divs = getDivisions().filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
  deleteDivisionFs(id);
}

// Positions
export function getPositions(): Position[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.POSITIONS);
  return data ? JSON.parse(data) : INITIAL_POSITIONS;
}

export function savePositions(positions: Position[]) {
  localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
  positions.forEach((p) => savePositionFs(p));
}

export function savePosition(pos: Position): Position {
  const positions = getPositions();
  const idx = positions.findIndex((p) => p.id === pos.id);
  if (idx >= 0) {
    positions[idx] = pos;
  } else {
    positions.push(pos);
  }
  savePositions(positions);
  return pos;
}

export function deletePosition(id: string) {
  const positions = getPositions().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
  deletePositionFs(id);
}

// Office Settings
export function getOfficeSettings(): OfficeSettings {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.OFFICE);
  return data ? JSON.parse(data) : DEFAULT_OFFICE_SETTINGS;
}

export function saveOfficeSettings(office: OfficeSettings) {
  localStorage.setItem(STORAGE_KEYS.OFFICE, JSON.stringify(office));
  saveOfficeSettingsFs(office);
}

// Attendance Records
export function getAttendanceRecords(): AttendanceRecord[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
}

export function saveAttendanceRecord(record: AttendanceRecord) {
  const records = getAttendanceRecords();
  records.unshift(record); // put latest at top
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
  saveAttendanceFs(record);
  return record;
}

// Server Time Fetcher
export async function getServerTimeRealtime(): Promise<{
  serverTime: string;
  serverDate: string;
  formatted: string;
}> {
  try {
    const res = await fetch('/api/server-time');
    if (res.ok) {
      const data = await res.json();
      return {
        serverTime: data.time,
        serverDate: data.date,
        formatted: data.formatted,
      };
    }
  } catch (err) {
    console.warn('Cannot reach /api/server-time, using fallback server time sync:', err);
  }

  // Fallback to local clock in Asia/Jakarta timezone
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(now);
  return {
    serverTime: time,
    serverDate: dateStr,
    formatted: `${dateStr} ${time} WIB`,
  };
}

// Dashboard Statistics Calculation
export function getDashboardStats(): DashboardStats {
  const users = getUsers().filter((u) => u.role === 'karyawan' && u.status === 'aktif');
  const totalKaryawan = users.length;

  const today = new Date().toISOString().split('T')[0];
  const records = getAttendanceRecords().filter((r) => r.date === today);

  // Unique employees who checked in today
  const checkedInUserIds = new Set(
    records.filter((r) => r.type === 'masuk' && r.status === 'berhasil').map((r) => r.employeeId)
  );

  const checkedOutUserIds = new Set(
    records.filter((r) => r.type === 'pulang' && r.status === 'berhasil').map((r) => r.employeeId)
  );

  const lateUserIds = new Set(
    records
      .filter((r) => r.type === 'masuk' && r.status === 'berhasil' && r.keterangan.includes('Terlambat'))
      .map((r) => r.employeeId)
  );

  const hadirHariIni = checkedInUserIds.size;
  const belumHadir = Math.max(0, totalKaryawan - hadirHariIni);
  const terlambatHariIni = lateUserIds.size;
  const absenPulangHariIni = checkedOutUserIds.size;
  const persentaseKehadiran = totalKaryawan > 0 ? Math.round((hadirHariIni / totalKaryawan) * 100) : 0;

  return {
    totalKaryawan,
    hadirHariIni,
    belumHadir,
    terlambatHariIni,
    absenPulangHariIni,
    persentaseKehadiran,
  };
}

// Weekly trend data for dashboard
export function getWeeklyTrendData(): WeeklyTrend[] {
  const records = getAttendanceRecords();
  const days: WeeklyTrend[] = [];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];

    const dayRecords = records.filter((r) => r.date === dateStr && r.status === 'berhasil');

    const masuk = dayRecords.filter((r) => r.type === 'masuk').length;
    const terlambat = dayRecords.filter(
      (r) => r.type === 'masuk' && r.keterangan.includes('Terlambat')
    ).length;
    const pulang = dayRecords.filter((r) => r.type === 'pulang').length;

    days.push({
      dayName: `${dayName} (${d.getDate()}/${d.getMonth() + 1})`,
      date: dateStr,
      masuk,
      terlambat,
      pulang,
    });
  }

  return days;
}

// Monthly trend data
export function getMonthlyTrendData(): MonthlyTrend[] {
  const records = getAttendanceRecords().filter((r) => r.status === 'berhasil');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const currYear = new Date().getFullYear();
  const monthsData: MonthlyTrend[] = [];

  for (let m = 0; m < 6; m++) {
    const monthIdx = (new Date().getMonth() - 5 + m + 12) % 12;
    const monthLabel = `${monthNames[monthIdx]} ${currYear}`;

    const monthRecords = records.filter((r) => {
      const recDate = new Date(r.date);
      return recDate.getMonth() === monthIdx && recDate.getFullYear() === currYear;
    });

    const totalHadir = monthRecords.filter((r) => r.type === 'masuk').length;
    const terlambat = monthRecords.filter(
      (r) => r.type === 'masuk' && r.keterangan.includes('Terlambat')
    ).length;
    const tepatWaktu = Math.max(0, totalHadir - terlambat);

    monthsData.push({
      monthName: monthLabel,
      totalHadir,
      tepatWaktu,
      terlambat,
    });
  }

  return monthsData;
}
