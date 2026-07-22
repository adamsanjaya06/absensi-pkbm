import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Clock,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { User as UserType } from '../types';
import { getUsers, getServerTimeRealtime } from '../lib/storage';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [serverClock, setServerClock] = useState<string>('');
  const [serverDate, setServerDate] = useState<string>('');

  // Live Server Clock in Asia/Jakarta (WIB)
  useEffect(() => {
    const updateClock = () => {
      getServerTimeRealtime().then((st) => {
        setServerClock(st.serverTime);
        setServerDate(st.serverDate);
      });
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const users = getUsers();
    const cleanUser = username.trim().toLowerCase();

    const matched = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUser) ||
        u.nik.toLowerCase() === cleanUser ||
        u.email.toLowerCase() === cleanUser
    );

    if (!matched) {
      setErrorMsg('Username / NIK / Email tidak ditemukan. Silakan periksa kembali kredensial Anda.');
      return;
    }

    if (matched.password && matched.password !== password) {
      setErrorMsg('Password yang Anda masukkan salah. Gunakan password yang sesuai.');
      return;
    }

    if (matched.status === 'nonaktif') {
      setErrorMsg('Akun pengguna ini berada dalam status NON-AKTIF. Hubungi Administrator.');
      return;
    }

    // Success login
    onLoginSuccess(matched);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Grids & Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/20">
            A
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              AbsenPro <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-bold">PWA v2.0</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sistem Absensi Biometrik Wajah & Geofencing GPS Realtime
            </p>
          </div>
        </div>

        {/* Realtime Server Time Badge (Asia/Jakarta) */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>WAKTU SERVER JAKARTA (WIB)</span>
            </div>
            <div className="text-xs font-mono font-bold text-white">
              {serverDate ? `${serverDate} | ` : ''}{serverClock || '00:00:00'} WIB
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Center Body */}
      <main className="relative z-10 max-w-md w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold mb-3">
                <LogIn className="w-3.5 h-3.5" />
                <span>Portal Autentikasi Pengguna</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Selamat Datang
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Silakan masuk dengan akun username dan password sesuai role Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-2xl flex items-start gap-3 text-rose-200 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Username / NIK / Email Pengguna *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin / budi / EMP001"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Password Akun *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Ke Sistem Presensi</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500">
                Memiliki kendala login? Hubungi Administrator TI kantor Anda.
              </p>
            </div>
          </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 AbsenPro PWA. Sistem Absensi Online Geofencing GPS & Pengenalan Wajah AI.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Firebase Realtime Sync Active
          </span>
          <span>Waktu Server: Jakarta (WIB)</span>
        </div>
      </footer>
    </div>
  );
};
