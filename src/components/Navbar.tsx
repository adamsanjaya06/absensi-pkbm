import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  User,
  LogOut,
  Sun,
  Moon,
  Users,
  Building2,
  MapPin,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { User as UserType } from '../types';
import { getServerTimeRealtime } from '../lib/storage';

interface NavbarProps {
  currentUser: UserType;
  onSelectRoleDemo: () => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSelectRoleDemo,
  onLogout,
  theme,
  onToggleTheme,
  activeTab,
  onChangeTab,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const [serverClock, setServerClock] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      getServerTimeRealtime().then((st) => setServerClock(st.serverTime));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div
              onClick={() => onChangeTab(currentUser.role === 'admin' ? 'dashboard' : 'absen')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                A
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight block leading-none">
                  AbsenPro
                </span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400 block font-semibold">
                  {currentUser.role === 'admin' ? 'Admin Portal' : 'Karyawan Portal'}
                </span>
              </div>
            </div>
          </div>

          {/* Realtime Anti-Tamper Server Time Badge & Server Online Pill */}
          <div className="hidden md:flex items-center gap-4">
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SERVER ONLINE
            </span>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                Waktu Server
              </p>
              <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {serverClock || '08:45:12'} WIB
              </p>
            </div>
          </div>

          {/* User Controls & Logout */}
          <div className="flex items-center gap-3">
            {/* Dark/Light Mode Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
              title="Ganti Mode Gelap / Terang"
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* User Profile Info Card */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      currentUser.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                    {currentUser.role === 'admin' ? 'SUPER ADMIN' : currentUser.positionName || 'KARYAWAN'}
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
                title="Keluar / Logout System"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
