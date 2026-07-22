import React, { useEffect, useRef, useState } from 'react';
import { Camera, ShieldCheck, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { extractFaceDescriptorFromCanvas, drawFaceHudOverlay } from '../lib/faceAI';
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
  const [statusMessage, setStatusMessage] = useState<string>('Posisikan wajah Anda tepat di dalam lingkaran.');

  // Stream binder
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isOpen]);

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
    setStatusMessage('Posisikan wajah Anda tepat di dalam area panduan.');

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

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
    setStatusMessage('Pindai AI sedang menganalisis titik biomekanik wajah...');

    setTimeout(() => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = videoRef.current?.videoWidth || 640;
      canvas.height = videoRef.current?.videoHeight || 480;
      const ctx = canvas.getContext('2d');

      if (ctx && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Extract 16-dimensional facial feature vector descriptor
        const newDescriptor = extractFaceDescriptorFromCanvas(canvas);

        const updatedUser: UserType = {
          ...user,
          faceDescriptor: newDescriptor,
          faceRegistered: true,
          photoUrl: photoDataUrl || user.photoUrl,
        };

        // Save to storage & trigger callback
        saveUser(updatedUser);
        setHudStatus('success');
        setStatusMessage('Registrasi Wajah AI Berhasil! Vektor fitur disimpan.');

        setTimeout(() => {
          setIsScanning(false);
          onSuccess(updatedUser);
          handleClose();
        }, 1500);
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
            <div className="p-2 bg-purple-600 rounded-xl text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {user.faceRegistered ? 'Registrasi Ulang Wajah AI' : 'Pendaftaran Wajah AI'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifikasi Kamera Biometrik Karyawan</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            </>
          )}

          {/* Hidden Canvas for Frame Snapshots */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status Box */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{statusMessage}</p>
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
                <span>Memindai Wajah...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Simpan Rekaman Wajah AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
