import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  MapPin,
  FileSpreadsheet,
  Camera,
  History,
  User,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { User as UserType } from '../types';
import { getUserEffectiveMenus } from '../lib/storage';

interface SidebarProps {
  currentUser: UserType;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'operasional' | 'laporan' | 'master' | 'sistem';
  categoryLabel: string;
}

const ALL_SIDEBAR_NAVS: NavItemDef[] = [
  // Operasional Karyawan
  { id: 'absen', label: 'Absen Masuk / Pulang', icon: Camera, category: 'operasional', categoryLabel: 'Operasional' },
  { id: 'riwayat', label: 'Rekap Absensi Saya', icon: History, category: 'operasional', categoryLabel: 'Operasional' },
  { id: 'profil', label: 'Profil & Register Wajah', icon: User, category: 'operasional', categoryLabel: 'Operasional' },

  // Monitoring & Laporan
  { id: 'dashboard', label: 'Dashboard Main', icon: LayoutDashboard, category: 'laporan', categoryLabel: 'Analisis & Laporan' },
  { id: 'rekap', label: 'Rekap Absensi & Laporan', icon: FileSpreadsheet, category: 'laporan', categoryLabel: 'Analisis & Laporan' },

  // Master Data
  { id: 'karyawan', label: 'Master Karyawan', icon: Users, category: 'master', categoryLabel: 'Data Master' },
  { id: 'divisi', label: 'Master Divisi', icon: Building2, category: 'master', categoryLabel: 'Data Master' },
  { id: 'jabatan', label: 'Master Jabatan', icon: Briefcase, category: 'master', categoryLabel: 'Data Master' },

  // Sistem & Keamanan
  { id: 'lokasi', label: 'Pengaturan Kantor & GPS', icon: MapPin, category: 'sistem', categoryLabel: 'Konfigurasi Sistem' },
  { id: 'roles', label: 'Konfigurasi Role & Hak Akses', icon: ShieldCheck, category: 'sistem', categoryLabel: 'Konfigurasi Sistem' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onChangeTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [effectiveMenus, setEffectiveMenus] = useState<string[]>(() =>
    getUserEffectiveMenus(currentUser)
  );

  useEffect(() => {
    setEffectiveMenus(getUserEffectiveMenus(currentUser));

    const handleUpdate = () => {
      setEffectiveMenus(getUserEffectiveMenus(currentUser));
    };

    window.addEventListener('absensi_permissions_updated', handleUpdate);
    window.addEventListener('absensi_users_updated', handleUpdate);

    return () => {
      window.removeEventListener('absensi_permissions_updated', handleUpdate);
      window.removeEventListener('absensi_users_updated', handleUpdate);
    };
  }, [currentUser]);

  // Filter navigation items by active user permissions
  const visibleNavs = ALL_SIDEBAR_NAVS.filter((nav) =>
    effectiveMenus.includes(nav.id)
  );

  const handleSelect = (tabId: string) => {
    onChangeTab(tabId);
    onCloseMobile();
  };

  const isCustom = currentUser.hasCustomPermissions && currentUser.allowedMenus && currentUser.allowedMenus.length > 0;

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-16 left-0 z-30 w-64 h-[calc(100vh-4rem)] bg-slate-900 text-white border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col justify-between p-4 overflow-y-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          {/* Header section with active permission info */}
          <div className="flex items-center justify-between px-3 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigasi Hak Akses
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                isCustom
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {isCustom ? 'Akses Kustom' : currentUser.role === 'admin' ? 'Role Admin' : 'Role Karyawan'}
            </span>
          </div>

          <nav className="space-y-1">
            {visibleNavs.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-800/50 rounded-xl">
                Tidak ada menu yang diizinkan untuk akun ini. Hubungi administrator.
              </div>
            ) : (
              visibleNavs.map((nav) => {
                const Icon = nav.icon;
                const isActive = activeTab === nav.id;

                return (
                  <button
                    key={nav.id}
                    id={`sidebar-nav-${nav.id}`}
                    onClick={() => handleSelect(nav.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{nav.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80 shrink-0" />}
                  </button>
                );
              })
            )}
          </nav>
        </div>

        {/* User Card & Active Permissions indicator at Sidebar Bottom */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="relative">
              {currentUser.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-600"
                />
              ) : (
                <div className="w-9 h-9 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-bold text-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              {currentUser.role === 'admin' ? (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-slate-900" />
              ) : (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentUser.name}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="capitalize">{currentUser.role}</span>
                <span>•</span>
                <span className="text-blue-400 font-semibold">{visibleNavs.length} Menu Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
