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
} from 'lucide-react';
import { AttendanceRecord, Division } from '../types';
import { getAttendanceRecords, getDivisions } from '../lib/storage';
import { exportAttendanceToExcel, printAttendancePdfReport } from '../lib/exportUtils';

export const AttendanceRecapView: React.FC = () => {
  const [records] = useState<AttendanceRecord[]>(getAttendanceRecords());
  const [divisions] = useState<Division[]>(getDivisions());

  const [periodTab, setPeriodTab] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
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
                        <img
                          src={rec.photo}
                          alt={rec.employeeName}
                          className="w-8 h-8 rounded-full object-cover border"
                        />
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
