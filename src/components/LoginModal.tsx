import React, { useState } from 'react';
import { ShieldCheck, User, Lock, LogIn, X, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { getUsers } from '../lib/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: UserType) => void;
  currentUser: UserType | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  currentUser,
}) => {
  const users = getUsers();
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginInput.trim()) {
      setErrorMsg('Username / NIK / Email wajib diisi!');
      return;
    }

    const term = loginInput.trim().toLowerCase();
    const found = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === term) ||
        u.email.toLowerCase() === term ||
        u.nik.toLowerCase() === term
    );

    if (!found) {
      setErrorMsg('Username, NIK, atau Email tidak terdaftar dalam sistem!');
      return;
    }

    // Verify Password if set on user record
    if (found.password && passwordInput && found.password !== passwordInput) {
      setErrorMsg('Password yang Anda masukkan salah!');
      return;
    }

    onSelectUser(found);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Login Sistem Absensi Karyawan
            </h3>
          </div>
          {currentUser && (
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Username / NIK / Email *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Masukkan Username / NIK / Email"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Masukkan Password Anda"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Ke Portal Absensi</span>
            </button>
          </form>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Masuk menggunakan username dan password resmi akun Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
