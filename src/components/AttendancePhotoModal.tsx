import React from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  User,
  Download,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord } from '../types';

interface AttendancePhotoModalProps {
  isOpen: boolean;
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const AttendancePhotoModal: React.FC<AttendancePhotoModalProps> = ({
  isOpen,
  record,
  onClose,
}) => {
  if (!isOpen || !record) return null;

  const handleDownload = () => {
    if (!record.photo) return;
    const link = document.createElement('a');
    link.href = record.photo;
    link.download = `Foto_Absen_${record.nik}_${record.date}_${record.type}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Bukti Foto Absensi AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {record.employeeName} — NIK: <span className="font-mono font-semibold">{record.nik}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              title="Unduh Foto Absen"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              title="Tutup Modal"
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Photo & Metadata */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Main Photo Enlarged View */}
          <div className="relative w-full aspect-[4/3] max-h-[50vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group">
            <img
              src={record.photo}
              alt={record.employeeName}
              className="w-full h-full object-contain bg-slate-950 transition-transform duration-300 group-hover:scale-105"
            />
            {/* Watermark Overlay */}
            <div className="absolute bottom-3 left-3 right-3 p-3 bg-slate-950/70 backdrop-blur-md rounded-xl border border-white/10 text-white flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-mono font-bold">{record.date}</span>
                <Clock className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                <span className="font-mono font-bold">{record.serverTime} WIB</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${
                  record.type === 'masuk'
                    ? 'bg-blue-500 text-white'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {record.type === 'masuk' ? 'ABSEN MASUK' : 'ABSEN PULANG'}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Status & Keterangan */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Status & Verification
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold text-[10px] uppercase ${
                    record.status === 'berhasil'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {record.status === 'berhasil' ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {record.status.toUpperCase()}
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  Match: {record.faceMatchScore}%
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                {record.keterangan}
              </p>
            </div>

            {/* Divisi & Jabatan */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Unit Kerja
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {record.divisionName}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Jabatan: <span className="font-semibold text-slate-700 dark:text-slate-300">{record.positionName}</span>
              </div>
              {record.branchName && (
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Cabang: {record.branchName}
                </div>
              )}
            </div>

            {/* Lokasi GPS & Alamat */}
            <div className="sm:col-span-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Lokasi Pemindaian Kamera & GPS</span>
                </div>
                <span className="font-mono text-slate-600 dark:text-slate-300">
                  Jarak Kantor: {record.distanceFromOfficeMeters} Meter
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium text-xs leading-relaxed">
                {record.address || 'Alamat lokasi tidak tersedia'}
              </p>
              <div className="font-mono text-[10px] text-slate-400">
                Koordinat: Lat {record.latitude.toFixed(6)}, Lng {record.longitude.toFixed(6)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
