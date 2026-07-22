import { Division, Position, OfficeSettings, User, AttendanceRecord } from '../types';

export const INITIAL_DIVISIONS: Division[] = [
  { id: 'div-1', name: 'Teknologi Informasi (IT)', code: 'IT', description: 'Pengembangan Perangkat Lunak & Infrastruktur' },
  { id: 'div-2', name: 'Keuangan & Akuntansi', code: 'FIN', description: 'Pengelolaan Keuangan & Pembukuan' },
  { id: 'div-3', name: 'Sumber Daya Manusia (HR)', code: 'HR', description: 'Perekrutan & Manajemen SDM' },
  { id: 'div-4', name: 'Pemasaran & Media', code: 'MKT', description: 'Pemasaran Digital & Branding' },
  { id: 'div-5', name: 'Operasional', code: 'OPS', description: 'Layanan Pelanggan & Logistik' },
];

export const INITIAL_POSITIONS: Position[] = [
  { id: 'pos-1', title: 'Head of Department', level: 'Managerial', description: 'Penanggung Jawab Divisi' },
  { id: 'pos-2', title: 'Senior Software Engineer', level: 'Senior', description: 'Pengembang Sistem Senior' },
  { id: 'pos-3', title: 'Financial Analyst', level: 'Staff', description: 'Analis Keuangan' },
  { id: 'pos-4', title: 'HR Generalist', level: 'Staff', description: 'Perekrutan & Hubungan Karyawan' },
  { id: 'pos-5', title: 'Digital Marketing Specialist', level: 'Staff', description: 'Pengelola Media Sosial & Iklan' },
];

export const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  officeName: 'Kantor Pusat Jakarta CBD',
  latitude: -6.175392,
  longitude: 106.827153,
  radiusMeters: 100,
  address: 'Jl. Medan Merdeka Barat No. 17, Gambir, Jakarta Pusat 10110',
  workStartTime: '08:00',
  workEndTime: '17:00',
  lateToleranceMinutes: 15,
  workDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  branches: [
    {
      id: 'branch-surabaya',
      officeName: 'Cabang Surabaya HR Muhammad',
      latitude: -7.289123,
      longitude: 112.695421,
      radiusMeters: 150,
      address: 'Jl. HR Muhammad No. 88, Dukuh Pakis, Surabaya, Jawa Timur 60225',
    },
    {
      id: 'branch-bandung',
      officeName: 'Cabang Bandung Dago Tech',
      latitude: -6.890123,
      longitude: 107.610234,
      radiusMeters: 120,
      address: 'Jl. Ir. H. Juanda No. 120, Dago, Bandung, Jawa Barat 40132',
    },
  ],
};

// Only 1 initial Master Admin user for cold start authentication
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    nik: 'ADM001',
    username: 'admin',
    password: 'admin123',
    name: 'Administrator Perusahaan',
    email: 'admin@perusahaan.com',
    gender: 'L',
    divisionId: 'div-1',
    divisionName: 'Teknologi Informasi (IT)',
    positionId: 'pos-1',
    positionName: 'Head of Department',
    phone: '081234567890',
    status: 'aktif',
    role: 'admin',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    faceDescriptor: [],
    faceRegistered: false,
    createdAt: '2025-01-01',
  },
];

// Zero default attendance records - all records come directly from Firebase
export function getInitialAttendances(): AttendanceRecord[] {
  return [];
}
