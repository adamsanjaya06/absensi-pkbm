import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck, RefreshCw, X, CheckCircle2, AlertCircle, Lock, Eye, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { extractFaceDescriptorWithDetection, drawFaceHudOverlay, DetailedFaceAnalysis } from '../lib/faceAI';
import { saveUser } from '../lib/storage';

interface ReRegisterFaceModalProps {
  isOpen: boolean;
  user: UserType;
  onClose: () => void;
  onSuccess: (updatedUser: UserType) => void;
}

export const ReRegisterFaceModal: React.FC<ReRegisterFaceModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hudStatus, setHudStatus] = useState<'scanning' | 'success' | 'failed' | 'idle'>('scanning');
  const [statusMessage, setStatusMessage] = useState<string>('Posisikan wajah & mata tepat pada lingkaran panduan.');
  const [qualityMetrics, setQualityMetrics] = useState<DetailedFaceAnalysis['quality'] | null>(null);

  // Stream binder
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isOpen]);

  const startCamera = async () => {
    if (user.faceRegistered) return;
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
      } catch (e1) {
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
      setCameraError('Kamera tidak dapat diakses. Mohon beri izin akses kamera di browser Anda.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setCameraError(null);
    setHudStatus('scanning');
    setIsScanning(false);
    setQualityMetrics(null);
    setStatusMessage('Posisikan wajah & mata tepat pada lingkaran panduan retikel.');

    if (!user.faceRegistered) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, user.faceRegistered]);

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

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    onClose();
  };

  const handleScanAndRegisterFace = async () => {
    if (!videoRef.current) {
      alert('Kamera belum siap.');
      return;
    }

    setIsScanning(true);
    setHudStatus('scanning');
    setQualityMetrics(null);
    setStatusMessage('Ekstraksi Vektor Retina AI & Landmank Wajah sedang berlangsung...');

    setTimeout(() => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = videoRef.current?.videoWidth || 640;
      canvas.height = videoRef.current?.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Extract 128-dimensional high-precision facial feature vector
        const analysis = extractFaceDescriptorWithDetection(canvas);
        const { descriptor: newDescriptor, detected, reason, quality } = analysis;

        setQualityMetrics(quality);

        if (!detected) {
          setHudStatus('failed');
          setIsScanning(false);
          setStatusMessage(reason || 'Wajah tidak terdeteksi pada kamera. Posisikan wajah Anda tepat di dalam area panduan.');
          return;
        }

        // Strict Registration Baseline Quality Assessment
        if (quality.ocularScore < 0.22) {
          setHudStatus('failed');
          setIsScanning(false);
          setStatusMessage('Registrasi Ditolak: Area retina / mata kurang jelas. Mohon buka mata dengan jelas & tatap lurus ke kamera.');
          return;
        }

        if (quality.symmetryScore < 0.35) {
          setHudStatus('failed');
          setIsScanning(false);
          setStatusMessage('Registrasi Ditolak: Posisi wajah miring / tidak simetris. Hadapkan wajah lurus tepat ke kamera.');
          return;
        }

        const updatedUser: UserType = {
          ...user,
          faceDescriptor: newDescriptor,
          faceRegistered: true,
          photoUrl: photoDataUrl || user.photoUrl,
        };

        // Save to storage & trigger callback
        saveUser(updatedUser);
        setHudStatus('success');
        setStatusMessage('Registrasi Biometrik Berhasil! Vektor 128-D Sempurna disimpan sebagai data rujukan.');

        setTimeout(() => {
          setIsScanning(false);
          onSuccess(updatedUser);
          handleClose();
        }, 1800);
      } else {
        setHudStatus('failed');
        setIsScanning(false);
        setStatusMessage('Gagal mengambil gambar dari kamera.');
      }
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${user.faceRegistered ? 'bg-emerald-600' : 'bg-purple-600'}`}>
              {user.faceRegistered ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {user.faceRegistered ? 'Biometrik Wajah Terkunci' : 'Pendaftaran Biometrik Wajah AI'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.faceRegistered ? 'Registrasi Permanen (1x Saja)' : 'Vektor Rujukan Sempurna untuk Verifikasi Absen'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If face is already registered, show locked view */}
        {user.faceRegistered ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Registrasi Wajah AI Sudah Terkunci</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Setiap akun karyawan hanya diperbolehkan melakukan registrasi biometrik wajah <span className="font-bold text-emerald-600 dark:text-emerald-400">1 (satu) kali</span> dan tidak dapat diubah atau diganti.
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 text-left space-y-1">
              <p className="font-bold">✓ Status: Vektor Biometrik AI Aktif & Permanen</p>
              <p className="opacity-90">Vektor 128-D ini digunakan sebagai acuan otomatis untuk verifikasi Absen Masuk dan Absen Pulang.</p>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              Mengerti & Tutup
            </button>
          </div>
        ) : (
          <>
            {/* Camera View Area */}
            <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-rose-400">
                  <AlertCircle className="w-10 h-10 mb-2" />
                  <p className="text-xs font-semibold">{cameraError}</p>
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
                  <canvas
                    ref={hudCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
                  />

                  {/* Feature indicators badge on video */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-center px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-lg text-[10px] text-slate-200 border border-white/10">
                    <span className="flex items-center gap-1 font-semibold text-purple-300">
                      <Eye className="w-3.5 h-3.5" /> Retikel Retina & Mata Active
                    </span>
                    <span className="flex items-center gap-1 font-mono text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> 128-D Vector Mode
                    </span>
                  </div>
                </>
              )}

              {/* Hidden Canvas for Frame Snapshots */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Quality Metrics Breakdown */}
            {qualityMetrics && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                <p className="font-bold text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <span>Analisis Biometrik Rujukan:</span>
                  <span className="text-[10px] font-normal text-purple-600 dark:text-purple-400">Kualitas Vektor</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>Retina & Mata:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(qualityMetrics.ocularScore * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Simetri Wajah:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.round(qualityMetrics.symmetryScore * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Kontur & Edge:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(qualityMetrics.edgeDensity * 1000)} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pencahayaan:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {Math.round(qualityMetrics.brightness * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Status Box */}
            <div className={`p-3 rounded-xl border text-center ${
              hudStatus === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : hudStatus === 'failed'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}>
              <p className="text-xs font-semibold leading-relaxed">{statusMessage}</p>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleScanAndRegisterFace}
                disabled={isScanning || !!cameraError}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak Vektor AI...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Pindai & Simpan Vektor Wajah Sempurna</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
