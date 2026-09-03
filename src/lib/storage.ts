import {
  User,
  Division,
  Position,
  OfficeSettings,
  AttendanceRecord,
  DashboardStats,
  WeeklyTrend,
  MonthlyTrend,
  RolePermissionsConfig,
  Role,
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
  subscribeRolePermissions,
  saveRolePermissionsFs,
  fetchAttendanceDirectlyFs,
  checkFirestoreHealth,
  saveUserFs,
  deleteUserFs,
  saveDivisionFs,
  deleteDivisionFs,
  savePositionFs,
  deletePositionFs,
  saveOfficeSettingsFs,
  saveAttendanceFs,
  deleteAttendanceFs,
} from './firebaseService';
import {
  idbSaveAttendanceRecords,
  idbGetAttendanceRecords,
  idbDeleteAttendanceRecord,
} from './indexedDbHelper';

export { fetchAttendanceDirectlyFs, checkFirestoreHealth };

const STORAGE_KEYS = {
  USERS: 'absensi_pwa_users_v1',
  DIVISIONS: 'absensi_pwa_divisions_v1',
  POSITIONS: 'absensi_pwa_positions_v1',
  OFFICE: 'absensi_pwa_office_v1',
  ATTENDANCE: 'absensi_pwa_attendance_v1',
  CURRENT_USER: 'absensi_pwa_current_user_v1',
  THEME: 'absensi_pwa_theme_v1',
  ROLE_PERMISSIONS: 'absensi_pwa_role_permissions_v1',
};

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  admin: [
    'dashboard',
    'roles',
    'karyawan',
    'divisi',
    'jabatan',
    'lokasi',
    'rekap',
    'absen',
    'riwayat',
    'profil',
  ],
  karyawan: [
    'absen',
    'riwayat',
    'profil',
  ],
};

/**
 * Safe localStorage setter that intercepts QuotaExceededError and prevents crashes.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`[Storage] localStorage.setItem failed for key "${key}":`, e);
    // If QuotaExceededError, evict or strip heavy items from localStorage
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.number === -2147024882) {
      try {
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        if (key !== STORAGE_KEYS.ATTENDANCE) {
          localStorage.setItem(key, value);
          return true;
        }
      } catch (innerErr) {
        console.warn('[Storage] Quota clearance retry failed:', innerErr);
      }
    }
    return false;
  }
}

// In-memory cache for attendance records with full base64 photos
let inMemoryAttendanceRecords: AttendanceRecord[] = [];
let isIdbHydrationStarted = false;

/**
 * Persists attendance records safely:
 * 1. Keeps full data in-memory for instant rendering
 * 2. Persists full data with photos in IndexedDB (no 5MB limit)
 * 3. Keeps only a lightweight, compact copy in localStorage without heavy photos
 */
function safePersistAttendanceRecords(records: AttendanceRecord[]) {
  // 1. In-memory
  inMemoryAttendanceRecords = records;

  // 2. Full IndexedDB persistence (asynchronous, GB-scale storage)
  idbSaveAttendanceRecords(records);

  // 3. Compact localStorage fallback (stripped photos to never exceed 5MB quota)
  try {
    const compactRecords = records.slice(0, 25).map((r) => ({
      ...r,
      photo: '', // Strip bulky base64 data to keep localStorage tiny (< 30 KB)
    }));
    safeSetItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(compactRecords));
  } catch (err) {
    console.warn('[Storage] Skipping localStorage for attendance due to quota constraint:', err);
    try {
      localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    } catch {}
  }
}

// Seed initial local state if missing & clean up bloated localStorage if present
export function initializeStorage() {
  // Purge any bloated attendance history in localStorage that caused QuotaExceededError
  try {
    const rawAtt = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (rawAtt) {
      if (rawAtt.includes('data:image') || rawAtt.length > 100000) {
        try {
          const parsed = JSON.parse(rawAtt);
          if (Array.isArray(parsed)) {
            if (inMemoryAttendanceRecords.length === 0) {
              inMemoryAttendanceRecords = parsed;
            }
            idbSaveAttendanceRecords(parsed);
            const compact = parsed.slice(0, 15).map((r) => ({ ...r, photo: '' }));
            safeSetItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(compact));
          }
        } catch {
          localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        }
      }
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    } catch {}
  }

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.DIVISIONS)) {
    safeSetItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(INITIAL_DIVISIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.POSITIONS)) {
    safeSetItem(STORAGE_KEYS.POSITIONS, JSON.stringify(INITIAL_POSITIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.OFFICE)) {
    safeSetItem(STORAGE_KEYS.OFFICE, JSON.stringify(DEFAULT_OFFICE_SETTINGS));
  }
  const existingAtt = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (!existingAtt || existingAtt === '[]' || existingAtt === 'null') {
    const initial = getInitialAttendances();
    if (initial.length > 0) {
      safePersistAttendanceRecords(initial);
    }
  }
  if (!localStorage.getItem(STORAGE_KEYS.ROLE_PERMISSIONS)) {
    safeSetItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
  }

  // Hydrate full photos from IndexedDB in background
  if (!isIdbHydrationStarted) {
    isIdbHydrationStarted = true;
    idbGetAttendanceRecords().then((idbRecs) => {
      if (idbRecs && idbRecs.length > 0) {
        if (inMemoryAttendanceRecords.length === 0) {
          inMemoryAttendanceRecords = idbRecs;
          window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: idbRecs }));
        } else {
          // Merge photos into in-memory records
          const photoMap = new Map<string, string>();
          idbRecs.forEach((r) => {
            if (r.id && r.photo) photoMap.set(r.id, r.photo);
          });
          let merged = false;
          inMemoryAttendanceRecords.forEach((r) => {
            if (!r.photo && photoMap.has(r.id)) {
              r.photo = photoMap.get(r.id)!;
              merged = true;
            }
          });
          if (merged) {
            window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: inMemoryAttendanceRecords }));
          }
        }
      }
    }).catch(() => {});
  }
}

// Global Firebase Realtime Sync Hook/Initializer
export function setupRealtimeFirebaseSync(onDataUpdated?: () => void) {
  // 1. Seed Firestore if empty
  seedFirestoreIfEmpty();

  // 2. Subscriptions
  const unsub1 = subscribeUsers((users) => {
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('absensi_users_updated', { detail: users }));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub2 = subscribeDivisions((divs) => {
    safeSetItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
    window.dispatchEvent(new CustomEvent('absensi_divisions_updated', { detail: divs }));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub3 = subscribePositions((pos) => {
    safeSetItem(STORAGE_KEYS.POSITIONS, JSON.stringify(pos));
    window.dispatchEvent(new CustomEvent('absensi_positions_updated', { detail: pos }));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub4 = subscribeOfficeSettings((office) => {
    safeSetItem(STORAGE_KEYS.OFFICE, JSON.stringify(office));
    window.dispatchEvent(new CustomEvent('absensi_office_updated', { detail: office }));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub5 = subscribeAttendance((recs) => {
    safePersistAttendanceRecords(recs);
    window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: recs }));
    if (onDataUpdated) onDataUpdated();
  });

  const unsub6 = subscribeRolePermissions((permConfig) => {
    if (permConfig) {
      safeSetItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(permConfig));
      window.dispatchEvent(new CustomEvent('absensi_permissions_updated', { detail: permConfig }));
      if (onDataUpdated) onDataUpdated();
    }
  });

  return () => {
    unsub1();
    unsub2();
    unsub3();
    unsub4();
    unsub5();
    unsub6();
  };
}

// Role Permissions Management
export function getRolePermissions(): RolePermissionsConfig {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.ROLE_PERMISSIONS);
  if (!raw) return DEFAULT_ROLE_PERMISSIONS;
  try {
    const parsed = JSON.parse(raw);
    return {
      admin: Array.isArray(parsed.admin) ? parsed.admin : DEFAULT_ROLE_PERMISSIONS.admin,
      karyawan: Array.isArray(parsed.karyawan) ? parsed.karyawan : DEFAULT_ROLE_PERMISSIONS.karyawan,
    };
  } catch {
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveRolePermissions(config: RolePermissionsConfig): void {
  safeSetItem(STORAGE_KEYS.ROLE_PERMISSIONS, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('absensi_permissions_updated', { detail: config }));
  saveRolePermissionsFs(config);
}

/**
 * Returns the effective allowed menu IDs for a user.
 * If user has custom permissions enabled, uses user.allowedMenus.
 * Otherwise, falls back to role default permissions.
 */
export function getUserEffectiveMenus(user: User | null): string[] {
  if (!user) return [];
  if (user.hasCustomPermissions && Array.isArray(user.allowedMenus) && user.allowedMenus.length > 0) {
    return user.allowedMenus;
  }
  const rolePerms = getRolePermissions();
  const permsForRole = rolePerms[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  // For admin, always guarantee access to roles & dashboard as emergency safeguard
  if (user.role === 'admin' && !permsForRole.includes('roles')) {
    return [...permsForRole, 'roles'];
  }
  return permsForRole;
}


// Users Management
export function getUsers(): User[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : INITIAL_USERS;
}

export function saveUsers(users: User[]) {
  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
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
  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));

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
  safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  deleteUserFs(id);
}

// Current User Session
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    safeSetItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
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
  safeSetItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
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
  safeSetItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(divs));
  deleteDivisionFs(id);
}

// Positions
export function getPositions(): Position[] {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.POSITIONS);
  return data ? JSON.parse(data) : INITIAL_POSITIONS;
}

export function savePositions(positions: Position[]) {
  safeSetItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
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
  safeSetItem(STORAGE_KEYS.POSITIONS, JSON.stringify(positions));
  deletePositionFs(id);
}

// Office Settings
export function getOfficeSettings(): OfficeSettings {
  initializeStorage();
  const data = localStorage.getItem(STORAGE_KEYS.OFFICE);
  return data ? JSON.parse(data) : DEFAULT_OFFICE_SETTINGS;
}

export function saveOfficeSettings(office: OfficeSettings) {
  safeSetItem(STORAGE_KEYS.OFFICE, JSON.stringify(office));
  saveOfficeSettingsFs(office);
}

// Attendance Records
export function getAttendanceRecords(): AttendanceRecord[] {
  initializeStorage();
  if (inMemoryAttendanceRecords.length > 0) {
    return inMemoryAttendanceRecords;
  }
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (!data) {
    const initial = getInitialAttendances();
    inMemoryAttendanceRecords = initial;
    return initial;
  }
  try {
    const records: AttendanceRecord[] = JSON.parse(data);
    if (Array.isArray(records) && records.length > 0) {
      inMemoryAttendanceRecords = records;
      return records;
    }
    const initial = getInitialAttendances();
    if (initial.length > 0) {
      inMemoryAttendanceRecords = initial;
      safePersistAttendanceRecords(initial);
      return initial;
    }
    return [];
  } catch (e) {
    const initial = getInitialAttendances();
    inMemoryAttendanceRecords = initial;
    return initial;
  }
}

export function resetDemoAttendanceData(): AttendanceRecord[] {
  const initial = getInitialAttendances();
  inMemoryAttendanceRecords = initial;
  safePersistAttendanceRecords(initial);
  window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: initial }));
  return initial;
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<{ record: AttendanceRecord; cloudSynced: boolean; error?: string }> {
  const records = [...getAttendanceRecords()];
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record); // put latest at top
  }
  safePersistAttendanceRecords(records);
  
  // Fire local event immediately for reactive UI
  window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: records }));

  // Sync to Firestore cloud
  const res = await saveAttendanceFs(record);
  return {
    record,
    cloudSynced: res.success,
    error: res.error,
  };
}

export function updateAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
  const records = [...getAttendanceRecords()];
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  safePersistAttendanceRecords(records);
  window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: records }));
  saveAttendanceFs(record);
  return record;
}

export function deleteAttendanceRecord(id: string) {
  const records = getAttendanceRecords().filter((r) => r.id !== id);
  safePersistAttendanceRecords(records);
  idbDeleteAttendanceRecord(id);
  window.dispatchEvent(new CustomEvent('absensi_attendance_updated', { detail: records }));
  deleteAttendanceFs(id);
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
export function getDashboardStats(recordsInput?: AttendanceRecord[]): DashboardStats {
  const users = getUsers().filter((u) => u.role === 'karyawan' && u.status === 'aktif');
  const totalKaryawan = users.length;

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const allRecords = recordsInput || getAttendanceRecords();
  const records = allRecords.filter((r) => r.date === today);

  // Unique employees who checked in today
  const checkedInUserIds = new Set(
    records.filter((r) => r.type === 'masuk' && r.status === 'berhasil').map((r) => r.employeeId)
  );

  const checkedOutUserIds = new Set(
    records.filter((r) => r.type === 'pulang' && r.status === 'berhasil').map((r) => r.employeeId)
  );

  const lateUserIds = new Set(
    records
      .filter((r) => r.type === 'masuk' && r.status === 'berhasil' && (r.keterangan || '').includes('Terlambat'))
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
export function getWeeklyTrendData(recordsInput?: AttendanceRecord[]): WeeklyTrend[] {
  const records = recordsInput || getAttendanceRecords();
  const days: WeeklyTrend[] = [];

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d);
    const dayName = dayNames[d.getDay()];

    const dayRecords = records.filter((r) => r.date === dateStr && r.status === 'berhasil');

    const masuk = dayRecords.filter((r) => r.type === 'masuk').length;
    const terlambat = dayRecords.filter(
      (r) => r.type === 'masuk' && (r.keterangan || '').includes('Terlambat')
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
export function getMonthlyTrendData(recordsInput?: AttendanceRecord[]): MonthlyTrend[] {
  const records = (recordsInput || getAttendanceRecords()).filter((r) => r.status === 'berhasil');
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
      (r) => r.type === 'masuk' && (r.keterangan || '').includes('Terlambat')
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
