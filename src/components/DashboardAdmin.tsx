import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  LogOut,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Pencil,
  Trash2,
  X,
  Save,
  AlertTriangle,
  ZoomIn,
} from 'lucide-react';
import { OfficeSettings, AttendanceRecord } from '../types';
import {
  getDashboardStats,
  getWeeklyTrendData,
  getMonthlyTrendData,
  getAttendanceRecords,
  getUsers,
  updateAttendanceRecord,
  deleteAttendanceRecord,
} from '../lib/storage';
import { InteractiveMap } from './InteractiveMap';
import { AttendancePhotoModal } from './AttendancePhotoModal';

interface DashboardAdminProps {
  office: OfficeSettings;
  onNavigateRecap: () => void;
  onNavigateEmployees: () => void;
}

export const DashboardAdmin: React.FC<DashboardAdminProps> = ({
  office,
  onNavigateRecap,
  onNavigateEmployees,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>(getAttendanceRecords());
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const refreshData = () => {
    setRecords(getAttendanceRecords());
  };

  const stats = getDashboardStats();
  const weeklyData = getWeeklyTrendData();
  const monthlyData = getMonthlyTrendData();
  const recentRecords = records.slice(0, 8); // Top 8 recent clock ins/outs

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateAttendanceRecord(editingRecord);
    refreshData();
    setEditingRecord(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingRecord) return;
    deleteAttendanceRecord(deletingRecord.id);
    refreshData();
    setDeletingRecord(null);
  };

  // Find max value for weekly chart scaling
  const maxWeekly = Math.max(...weeklyData.map((d) => d.masuk), 5);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Sistem Absensi Karyawan PWA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Dashboard Ringkasan Presensi</h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            Pencatatan absensi karyawan dengan kecerdasan AI Face Recognition, Live Camera Verification, dan Geofencing GPS Realtime.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateRecap}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition active:scale-95 whitespace-nowrap"
          >
            Lihat Rekapitulasi Laporan
          </button>
        </div>
      </div>

      {/* 6 Key High Density Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Stat 1: Total Karyawan */}
        <div
          onClick={onNavigateEmployees}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition"
        >
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Karyawan</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalKaryawan}</h2>
            <span className="text-emerald-500 text-[10px] font-bold">Aktif</span>
          </div>
        </div>

        {/* Stat 2: Hadir Hari Ini */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hadir Hari Ini</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.hadirHariIni}</h2>
            <p className="text-[10px] font-semibold text-slate-500">{stats.persentaseKehadiran}% Rate</p>
          </div>
        </div>

        {/* Stat 3: Belum Hadir */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Belum Absen</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.belumHadir}</h2>
            <p className="text-[10px] font-medium text-slate-500">Pending</p>
          </div>
        </div>

        {/* Stat 4: Terlambat */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-rose-500">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Terlambat</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.terlambatHariIni}</h2>
            <p className="text-[10px] font-medium text-slate-500">&gt;{office.lateToleranceMinutes}m</p>
          </div>
        </div>

        {/* Stat 5: Absen Pulang */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sudah Pulang</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.absenPulangHariIni}</h2>
            <p className="text-[10px] font-medium text-slate-500">Clock-out</p>
          </div>
        </div>

        {/* Stat 6: Tingkat Kehadiran */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tingkat Hadir</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.persentaseKehadiran}%</h2>
            <p className="text-[10px] font-semibold text-emerald-500">Hari Ini</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Geofence Map */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">Peta Lokasi Absensi Realtime</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Titik lokasi kantor {office.officeName} (Radius {office.radiusMeters}m) & Pin presensi
                </p>
              </div>
            </div>
          </div>

          <InteractiveMap office={office} records={records} height="360px" />
        </div>

        {/* Weekly Attendance Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">Grafik Kehadiran Mingguan</h3>
                  <p className="text-[11px] text-slate-400">7 Hari Terakhir</p>
                </div>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="space-y-3 pt-2">
              {weeklyData.map((item, idx) => {
                const percent = Math.min(100, Math.round((item.masuk / maxWeekly) * 100));
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <span>{item.dayName}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.masuk} Hadir <span className="text-amber-500 text-[10px]">({item.terlambat} telat)</span>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly Summary Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Rata-rata Tepat Waktu:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">88.5% Kehadiran</span>
          </div>
        </div>
      </div>

      {/* Recent Attendance Realtime Logs Stream */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Aktivitas Absensi Terbaru Realtime</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Catatan waktu server, hasil kamera, & status verifikasi</p>
          </div>
          <button
            onClick={onNavigateRecap}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Lihat Semua Absensi &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Divisi & Jabatan</th>
                <th className="py-3 px-4">Waktu Server</th>
                <th className="py-3 px-4 text-center">Jenis</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Jarak GPS</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Belum ada data absensi tercatat hari ini.
                  </td>
                </tr>
              ) : (
                recentRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoRecord(rec)}
                          title="Klik untuk melihat & memperbesar foto bukti absen"
                          className="relative group shrink-0 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition active:scale-95"
                        >
                          <img
                            src={rec.photo}
                            alt={rec.employeeName}
                            className="w-9 h-9 rounded-full object-cover group-hover:scale-110 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white rounded-full">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </button>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NIK: {rec.nik}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{rec.divisionName}</div>
                      <div className="text-[10px] text-slate-400">{rec.positionName}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {rec.date} <br />
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">{rec.serverTime} WIB</span>
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
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {rec.keterangan}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {rec.distanceFromOfficeMeters}m
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingRecord({ ...rec })}
                          title="Edit Data Absensi"
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800 transition active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(rec)}
                          title="Hapus Data Absensi"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800 transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT ABSENSI */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={editingRecord.photo}
                  alt={editingRecord.employeeName}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Edit Presensi Karyawan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingRecord.employeeName} (NIK: {editingRecord.nik})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Absen</label>
                <input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jam / Waktu Server</label>
                <input
                  type="text"
                  value={editingRecord.serverTime}
                  onChange={(e) => setEditingRecord({ ...editingRecord, serverTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jenis Presensi</label>
                <select
                  value={editingRecord.type}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, type: e.target.value as 'masuk' | 'pulang' })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="masuk">ABSEN MASUK</option>
                  <option value="pulang">ABSEN PULANG</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Kehadiran</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, status: e.target.value as 'berhasil' | 'gagal' })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="berhasil">BERHASIL</option>
                  <option value="gagal">GAGAL / DITOLAK</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={editingRecord.keterangan}
                  onChange={(e) => setEditingRecord({ ...editingRecord, keterangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS ABSENSI CONFIRMATION */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Hapus Record Presensi</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{deletingRecord.employeeName}</p>
              <p className="text-slate-500 font-mono">
                Tanggal: {deletingRecord.date} | Jam: {deletingRecord.serverTime}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP FOTO BESAR MODAL */}
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
