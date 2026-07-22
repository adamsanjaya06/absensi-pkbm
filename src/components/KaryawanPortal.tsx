import React, { useState } from 'react';
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
} from 'lucide-react';
import { User as UserType, OfficeSettings, AttendanceRecord, AttendanceType } from '../types';
import { getAttendanceRecords, saveUser } from '../lib/storage';
import { AttendanceCameraModal } from './AttendanceCameraModal';
import { ReRegisterFaceModal } from './ReRegisterFaceModal';
import { isWorkDay } from '../lib/geo';

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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(getAttendanceRecords());

  // Search & Filter state for History
  const [dateSearch, setDateSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Filter personal attendance history
  const myRecords = attendanceRecords.filter((r) => r.employeeId === currentUser.id);

  const filteredMyRecords = myRecords.filter((r) => {
    const matchDate = !dateSearch || r.date.includes(dateSearch);
    const matchType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchDate && matchType;
  });

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const myTodayMasuk = myRecords.find((r) => r.date === today && r.type === 'masuk' && r.status === 'berhasil');
  const myTodayPulang = myRecords.find((r) => r.date === today && r.type === 'pulang' && r.status === 'berhasil');

  const workDayInfo = isWorkDay(office, today);

  return (
    <div className="space-y-6">
      {/* Employee Greeting & Profile Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentUser.photoUrl}
            alt={currentUser.name}
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-md"
          />
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

      {/* Operational Work Day Notice */}
      {!workDayInfo.allowed && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl text-amber-900 dark:text-amber-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <h4 className="font-bold text-xs">Hari Libur Operasional Perusahaan</h4>
            <p className="text-xs opacity-90">
              Hari ini (<span className="font-bold">{workDayInfo.currentDay}</span>) bukan merupakan hari kerja operasional kantor. Pengisian absensi tidak diperbolehkan.
            </p>
          </div>
        </div>
      )}

      {/* TAB 1: ABSEN MASUK / PULANG */}
      {(activeTab === 'absen' || !['riwayat', 'profil'].includes(activeTab)) && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* TAB 2: RIWAYAT ABSENSI SAYA */}
      {(activeTab === 'riwayat' || activeTab === 'absen') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Riwayat Absensi Saya</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar seluruh transaksi absensi masuk dan pulang yang pernah Anda lakukan
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="ALL">Semua Jenis</option>
                <option value="masuk">Masuk</option>
                <option value="pulang">Pulang</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                <tr>
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
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada data riwayat absensi yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredMyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
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
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-28 h-28 mx-auto rounded-full object-cover ring-4 ring-blue-500/20 shadow-md"
              />
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{currentUser.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">NIK: {currentUser.nik}</p>
              </div>

              <div className="pt-2">
                {currentUser.faceRegistered ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Wajah AI Telah Terdaftar</span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Wajah Belum Terdaftar</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsReRegisterModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>{currentUser.faceRegistered ? 'Registrasi Ulang Wajah AI' : 'Daftarkan Wajah AI Sekarang'}</span>
              </button>
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
    </div>
  );
};
