export type Role = 'admin' | 'karyawan';
export type Gender = 'L' | 'P';
export type EmployeeStatus = 'aktif' | 'nonaktif';
export type AttendanceType = 'masuk' | 'pulang';
export type AttendanceStatus = 'berhasil' | 'gagal';

export interface User {
  id: string;
  nik: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  gender: Gender;
  divisionId: string;
  divisionName: string;
  positionId: string;
  positionName: string;
  phone: string;
  status: EmployeeStatus;
  role: Role;
  photoUrl: string;
  faceDescriptor?: number[];
  faceRegistered: boolean;
  createdAt: string;
  allowedMenus?: string[];
  hasCustomPermissions?: boolean;
}

export interface Division {
  id: string;
  name: string;
  code: string;
  description: string;
  employeeCount?: number;
}

export interface Position {
  id: string;
  title: string;
  level: string;
  description: string;
  employeeCount?: number;
}

export interface OfficeBranch {
  id: string;
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  isHeadquarters?: boolean;
}

export interface OfficeSettings {
  officeName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address: string;
  workStartTime: string; // e.g. "08:00"
  workEndTime: string;   // e.g. "17:00"
  lateToleranceMinutes: number; // e.g. 15
  workDays?: string[]; // e.g. ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  branches?: OfficeBranch[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  nik: string;
  divisionName: string;
  positionName: string;
  branchName?: string;
  type: AttendanceType;
  date: string; // YYYY-MM-DD
  serverTime: string; // HH:mm:ss
  timestamp: number;
  photo: string; // base64 or URL
  latitude: number;
  longitude: number;
  address: string;
  distanceFromOfficeMeters: number;
  faceMatchScore: number; // 0 - 100%
  status: AttendanceStatus;
  keterangan: string;
}

export interface DashboardStats {
  totalKaryawan: number;
  hadirHariIni: number;
  belumHadir: number;
  terlambatHariIni: number;
  absenPulangHariIni: number;
  persentaseKehadiran: number;
}

export interface WeeklyTrend {
  dayName: string;
  date: string;
  masuk: number;
  terlambat: number;
  pulang: number;
}

export interface MonthlyTrend {
  monthName: string;
  totalHadir: number;
  tepatWaktu: number;
  terlambat: number;
}

export interface FaceDetectionResult {
  detected: boolean;
  score: number;
  message: string;
  descriptor?: number[];
  faceCount?: number;
}

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  officeRadiusMeters: number;
  message: string;
  branchName?: string;
}

export type AppMenuId =
  | 'dashboard'
  | 'roles'
  | 'karyawan'
  | 'divisi'
  | 'jabatan'
  | 'lokasi'
  | 'rekap'
  | 'absen'
  | 'riwayat'
  | 'profil';

export interface AppMenuItem {
  id: AppMenuId;
  label: string;
  category: 'operasional' | 'laporan' | 'master' | 'sistem';
  categoryLabel: string;
  description: string;
  defaultForRoles: Role[];
}

export interface RolePermissionsConfig {
  admin: string[];
  karyawan: string[];
}

export const ALL_APP_MENUS: AppMenuItem[] = [
  {
    id: 'absen',
    label: 'Absen Masuk & Pulang',
    category: 'operasional',
    categoryLabel: 'Operasional Karyawan',
    description: 'Fitur presensi online dengan kamera selfie wajah dan verifikasi radius GPS.',
    defaultForRoles: ['admin', 'karyawan'],
  },
  {
    id: 'riwayat',
    label: 'Rekap Absensi Saya',
    category: 'operasional',
    categoryLabel: 'Operasional Karyawan',
    description: 'Melihat rekap dan riwayat catatan presensi harian, foto bukti, jam masuk/pulang pribadi.',
    defaultForRoles: ['admin', 'karyawan'],
  },
  {
    id: 'profil',
    label: 'Profil & Register Wajah',
    category: 'operasional',
    categoryLabel: 'Operasional Karyawan',
    description: 'Melihat data profil pegawai dan melakukan pendaftaran/update biometrik wajah.',
    defaultForRoles: ['admin', 'karyawan'],
  },
  {
    id: 'dashboard',
    label: 'Dashboard Analytics',
    category: 'sistem',
    categoryLabel: 'Pengawasan & Analitik',
    description: 'Statistik kehadiran hari ini, perbandingan tepat waktu/terlambat, dan grafik.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'rekap',
    label: 'Rekap Absensi & Laporan',
    category: 'laporan',
    categoryLabel: 'Laporan & Ekspor',
    description: 'Tabel riwayat seluruh karyawan perusahaan, filter divisi/tanggal, ekspor Excel/PDF.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'karyawan',
    label: 'Master Karyawan',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Manajemen data seluruh staf, NIK, penempatan divisi, jabatan, dan status akun.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'divisi',
    label: 'Master Divisi',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Pengaturan struktur departemen dan unit kerja di perusahaan.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'jabatan',
    label: 'Master Jabatan',
    category: 'master',
    categoryLabel: 'Master Data',
    description: 'Pengaturan jabatan kerja, level pimpinan, dan hierarki operasional.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'lokasi',
    label: 'Pengaturan Kantor & GPS',
    category: 'sistem',
    categoryLabel: 'Pengaturan Sistem',
    description: 'Titik koordinat GPS kantor pusat & cabang, radius toleransi meter geofence.',
    defaultForRoles: ['admin'],
  },
  {
    id: 'roles',
    label: 'Konfigurasi Role & Hak Akses',
    category: 'sistem',
    categoryLabel: 'Pengaturan Sistem',
    description: 'Pengaturan peran admin/karyawan dan pemilihan hak akses menu pengguna.',
    defaultForRoles: ['admin'],
  },
];

