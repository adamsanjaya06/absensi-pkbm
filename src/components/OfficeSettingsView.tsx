import React, { useState } from 'react';
import { MapPin, Save, CheckCircle2, Navigation, Plus, Trash2, Edit2, Building, X } from 'lucide-react';
import { OfficeSettings, OfficeBranch } from '../types';
import { getOfficeSettings, saveOfficeSettings } from '../lib/storage';
import { InteractiveMap } from './InteractiveMap';

interface OfficeSettingsViewProps {
  onOfficeUpdated: (updated: OfficeSettings) => void;
}

export const OfficeSettingsView: React.FC<OfficeSettingsViewProps> = ({ onOfficeUpdated }) => {
  const [office, setOffice] = useState<OfficeSettings>(getOfficeSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Main HQ State
  const [officeName, setOfficeName] = useState(office.officeName);
  const [latitude, setLatitude] = useState(office.latitude);
  const [longitude, setLongitude] = useState(office.longitude);
  const [radiusMeters, setRadiusMeters] = useState(office.radiusMeters);
  const [address, setAddress] = useState(office.address);
  const [workStartTime, setWorkStartTime] = useState(office.workStartTime);
  const [workEndTime, setWorkEndTime] = useState(office.workEndTime);
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState(office.lateToleranceMinutes);

  // Branches State
  const [branches, setBranches] = useState<OfficeBranch[]>(office.branches || []);

  const ALL_DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const [workDays, setWorkDays] = useState<string[]>(
    office.workDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  );

  const handleToggleWorkDay = (day: string) => {
    if (workDays.includes(day)) {
      if (workDays.length === 1) {
        alert('Minimal harus ada 1 hari kerja operasional.');
        return;
      }
      setWorkDays(workDays.filter((d) => d !== day));
    } else {
      setWorkDays([...workDays, day]);
    }
  };

  // Modal Branch State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<OfficeBranch | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchLat, setBranchLat] = useState<number>(-6.2);
  const [branchLng, setBranchLng] = useState<number>(106.8);
  const [branchRadius, setBranchRadius] = useState<number>(100);
  const [branchAddress, setBranchAddress] = useState('');

  const handleUseCurrentGpsHQ = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
        },
        (err) => {
          alert('Gagal mengambil GPS: ' + err.message);
        }
      );
    }
  };

  const handleUseCurrentGpsBranch = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBranchLat(Number(pos.coords.latitude.toFixed(6)));
          setBranchLng(Number(pos.coords.longitude.toFixed(6)));
        },
        (err) => {
          alert('Gagal mengambil GPS: ' + err.message);
        }
      );
    }
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchLat(latitude + 0.01);
    setBranchLng(longitude + 0.01);
    setBranchRadius(100);
    setBranchAddress('');
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: OfficeBranch) => {
    setEditingBranch(b);
    setBranchName(b.officeName);
    setBranchLat(b.latitude);
    setBranchLng(b.longitude);
    setBranchRadius(b.radiusMeters);
    setBranchAddress(b.address);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList = [...branches];

    if (editingBranch) {
      updatedList = updatedList.map((b) =>
        b.id === editingBranch.id
          ? {
              ...b,
              officeName: branchName,
              latitude: Number(branchLat),
              longitude: Number(branchLng),
              radiusMeters: Number(branchRadius),
              address: branchAddress,
            }
          : b
      );
    } else {
      const newB: OfficeBranch = {
        id: 'branch-' + Date.now(),
        officeName: branchName,
        latitude: Number(branchLat),
        longitude: Number(branchLng),
        radiusMeters: Number(branchRadius),
        address: branchAddress,
      };
      updatedList.push(newB);
    }

    setBranches(updatedList);
    setIsBranchModalOpen(false);

    // Save immediately
    const fullUpdated: OfficeSettings = {
      officeName,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters),
      address,
      workStartTime,
      workEndTime,
      lateToleranceMinutes: Number(lateToleranceMinutes),
      workDays,
      branches: updatedList,
    };
    saveOfficeSettings(fullUpdated);
    setOffice(fullUpdated);
    onOfficeUpdated(fullUpdated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteBranch = (id: string) => {
    if (confirm('Hapus lokasi cabang ini?')) {
      const updatedList = branches.filter((b) => b.id !== id);
      setBranches(updatedList);

      const fullUpdated: OfficeSettings = {
        officeName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radiusMeters: Number(radiusMeters),
        address,
        workStartTime,
        workEndTime,
        lateToleranceMinutes: Number(lateToleranceMinutes),
        workDays,
        branches: updatedList,
      };
      saveOfficeSettings(fullUpdated);
      setOffice(fullUpdated);
      onOfficeUpdated(fullUpdated);
    }
  };

  const handleSaveMain = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: OfficeSettings = {
      officeName,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: Number(radiusMeters),
      address,
      workStartTime,
      workEndTime,
      lateToleranceMinutes: Number(lateToleranceMinutes),
      workDays,
      branches,
    };

    saveOfficeSettings(updated);
    setOffice(updated);
    onOfficeUpdated(updated);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Pengaturan Kantor Pusat & Multi-Cabang GPS
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola lokasi kantor pusat serta lokasi cabang baru agar karyawan dapat melakukan absensi dari berbagai lokasi kantor resmi.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Berhasil Disimpan ke Firebase!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="space-y-6">
          <form
            onSubmit={handleSaveMain}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>🏢 Lokasi Kantor Pusat (Headquarters)</span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                UTAMA
              </span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nama Kantor Pusat *
              </label>
              <input
                type="text"
                required
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Latitude GPS *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Longitude GPS *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentGpsHQ}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Gunakan GPS Posisi Saya Saat Ini</span>
            </button>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Batas Radius Absensi Pusat
                </label>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {radiusMeters} Meter
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                step="10"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alamat Lengkap Kantor Pusat
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white pt-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              ⏰ Jam Kerja Operasional Perusahaan
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Masuk
                </label>
                <input
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jam Pulang
                </label>
                <input
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Toleransi (menit)
                </label>
                <input
                  type="number"
                  value={lateToleranceMinutes}
                  onChange={(e) => setLateToleranceMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Configurable Work Days */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                📅 Hari Kerja Operasional (Karyawan Bisa Mengisi Absen):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_DAYS.map((day) => {
                  const isChecked = workDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleWorkDay(day)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>{day}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                * Karyawan hanya diperbolehkan melakukan absensi pada hari-hari yang dicentang di atas.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Kantor Pusat & Jam Kerja</span>
              </button>
            </div>
          </form>

          {/* Additional Branches Management Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-purple-600" />
                  <span>Daftar Lokasi Cabang Tambahan ({branches.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Karyawan dapat melakukan absensi di seluruh lokasi cabang yang terdaftar.
                </p>
              </div>

              <button
                onClick={handleOpenAddBranch}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Cabang Baru</span>
              </button>
            </div>

            {branches.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Belum ada cabang tambahan. Klik tombol di atas untuk menambah lokasi cabang baru.
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{b.officeName}</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-md font-mono">
                          Radius {b.radiusMeters}m
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{b.address || 'Alamat belum diisi'}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        GPS: {b.latitude}, {b.longitude}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditBranch(b)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(b.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Geofence Preview Map */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Peta Sebaran Lokasi Pusat & Cabang</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pin biru = Kantor Pusat, Pin Ungu = Lokasi Cabang. Lingkaran adalah radius geofencing aktif.
            </p>
          </div>
          <InteractiveMap
            office={{
              officeName,
              latitude: Number(latitude),
              longitude: Number(longitude),
              radiusMeters: Number(radiusMeters),
              address,
              workStartTime,
              workEndTime,
              lateToleranceMinutes: Number(lateToleranceMinutes),
              branches,
            }}
            height="550px"
          />
        </div>
      </div>

      {/* Modal Add/Edit Branch */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingBranch ? 'Edit Lokasi Cabang' : 'Tambah Lokasi Cabang Baru'}
              </h3>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Cabang / Kantor *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cabang Surabaya, Cabang Bandung, Dll"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Latitude GPS *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={branchLat}
                    onChange={(e) => setBranchLat(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Longitude GPS *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={branchLng}
                    onChange={(e) => setBranchLng(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseCurrentGpsBranch}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Gunakan GPS Lokasi Saat Ini</span>
              </button>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold">Radius Geofence Cabang</label>
                  <span className="text-xs font-bold text-purple-600 font-mono">{branchRadius} Meter</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={branchRadius}
                  onChange={(e) => setBranchRadius(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Alamat Cabang</label>
                <textarea
                  rows={2}
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl">
                  Simpan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
