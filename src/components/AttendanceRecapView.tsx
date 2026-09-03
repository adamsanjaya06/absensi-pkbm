import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Database,
  Cloud,
  LogIn,
  LogOut,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { AttendanceRecord, Division } from '../types';
import {
  getAttendanceRecords,
  getDivisions,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  fetchAttendanceDirectlyFs,
  resetDemoAttendanceData,
} from '../lib/storage';
import { subscribeAttendance } from '../lib/firebaseService';
import { exportAttendanceToExcel, printAttendancePdfReport } from '../lib/exportUtils';
import { AttendancePhotoModal } from './AttendancePhotoModal';
import { Pagination } from './Pagination';

export const AttendanceRecapView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>(getAttendanceRecords());
  const [divisions] = useState<Division[]>(getDivisions());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  // Pagination State - default 50 records per page
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filter States
  const [periodTab, setPeriodTab] = useState<'harian' | 'mingguan' | 'bulanan' | 'semua'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Edit, Delete & Photo Modal States
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const todayStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Handle Period tab selection with automatic date range calculation
  const handleSelectPeriod = (tab: 'harian' | 'mingguan' | 'bulanan' | 'semua') => {
    setPeriodTab(tab);
    if (tab === 'semua') {
      setStartDate('');
      setEndDate('');
    } else if (tab === 'harian') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (tab === 'mingguan') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const weekAgoStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d);
      setStartDate(weekAgoStr);
      setEndDate(todayStr);
    } else if (tab === 'bulanan') {
      const d = new Date();
      d.setDate(1);
      const startMonthStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(d);
      setStartDate(startMonthStr);
      setEndDate(todayStr);
    }
  };

  const refreshData = async () => {
    setIsSyncing(true);
    setQuotaWarning(null);
    try {
      const cloudRecs = await fetchAttendanceDirectlyFs();
      if (cloudRecs && cloudRecs.length > 0) {
        setRecords(cloudRecs);
      } else {
        const localRecs = getAttendanceRecords();
        setRecords(localRecs);
      }
      setLastSyncTime(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }));
    } catch (err: any) {
      console.warn('Error fetching cloud attendance:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('Quota limit exceeded') || errMsg.includes('resource-exhausted')) {
        setQuotaWarning('Limit Kuota Harian Free-Tier Firestore tercapai (50k reads/hari). Menggunakan data lokal/cache.');
      }
      setRecords(getAttendanceRecords());
    } finally {
      setIsSyncing(false);
    }
  };

  // Realtime Cloud Synchronization
  useEffect(() => {
    // 1. Initial fetch
    refreshData();

    // 2. Realtime listener for attendance updates across all users
    const unsub = subscribeAttendance((newRecs) => {
      if (newRecs && newRecs.length > 0) {
        setRecords(newRecs);
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }));
      }
    });

    // 3. Listen to window event for local state changes
    const handleLocalUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setRecords(e.detail);
      }
    };
    window.addEventListener('absensi_attendance_updated', handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener('absensi_attendance_updated', handleLocalUpdate);
    };
  }, []);

  // Filter records based on criteria with synchronized Type and Period filters
  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nik.toLowerCase().includes(searchQuery.toLowerCase());

    const matchDiv = divisionFilter === 'ALL' || r.divisionName === divisionFilter;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

    // Synchronized Type matching
    const recType = (r.type || 'masuk').toLowerCase();
    const matchType =
      typeFilter === 'ALL' ||
      recType === typeFilter ||
      (typeFilter === 'masuk' && recType.includes('masuk')) ||
      (typeFilter === 'pulang' && recType.includes('pulang'));

    // Date range filtering
    const matchDate =
      (!startDate || r.date >= startDate) &&
      (!endDate || r.date <= endDate);

    return matchSearch && matchDiv && matchStatus && matchType && matchDate;
  });

  // Reset pagination to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, divisionFilter, statusFilter, typeFilter, periodTab, startDate, endDate]);

  // Paginated records computation (default 50 items per page)
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

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

  // Reset to Demo Data
  const handleResetDemoData = () => {
    if (confirm('Muat ulang data contoh absensi lengkap? Data lokal akan diperbarui dengan data presensi masuk & pulang.')) {
      const fresh = resetDemoAttendanceData();
      setRecords(fresh);
    }
  };

  // Overall counts for buttons
  const allTotalCount = records.length;
  const allMasukCount = records.filter((r) => (r.type || 'masuk').toLowerCase() === 'masuk').length;
  const allPulangCount = records.filter((r) => (r.type || '').toLowerCase() === 'pulang').length;

  // Filtered counts for badges
  const totalCount = filteredRecords.length;
  const masukCount = filteredRecords.filter((r) => (r.type || 'masuk').toLowerCase() === 'masuk').length;
  const pulangCount = filteredRecords.filter((r) => (r.type || '').toLowerCase() === 'pulang').length;
  const successCount = filteredRecords.filter((r) => r.status === 'berhasil').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'berhasil' && (r.keterangan || '').includes('Terlambat')).length;
  const failedCount = filteredRecords.filter((r) => r.status === 'gagal').length;

  const handleExportExcel = () => {
    exportAttendanceToExcel(filteredRecords, `Rekap_Absensi_${typeFilter}_${periodTab.toUpperCase()}`);
  };

  const handlePrintPdf = () => {
    printAttendancePdfReport(
      filteredRecords,
      `Laporan Absensi Karyawan Realtime Cloud`,
      `Pilihan Jenis: ${typeFilter === 'ALL' ? 'Semua Presensi' : typeFilter === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'} | Periode ${periodTab.toUpperCase()} | Total Data: ${filteredRecords.length}`
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
            Laporan kehadiran harian, mingguan, dan bulanan dengan filter Absen Masuk/Pulang, Ekspor Excel & Cetak PDF
          </p>
        </div>

        {/* Export & Cloud Sync Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshData}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl shadow-md border border-cyan-500/30 transition active:scale-95 disabled:opacity-60"
            title="Tarik data absensi terbaru dari Cloud Firestore"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Cloud'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl transition active:scale-95 cursor-pointer"
            title="Muat ulang data contoh absensi lengkap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Muat Data Demo</span>
          </button>
        </div>
      </div>

      {/* Cloud & Storage Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold">Status Penyimpanan:</span>
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {records.length} total riwayat absensi aktif ({allMasukCount} Masuk, {allPulangCount} Pulang)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {quotaWarning && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
              <AlertTriangle className="w-3 h-3" />
              Mode Offline / Kuota Free Terpenuhi
            </span>
          )}
          {lastSyncTime && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Sinkron Terakhir: {lastSyncTime} WIB
            </span>
          )}
        </div>
      </div>

      {/* Filter Toolbar & Synchronized Tabs */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* ROW 1: SYNCHRONIZED TABS UNTUK PILIHAN JENIS ABSENSI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Filter Jenis Absensi (Tersinkronisasi)
            </span>
            <span className="text-[11px] text-slate-400">
              Pilihan tab otomatis terhubung dengan dropdown filter
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
            {/* Tab 1: Semua Jenis */}
            <button
              type="button"
              id="filter-tab-semua"
              onClick={() => setTypeFilter('ALL')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Jenis</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                typeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {allTotalCount}
              </span>
            </button>

            {/* Tab 2: Absen Masuk */}
            <button
              type="button"
              id="filter-tab-masuk"
              onClick={() => setTypeFilter('masuk')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs cursor-pointer ${
                typeFilter === 'masuk'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Absen Masuk</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                typeFilter === 'masuk' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {allMasukCount}
              </span>
            </button>

            {/* Tab 3: Absen Pulang */}
            <button
              type="button"
              id="filter-tab-pulang"
              onClick={() => setTypeFilter('pulang')}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs cursor-pointer ${
                typeFilter === 'pulang'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Absen Pulang</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                typeFilter === 'pulang' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {allPulangCount}
              </span>
            </button>
          </div>
        </div>

        {/* ROW 2: PERIODE WAKTU TABS */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap hidden sm:inline mr-1">
            Periode:
          </span>
          <button
            type="button"
            onClick={() => handleSelectPeriod('semua')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              periodTab === 'semua'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Waktu
          </button>
          <button
            type="button"
            onClick={() => handleSelectPeriod('harian')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              periodTab === 'harian'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handleSelectPeriod('mingguan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              periodTab === 'mingguan'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => handleSelectPeriod('bulanan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              periodTab === 'bulanan'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Bulan Ini
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Search Name/NIK */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Nama / NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Jenis Presensi Dropdown: Synchronized with Tabs above */}
          <div>
            <select
              id="filter-rekap-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                typeFilter !== 'ALL'
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/30'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
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

          {/* Division Filter */}
          <div>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodTab('semua');
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title="Dari Tanggal"
            />
          </div>

          {/* Date Picker End */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodTab('semua');
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              title="Sampai Tanggal"
            />
          </div>
        </div>

        {/* Active Filter Indicator & Quick Reset Button */}
        {(searchQuery.trim() !== '' || divisionFilter !== 'ALL' || statusFilter !== 'ALL' || typeFilter !== 'ALL' || startDate || endDate || periodTab !== 'semua') && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1 px-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-blue-900 dark:text-blue-300">
              <span className="font-semibold text-[11px]">Filter Aktif:</span>
              {typeFilter !== 'ALL' && (
                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                  typeFilter === 'masuk' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  Jenis: {typeFilter === 'masuk' ? 'Absen Masuk' : 'Absen Pulang'}
                </span>
              )}
              {divisionFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-medium text-[10px]">
                  Divisi: {divisionFilter}
                </span>
              )}
              {statusFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-medium text-[10px]">
                  Status: {statusFilter}
                </span>
              )}
              {(startDate || endDate) && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-medium text-[10px]">
                  Rentang: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
                </span>
              )}
              {searchQuery.trim() && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 font-medium text-[10px]">
                  Cari: "{searchQuery}"
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('ALL');
                setDivisionFilter('ALL');
                setStatusFilter('ALL');
                setPeriodTab('semua');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        )}

        {/* Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Presensi</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{totalCount} Record</span>
          </div>

          <div className={`p-3 rounded-xl border text-xs transition ${
            typeFilter === 'masuk'
              ? 'bg-emerald-100/70 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
          }`}>
            <span className="text-emerald-700 dark:text-emerald-300 block text-[10px] font-semibold uppercase">Absen Masuk</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{masukCount} Record</span>
          </div>

          <div className={`p-3 rounded-xl border text-xs transition ${
            typeFilter === 'pulang'
              ? 'bg-amber-100/70 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
          }`}>
            <span className="text-amber-700 dark:text-amber-300 block text-[10px] font-semibold uppercase">Absen Pulang</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">{pulangCount} Record</span>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
            <span className="text-blue-700 dark:text-blue-300 block text-[10px] font-semibold uppercase">Tepat Waktu</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{successCount - lateCount} Record</span>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-900 text-xs">
            <span className="text-orange-700 dark:text-orange-300 block text-[10px] font-semibold uppercase">Terlambat</span>
            <span className="text-lg font-black text-orange-600 dark:text-orange-400">{lateCount} Record</span>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs">
            <span className="text-rose-700 dark:text-rose-300 block text-[10px] font-semibold uppercase">Gagal / Ditolak</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">{failedCount} Record</span>
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
                paginatedRecords.map((rec) => (
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
                          {rec.photo ? (
                            <img
                              src={rec.photo}
                              alt={rec.employeeName}
                              className="w-9 h-9 rounded-full object-cover group-hover:scale-110 transition duration-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-slate-700">
                              {rec.employeeName ? rec.employeeName.charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}
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

        {/* Pagination Menu - 50 data per halaman */}
        <Pagination
          currentPage={safeCurrentPage}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[25, 50, 100, 200]}
        />
      </div>

      {/* MODAL EDIT ABSENSI */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {editingRecord.photo ? (
                  <img
                    src={editingRecord.photo}
                    alt={editingRecord.employeeName}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-sm border border-blue-200 dark:border-blue-800">
                    {editingRecord.employeeName ? editingRecord.employeeName.charAt(0).toUpperCase() : 'P'}
                  </div>
                )}
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
