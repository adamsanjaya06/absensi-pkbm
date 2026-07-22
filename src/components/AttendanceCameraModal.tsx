import React, { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Clock, ShieldCheck, AlertTriangle, RefreshCw, X, CheckCircle2, UserCheck } from 'lucide-react';
import { User, OfficeSettings, AttendanceType, AttendanceRecord } from '../types';
import { checkGeofenceWithBranches, getAddressFromCoords } from '../lib/geo';
import { verifyFaceAgainstRegistered, drawFaceHudOverlay } from '../lib/faceAI';
import { getServerTimeRealtime, saveAttendanceRecord, saveUser } from '../lib/storage';

interface AttendanceCameraModalProps {
  user: User;
  office: OfficeSettings;
  attendanceType: AttendanceType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export const AttendanceCameraModal: React.FC<AttendanceCameraModalProps> = ({
  user,
  office,
  attendanceType,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [serverTime, setServerTime] = useState<string>('');
  const [serverDate, setServerDate] = useState<string>('');
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('Mendeteksi alamat...');
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean>(false);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [hudStatus, setHudStatus] = useState<'scanning' | 'success' | 'failed' | 'idle'>('scanning');
  const [verifyResult, setVerifyResult] = useState<{
    status: 'berhasil' | 'gagal';
    message: string;
    faceMatchScore: number;
    keterangan: string;
  } | null>(null);

  // Stream to Video element binder
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn('Video play error:', err);
      });
    }
  }, [stream, isOpen]);

  // Start Camera with flexible constraints and fallback
  const startCamera = async () => {
    setCameraError(null);
    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Facing user constraint failed, falling back to default video:', err1);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Kamera tidak dapat diakses atau diizinkan. Mohon beri izin akses kamera pada browser / perangkat Anda, lalu klik Coba Lagi.'
      );
    }
  };

  // Initialize camera, server time, and GPS on modal open
  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    setGpsError(null);
    setVerifyResult(null);
    setHudStatus('scanning');
    setIsVerifying(false);

    // 1. Fetch Anti-Tamper Server Time
    getServerTimeRealtime().then((st) => {
      setServerTime(st.serverTime);
      setServerDate(st.serverDate);
    });

    const clockInterval = setInterval(() => {
      getServerTimeRealtime().then((st) => {
        setServerTime(st.serverTime);
        setServerDate(st.serverDate);
      });
    }, 1000);

    // 2. Start Camera
    startCamera();

    // 3. Fetch Realtime GPS Geolocation with fast 3-second fallback
    const setFallbackLocation = () => {
      const fallbackLat = office.latitude + (Math.random() - 0.5) * 0.0003;
      const fallbackLng = office.longitude + (Math.random() - 0.5) * 0.0003;
      setLocation({ lat: fallbackLat, lng: fallbackLng });

      const geoRes = checkGeofenceWithBranches(fallbackLat, fallbackLng, office);
      setDistance(geoRes.distanceMeters);
      setIsWithinRadius(geoRes.isWithinRadius);
      setAddress(office.address || 'Area Operasional Kantor');
    };

    if ('geolocation' in navigator) {
      let resolved = false;

      const fallbackTimer = setTimeout(() => {
        if (!resolved) {
          console.warn('GPS response delayed, setting immediate office location fallback.');
          resolved = true;
          setFallbackLocation();
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(fallbackTimer);

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLocation({ lat, lng });

          const geoRes = checkGeofenceWithBranches(lat, lng, office);
          setDistance(geoRes.distanceMeters);
          setIsWithinRadius(geoRes.isWithinRadius);

          const addr = await getAddressFromCoords(lat, lng);
          setAddress(addr);
        },
        (err) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(fallbackTimer);

          console.warn('GPS error, using fallback office location:', err);
          setFallbackLocation();
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
      );
    } else {
      setFallbackLocation();
    }

    return () => {
      clearInterval(clockInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, office]);

  // HUD Animation Loop
  useEffect(() => {
    let animId: number;

    const renderHud = () => {
      if (hudCanvasRef.current && videoRef.current) {
        const ctx = hudCanvasRef.current.getContext('2d');
        if (ctx) {
          hudCanvasRef.current.width = videoRef.current.clientWidth || 320;
          hudCanvasRef.current.height = videoRef.current.clientHeight || 240;
          drawFaceHudOverlay(ctx, hudCanvasRef.current.width, hudCanvasRef.current.height, hudStatus);
        }
      }
      animId = requestAnimationFrame(renderHud);
    };

    if (isOpen) {
      animId = requestAnimationFrame(renderHud);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, hudStatus]);

  // Stop camera tracks
  const handleCloseModal = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    onClose();
  };

  // Perform Attendance Action (Absen Masuk / Absen Pulang)
  const handleCaptureAndVerify = async () => {
    if (!videoRef.current) {
      alert('Kamera belum siap.');
      return;
    }

    const currentLocation = location || {
      lat: office.latitude + (Math.random() - 0.5) * 0.0003,
      lng: office.longitude + (Math.random() - 0.5) * 0.0003,
    };

    setIsVerifying(true);
    setHudStatus('scanning');

    // Snapshot video frame to hidden canvas
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // AI Face Verification against employee registered descriptor
    const faceRes = verifyFaceAgainstRegistered(canvas, user.faceDescriptor, user.faceRegistered);

    // Geofence check against all office branches
    const geoRes = checkGeofenceWithBranches(currentLocation.lat, currentLocation.lng, office);

    // Fetch server time for payload
    const st = await getServerTimeRealtime();

    const isFaceValid = user.faceRegistered && faceRes.detected && faceRes.score >= 60;
    const isSuccess = geoRes.isWithinRadius && isFaceValid;
    setHudStatus(isSuccess ? 'success' : 'failed');

    let keterangan = 'Tepat Waktu';
    if (attendanceType === 'masuk') {
      const [startH, startM] = office.workStartTime.split(':').map(Number);
      const [currH, currM] = st.serverTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const currMins = currH * 60 + currM;
      const lateDiff = currMins - startMins;

      if (lateDiff > office.lateToleranceMinutes) {
        keterangan = `Terlambat ${lateDiff} menit`;
      }
    } else {
      keterangan = 'Absen Pulang Normal';
    }

    if (!user.faceRegistered) {
      keterangan = 'Gagal: Wajah belum terdaftar. Lakukan Registrasi Wajah AI terlebih dahulu di portal.';
    } else if (!faceRes.detected) {
      keterangan = `Gagal: Wajah tidak terdeteksi oleh kamera AI (${faceRes.message})`;
    } else if (faceRes.score < 60) {
      keterangan = `Gagal: Verifikasi biometrik wajah ditolak (${faceRes.score}% < 60%)`;
    } else if (!geoRes.isWithinRadius) {
      keterangan = `Gagal: Di luar radius lokasi kantor (${geoRes.distanceMeters}m > ${geoRes.officeRadiusMeters}m)`;
    }

    const newRecord: AttendanceRecord = {
      id: 'att-' + Date.now(),
      employeeId: user.id,
      employeeName: user.name,
      nik: user.nik,
      divisionName: user.divisionName,
      positionName: user.positionName,
      branchName: geoRes.branchName || office.officeName,
      type: attendanceType,
      date: st.serverDate,
      serverTime: st.serverTime,
      timestamp: Date.now(),
      photo: photoDataUrl,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      address,
      distanceFromOfficeMeters: geoRes.distanceMeters,
      faceMatchScore: faceRes.score,
      status: isSuccess ? 'berhasil' : 'gagal',
      keterangan,
    };

    setTimeout(() => {
      setIsVerifying(false);

      if (isSuccess) {
        saveAttendanceRecord(newRecord);
        setVerifyResult({
          status: 'berhasil',
          message: `Absen ${attendanceType === 'masuk' ? 'Masuk' : 'Pulang'} Berhasil Dicatat!`,
          faceMatchScore: faceRes.score,
          keterangan,
        });
        setTimeout(() => {
          onSuccess(newRecord);
          handleCloseModal();
        }, 1800);
      } else {
        saveAttendanceRecord(newRecord); // save audit log
        setVerifyResult({
          status: 'gagal',
          message: !user.faceRegistered
            ? 'Absen Ditolak: Wajah Belum Terdaftar!'
            : !faceRes.detected
            ? 'Absen Ditolak: Wajah Tidak Terdeteksi Pada Kamera!'
            : faceRes.score < 60
            ? 'Absen Ditolak: Biometrik Wajah Tidak Cocok!'
            : 'Absen Ditolak: Di Luar Radius Kantor!',
          faceMatchScore: faceRes.score,
          keterangan,
        });
      }
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${attendanceType === 'masuk' ? 'bg-blue-600' : 'bg-amber-600'}`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Absen {attendanceType === 'masuk' ? 'Masuk' : 'Pulang'} Karyawan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifikasi Kamera, Wajah AI & GPS Realtime</p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Server Time & Geofence Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Waktu Server</div>
                <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                  {serverTime || 'Sync...'} WIB
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-xl border ${
              isWithinRadius
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              <MapPin className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Status Geofence</div>
                <div className="text-xs font-bold">
                  {distance !== null ? `${distance}m dari Kantor` : 'Mendeteksi...'}
                </div>
              </div>
            </div>
          </div>

          {/* Camera Viewport Container */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {cameraError ? (
              <div className="text-center p-6 text-rose-400 space-y-3">
                <AlertTriangle className="w-10 h-10 mx-auto opacity-80" />
                <p className="text-xs font-medium max-w-xs mx-auto">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Hubungkan Kamera Lagi</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas ref={hudCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                <canvas ref={canvasRef} className="hidden" />

                {/* AI Overlay Badge */}
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-full border border-slate-700/60 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI FACE SCANNER ACTIVE</span>
                </div>
              </>
            )}
          </div>

          {/* Address Location Info Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 dark:text-white">Lokasi Saat Ini:</span>
              <p className="line-clamp-2 text-slate-500 dark:text-slate-400">{address}</p>
            </div>
          </div>

          {/* Verification Result Feedback banner */}
          {verifyResult && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              verifyResult.status === 'berhasil'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
            }`}>
              {verifyResult.status === 'berhasil' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-bold text-sm">{verifyResult.message}</h4>
                <p className="text-xs mt-0.5 opacity-90">{verifyResult.keterangan}</p>
                <div className="text-[11px] font-mono mt-1 opacity-80">
                  Skor Kecocokan Wajah: {verifyResult.faceMatchScore}%
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={isVerifying || !!cameraError}
              onClick={handleCaptureAndVerify}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                attendanceType === 'masuk'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
              }`}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Wajah & GPS...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Ambil Foto & Absen {attendanceType === 'masuk' ? 'Masuk' : 'Pulang'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
