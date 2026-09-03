import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  ShieldCheck,
  User as UserIcon,
  History,
  RefreshCw,
  Search,
  Filter,
  Building,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
  Award,
  Lock,
  ZoomIn,
  LogIn,
  LogOut,
  Layers,
} from 'lucide-react';
import { User as UserType, OfficeSettings, AttendanceRecord, AttendanceType } from '../types';
import { getAttendanceRecords, saveUser } from '../lib/storage';
import { subscribeAttendance } from '../lib/firebaseService';
import { AttendanceCameraModal } from './AttendanceCameraModal';
import { ReRegisterFaceModal } from './ReRegisterFaceModal';
import { AttendancePhotoModal } from './AttendancePhotoModal';
import { Pagination } from './Pagination';
import { isWorkDay, checkOperationalSchedule } from '../lib/geo';

interface KaryawanPortalProps {
  currentUser: UserType;
  office: OfficeSettings;
  activeTab?: string;
  onRefreshUser: (updated: UserType) => void;
}

export const KaryawanPortal: React.FC<KaryawanPortalProps> = ({
  currentUser,
  office,
  activeTab = 'absen',
  onRefreshUser,
}) => {
  const [activeModalType, setActiveModalType] = useState<AttendanceType | null>(null);
  const [isReRegisterModalOpen, setIsReRegisterModalOpen] = useState(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(getAttendanceRecords());

  useEffect(() => {
    const unsub = subscribeAttendance((recs) => {
      if (recs) {
        setAttendanceRecords(recs);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setAttendanceRecords(e.detail);
      }
    };
    window.addEventListener('absensi_attendance_updated', handleUpdate);

    return () => {
      unsub();
      window.removeEventListener('absensi_attendance_updated', handleUpdate);
    };
  }, []);

  // Search & Filter state for History
  const [dateSearch, setDateSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Pagination state for personal history - default 50 records per page
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateSearch, typeFilter]);

  // Filter personal attendance history
  const myRecords = attendanceRecords.filter((r) => r.employeeId === currentUser.id);

  const myAllTotalCount = myRecords.length;
  const myAllMasukCount = myRecords.filter((r) => (r.type || 'masuk').toLowerCase() === 'masuk').length;
  const myAllPulangCount = myRecords.filter((r) => (r.type || '').toLowerCase() === 'pulang').length;

  const filteredMyRecords = myRecords.filter((r) => {
    const matchDate = !dateSearch || r.date.includes(dateSearch);
    const recType = (r.type || 'masuk').toLowerCase();
    const matchType =
      typeFilter === 'ALL' ||
      recType === typeFilter ||
      (typeFilter === 'masuk' && recType.includes('masuk')) ||
      (typeFilter === 'pulang' && recType.includes('pulang'));
    return matchDate && matchType;
  });

  // Paginated records for Employee
  const myTotalItems = filteredMyRecords.length;
  const myTotalPages = Math.max(1, Math.ceil(myTotalItems / pageSize));
  const safeMyCurrentPage = Math.min(Math.max(1, currentPage), myTotalPages);
  const myStartIndex = (safeMyCurrentPage - 1) * pageSize;
  const paginatedMyRecords = filteredMyRecords.slice(myStartIndex, myStartIndex + pageSize);

  const myTotalCount = filteredMyRecords.length;
  const myMasukCount = filteredMyRecords.filter((r) => (r.type || 'masuk').toLowerCase() === 'masuk').length;
  const myPulangCount = filteredMyRecords.filter((r) => (r.type || '').toLowerCase() === 'pulang').length;

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const myTodayMasuk = myRecords.find((r) => r.date === today && r.type === 'masuk' && r.status === 'berhasil');
  const myTodayPulang = myRecords.find((r) => r.date === today && r.type === 'pulang' && r.status === 'berhasil');

  const scheduleInfo = checkOperationalSchedule(office, today);

  return (
    <div className="space-y-6">
      {/* Employee Greeting & Profile Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {currentUser.photoUrl ? (
            <img
              src={currentUser.photoUrl}
              alt={currentUser.name}
              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 text-white ring-4 ring-white/20 shadow-md flex items-center justify-center font-bold text-2xl">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 text-[10px] font-extrabold uppercase tracking-wider">
                PORTAL KARYAWAN
              </span>
              {currentUser.faceRegistered ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Wajah Terdaftar AI
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-extrabold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Wajah Belum Terdaftar
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold mt-1">{currentUser.name}</h1>
            <p className="text-xs text-blue-100 opacity-90">
              NIK: {currentUser.nik} | Divisi {currentUser.divisionName} ({currentUser.positionName})
            </p>
          </div>
        </div>

        {/* Face Registration / Re-registration Action Button */}
        <button
          onClick={() => setIsReRegisterModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-lg transition active:scale-95 ${
            currentUser.faceRegistered
              ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{currentUser.faceRegistered ? 'Registrasi Ulang Wajah AI' : 'Daftarkan Wajah Sekarang'}</span>
        </button>
      </div>

      {/* TAB 1: ABSEN MASUK / PULANG */}
      {(activeTab === 'absen' || !['riwayat', 'profil'].includes(activeTab)) && (
        <div className="space-y-6">
          {!scheduleInfo.isOperational ? (
            /* HARI LIBUR OPERASIONAL ATAU MELEWATI BATAS WAKTU: SEMBUNYIKAN MENU ABSENSI & TAMPILKAN INFORMASI */
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-200 dark:border-amber-900/60 shadow-md space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-950/80 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 shrink-0">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="inline-block px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    {!scheduleInfo.isWorkDayAllowed ? 'Hari Libur Operasional' : 'Di Luar Jam Kerja Operasional'}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Menu Absensi Jadwal Masuk & Pulang Ditutup
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Pengisian absensi hanya dapat dilakukan pada <span className="font-bold text-amber-600 dark:text-amber-400">hari kerja</span> dan <span className="font-bold text-amber-600 dark:text-amber-400">jam kerja operasional</span> sesuai dengan pengaturan hari dan jam kerja yang sudah ditentukan oleh pihak manajemen perusahaan.
                  </p>
                </div>
              </div>

              {/* Detail Pengaturan Operasional Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Hari Kerja Operasional:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(office.workDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']).join(', ')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Jam Kerja Operasional:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {office.workStartTime} WIB s/d {office.workEndTime} WIB (Toleransi {office.lateToleranceMinutes} menit)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Status Waktu Saat Ini:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Hari {scheduleInfo.currentDay}, Pukul {scheduleInfo.currentTimeFormatted} WIB
                  </span>
                </div>
                {scheduleInfo.reason && (
                  <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{scheduleInfo.reason}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Absen Masuk Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>Absen Masuk Harian</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jadwal Masuk: {office.workStartTime} WIB</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Toleransi keterlambatan {office.lateToleranceMinutes} menit dari jam kantor.
                    </p>
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                {/* Today Status Indicator */}
                {myTodayMasuk ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Sudah Absen Masuk Hari Ini</span>
                        <p className="text-[11px] opacity-80">{myTodayMasuk.serverTime} WIB - {myTodayMasuk.keterangan}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Belum melakukan Absen Masuk hari ini.</span>
                  </div>
                )}

                <button
                  onClick={() => setActiveModalType('masuk')}
                  disabled={!!myTodayMasuk}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>{myTodayMasuk ? 'Absen Masuk Selesai' : 'Lakukan Absen Masuk Kamera & GPS'}</span>
                </button>
              </div>

              {/* Absen Pulang Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Absen Pulang Kerja</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Jadwal Pulang: {office.workEndTime} WIB</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Absen jam pulang setelah menyelesaikan jam kerja kantor.
                    </p>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-lg">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                {/* Today Status Indicator */}
                {myTodayPulang ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <span className="font-bold">Sudah Absen Pulang Hari Ini</span>
                        <p className="text-[11px] opacity-80">{myTodayPulang.serverTime} WIB - {myTodayPulang.keterangan}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Belum melakukan Absen Pulang hari ini.</span>
                  </div>
                )}

                <button
                  onClick={() => setActiveModalType('pulang')}
                  disabled={!myTodayMasuk || !!myTodayPulang}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {!myTodayMasuk
                      ? 'Harap Absen Masuk Dulu'
                      : myTodayPulang
                      ? 'Absen Pulang Selesai'
                      : 'Lakukan Absen Pulang Kamera & GPS'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP & RIWAYAT ABSENSI SAYA */}
      {(activeTab === 'riwayat' || activeTab === 'absen') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Rekap Absensi Saya</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {filteredMyRecords.length} Data
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar seluruh riwayat transaksi absensi masuk dan pulang yang pernah Anda lakukan
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Synchronized Type Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  id="filter-my-tab-semua"
                  onClick={() => setTypeFilter('ALL')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    typeFilter === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Semua ({myAllTotalCount})</span>
                </button>
                <button
                  type="button"
                  id="filter-my-tab-masuk"
                  onClick={() => setTypeFilter('masuk')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    typeFilter === 'masuk'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <LogIn className="w-3 h-3" />
                  <span>Masuk ({myAllMasukCount})</span>
                </button>
                <button
                  type="button"
                  id="filter-my-tab-pulang"
                  onClick={() => setTypeFilter('pulang')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    typeFilter === 'pulang'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}
                >
                  <LogOut className="w-3 h-3" />
                  <span>Pulang ({myAllPulangCount})</span>
                </button>
              </div>

              {/* Dropdown Filter Masuk atau Pulang (Synchronized with Tabs) */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <label htmlFor="filter-my-type" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Dropdown:
                </label>
                <select
                  id="filter-my-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`bg-transparent font-bold text-xs focus:outline-none cursor-pointer ${
                    typeFilter !== 'ALL'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    Semua Jenis (Masuk / Pulang)
                  </option>
                  <option value="masuk" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    Masuk (Absen Masuk)
                  </option>
                  <option value="pulang" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    Pulang (Absen Pulang)
                  </option>
                </select>
              </div>

              {/* Tanggal */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Tanggal:
                </span>
                <input
                  type="date"
                  value={dateSearch}
                  onChange={(e) => setDateSearch(e.target.value)}
                  className="bg-transparent font-semibold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>

              {/* Reset filter */}
              {(typeFilter !== 'ALL' || dateSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('ALL');
                    setDateSearch('');
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition"
                  title="Reset Filter"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Mini Summary Badges for Employee's own records */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase">Total Riwayat</span>
              <span className="text-base font-black text-slate-900 dark:text-white">{myTotalCount} Record</span>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs">
              <span className="text-blue-700 dark:text-blue-300 block text-[10px] font-semibold uppercase">Absen Masuk</span>
              <span className="text-base font-black text-blue-600 dark:text-blue-400">{myMasukCount} Record</span>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs">
              <span className="text-amber-700 dark:text-amber-300 block text-[10px] font-semibold uppercase">Absen Pulang</span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400">{myPulangCount} Record</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Foto Absen</th>
                  <th className="py-3 px-4">Tanggal / Waktu</th>
                  <th className="py-3 px-4 text-center">Jenis</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Lokasi Cabang / Kantor</th>
                  <th className="py-3 px-4">Keterangan AI</th>
                  <th className="py-3 px-4">Jarak & Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Belum ada data riwayat absensi yang cocok.
                    </td>
                  </tr>
                ) : (
                  paginatedMyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedPhotoRecord(rec)}
                          title="Klik untuk memperbesar foto bukti absen"
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs block focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {rec.photo ? (
                            <img
                              src={rec.photo}
                              alt={rec.employeeName}
                              className="w-10 h-10 object-cover group-hover:scale-110 transition duration-200"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                              {rec.employeeName ? rec.employeeName.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{rec.date}</div>
                        <div className="text-[11px] text-blue-600 dark:text-blue-400">{rec.serverTime} WIB</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            rec.type === 'masuk'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {rec.type === 'masuk' ? 'MASUK' : 'PULANG'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                            rec.status === 'berhasil'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {rec.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {rec.branchName || office.officeName}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {rec.keterangan}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        <div>Jarak: {rec.distanceFromOfficeMeters}m</div>
                        <div>Wajah: {rec.faceMatchScore}%</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Menu - 50 data per halaman */}
          <Pagination
            currentPage={safeMyCurrentPage}
            totalItems={filteredMyRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100, 200]}
          />
        </div>
      )}

      {/* TAB 3: PROFIL & REGISTER WAJAH */}
      {activeTab === 'profil' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Profil Saya & Registrasi AI Wajah</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Informasi identitas karyawan, data kredensial akun, serta status pemindaian wajah biometrik
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Card: Photo & Face Status */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.name}
                  className="w-28 h-28 mx-auto rounded-full object-cover ring-4 ring-blue-500/20 shadow-md"
                />
              ) : (
                <div className="w-28 h-28 mx-auto rounded-full bg-blue-500/20 text-blue-500 ring-4 ring-blue-500/20 shadow-md flex items-center justify-center font-bold text-3xl">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{currentUser.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">NIK: {currentUser.nik}</p>
              </div>

              <div className="pt-2">
                {currentUser.faceRegistered ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Wajah AI Terdaftar & Terkunci</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Wajah Belum Terdaftar</span>
                  </div>
                )}
              </div>

              {currentUser.faceRegistered ? (
                <div className="space-y-2">
                  <button
                    disabled
                    onClick={() => setIsReRegisterModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Biometrik Wajah Terkunci (1x Saja)</span>
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Registrasi biometrik wajah hanya dapat dilakukan 1 kali per akun dan tidak dapat diganti demi keamanan verifikasi absen.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setIsReRegisterModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Daftarkan Wajah AI Sekarang (1x Saja)</span>
                </button>
              )}
            </div>

            {/* Right Card: Full Details */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Username Login</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    {currentUser.username || currentUser.nik.toLowerCase()}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <Award className="w-3.5 h-3.5 text-purple-500" />
                    <span>Status Karyawan</span>
                  </div>
                  <span className="inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold uppercase rounded-full">
                    {currentUser.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <Building className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Divisi Kerja</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.divisionName}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    <span>Jabatan Kerja</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.positionName}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <Mail className="w-3.5 h-3.5 text-rose-500" />
                    <span>Alamat Email</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.email}</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Nomor WhatsApp / Telp</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Attendance Scanner Modal */}
      {activeModalType && (
        <AttendanceCameraModal
          user={currentUser}
          office={office}
          attendanceType={activeModalType}
          isOpen={!!activeModalType}
          onClose={() => setActiveModalType(null)}
          onSuccess={(record) => {
            console.log('Attendance Success:', record);
            setAttendanceRecords(getAttendanceRecords());
          }}
        />
      )}

      {/* AI Face Re-Registration Modal */}
      {isReRegisterModalOpen && (
        <ReRegisterFaceModal
          isOpen={isReRegisterModalOpen}
          user={currentUser}
          onClose={() => setIsReRegisterModalOpen(false)}
          onSuccess={(updatedUser) => {
            onRefreshUser(updatedUser);
            setIsReRegisterModalOpen(false);
          }}
        />
      )}

      {/* Photo Enlarge Modal */}
      {selectedPhotoRecord && (
        <AttendancePhotoModal
          isOpen={!!selectedPhotoRecord}
          record={selectedPhotoRecord}
          onClose={() => setSelectedPhotoRecord(null)}
        />
      )}
    </div>
  );
};
