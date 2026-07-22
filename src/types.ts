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
}

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  officeRadiusMeters: number;
  message: string;
  branchName?: string;
}
