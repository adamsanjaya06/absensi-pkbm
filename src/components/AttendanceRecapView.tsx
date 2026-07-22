import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Search,
  Filter,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Pencil,
  Trash2,
  X,
  Save,
  ZoomIn,
} from 'lucide-react';
import { AttendanceRecord, Division } from '../types';
import { getAttendanceRecords, getDivisions, updateAttendanceRecord, deleteAttendanceRecord } from '../lib/storage';
import { exportAttendanceToExcel, printAttendancePdfReport } from '../lib/exportUtils';
import { AttendancePhotoModal } from './AttendancePhotoModal';

export const AttendanceRecapView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(getAttendanceRecords());
  const [divisions] = useState<Division[]>(getDivisions());

  const [periodTab, setPeriodTab] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Edit, Delete & Photo Modal States
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const refreshData = () => {
    setRecords(getAttendanceRecords());
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Filter records based on criteria
  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nik.toLowerCase().includes(searchQuery.toLowerCase());

    const matchDiv = divisionFilter === 'ALL' || r.divisionName === divisionFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchType = typeFilter === 'ALL' || r.type === typeFilter;

    // Period / Date filter logic
    if (periodTab === 'harian') {
      const matchDate = !startDate || r.date === startDate;
      return matchSearch && matchDiv && matchStatus && matchType && matchDate;
    } else {
      const matchRange = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      return matchSearch && matchDiv && matchStatus && matchType && matchRange;
    }
  });

  // Save Edit Handler
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateAttendanceRecord(editingRecord);
    refreshData();
    setEditingRecord(null);
  };

  // Confirm Delete Handler
  const handleConfirmDelete = () => {
    if (!deletingRecord) return;
    deleteAttendanceRecord(deletingRecord.id);
    refreshData();
    setDeletingRecord(null);
  };

  // Calculate summary stats
  const totalCount = filteredRecords.length;
  const successCount = filteredRecords.filter((r) => r.status === 'berhasil').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'berhasil' && r.keterangan.includes('Terlambat')).length;
  const failedCount = filteredRecords.filter((r) => r.status === 'gagal').length;

  const handleExportExcel = () => {
    exportAttendanceToExcel(filteredRecords, `Rekap_Absensi_${periodTab.toUpperCase()}`);
  };

  const handlePrintPdf = () => {
    printAttendancePdfReport(
      filteredRecords,
      `Laporan Absensi Guru PKBM ASHAB`,
      `Periode ${periodTab.toUpperCase()} | Tanggal: ${startDate} s/d ${endDate}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Rekapitulasi Absensi Karyawan</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Laporan kehadiran harian, mingguan, dan bulanan dengan fitur Ekspor Excel & Cetak PDF
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Period Tabs & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Period Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setPeriodTab('harian')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              periodTab === 'harian'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Rekap Harian
          </button>
          <button
            onClick={() => setPeriodTab('mingguan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              periodTab === 'mingguan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Rekap Mingguan
          </button>
          <button
            onClick={() => setPeriodTab('bulanan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              periodTab === 'bulanan'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Rekap Bulanan
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Name/NIK */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Nama / NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
            >
              <option value="ALL">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
            >
              <option value="ALL">Semua Status</option>
              <option value="berhasil">Berhasil</option>
              <option value="gagal">Gagal / Ditolak</option>
            </select>
          </div>

          {/* Date Picker Start */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
            />
          </div>

          {/* Date Picker End (if weekly/monthly) */}
          <div>
            <input
              type="date"
              value={endDate}
              disabled={periodTab === 'harian'}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs disabled:opacity-50"
            />
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 text-xs">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Presensi Filter</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{totalCount} Record</span>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 text-xs">
            <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] font-semibold uppercase">Berhasil Disetujui</span>
            <span className="text-lg font-black text-emerald-600">{successCount} Record</span>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs">
            <span className="text-amber-700 dark:text-amber-300 block text-[10px] font-semibold uppercase">Terlambat</span>
            <span className="text-lg font-black text-amber-600">{lateCount} Record</span>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 text-xs">
            <span className="text-rose-700 dark:text-rose-300 block text-[10px] font-semibold uppercase">Gagal / Ditolak</span>
            <span className="text-lg font-black text-rose-600">{failedCount} Record</span>
          </div>
        </div>
      </div>

      {/* Recap Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Tanggal / Waktu</th>
                <th className="py-3 px-4">Karyawan</th>
                <th className="py-3 px-4">Divisi & Jabatan</th>
                <th className="py-3 px-4 text-center">Jenis</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Distance & Face AI</th>
                <th className="py-3 px-4">Alamat Lokasi</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Tidak ditemukan data rekap presensi sesuai filter ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">{rec.date}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400">{rec.serverTime} WIB</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
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
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{rec.divisionName}</div>
                      <div className="text-[10px] text-slate-400">{rec.positionName}</div>
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
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {rec.keterangan}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div>Jarak: {rec.distanceFromOfficeMeters}m</div>
                      <div>Face Match: {rec.faceMatchScore}%</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                      {rec.address}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingRecord({ ...rec })}
                          title="Edit Data Absensi"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 font-semibold text-[11px] rounded-lg border border-amber-200 dark:border-amber-800 transition active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeletingRecord(rec)}
                          title="Hapus Data Absensi"
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 font-semibold text-[11px] rounded-lg border border-rose-200 dark:border-rose-800 transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
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
            {/* Header */}
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

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Tanggal */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tanggal Absen</label>
                <input
                  type="date"
                  value={editingRecord.date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Server Time */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jam / Waktu Server</label>
                <input
                  type="text"
                  value={editingRecord.serverTime}
                  onChange={(e) => setEditingRecord({ ...editingRecord, serverTime: e.target.value })}
                  placeholder="08:00:00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Jenis Absen */}
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

              {/* Status */}
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

              {/* Keterangan */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={editingRecord.keterangan}
                  onChange={(e) => setEditingRecord({ ...editingRecord, keterangan: e.target.value })}
                  placeholder="Keterangan kehadiran..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                />
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Tepat Waktu', 'Terlambat (15 Mins)', 'Terlambat (30 Mins)', 'Izin Resmi', 'Sakit', 'Dinas Luar'].map(
                    (preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setEditingRecord({ ...editingRecord, keterangan: preset })}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-semibold rounded-md transition"
                      >
                        + {preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Distance */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Jarak GPS (Meter)</label>
                <input
                  type="number"
                  value={editingRecord.distanceFromOfficeMeters}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, distanceFromOfficeMeters: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Face Match Score */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Skor Biometrik Wajah (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editingRecord.faceMatchScore}
                  onChange={(e) =>
                    setEditingRecord({ ...editingRecord, faceMatchScore: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Modal Actions */}
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
              <p className="text-slate-500">
                NIK: {deletingRecord.nik} | {deletingRecord.divisionName}
              </p>
              <p className="text-slate-500 font-mono">
                Tanggal: {deletingRecord.date} | Jam: {deletingRecord.serverTime} ({deletingRecord.type.toUpperCase()})
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus catatan data absensi ini dari rekapitulasi dan database?
            </p>

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

      {/* MODAL POPUP FOTO BESAR */}
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
