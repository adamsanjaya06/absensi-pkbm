import React from 'react';
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
} from 'lucide-react';
import { User as UserType } from '../types';

interface SidebarProps {
  currentUser: UserType;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onChangeTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const isAdmin = currentUser.role === 'admin';

  const adminNavs = [
    { id: 'dashboard', label: 'Dashboard Main', icon: LayoutDashboard },
    { id: 'roles', label: 'Konfigurasi Role & Akses', icon: ShieldCheck },
    { id: 'karyawan', label: 'Master Karyawan', icon: Users },
    { id: 'divisi', label: 'Master Divisi', icon: Building2 },
    { id: 'jabatan', label: 'Master Jabatan', icon: Briefcase },
    { id: 'lokasi', label: 'Pengaturan Kantor & GPS', icon: MapPin },
    { id: 'rekap', label: 'Rekap Absensi & Laporan', icon: FileSpreadsheet },
  ];

  const employeeNavs = [
    { id: 'absen', label: 'Absen Masuk / Pulang', icon: Camera },
    { id: 'riwayat', label: 'Riwayat Absensi Saya', icon: History },
    { id: 'profil', label: 'Profil & Register Wajah', icon: User },
  ];

  const currentNavs = isAdmin ? adminNavs : employeeNavs;

  const handleSelect = (tabId: string) => {
    onChangeTab(tabId);
    onCloseMobile();
  };

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
        <div>
          {/* Section Header */}
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAdmin ? 'Menu Administrasi' : 'Portal Karyawan'}
          </div>

          <nav className="space-y-1 mt-1">
            {currentNavs.map((nav) => {
              const Icon = nav.icon;
              const isActive = activeTab === nav.id;

              return (
                <button
                  key={nav.id}
                  onClick={() => handleSelect(nav.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg font-medium text-xs transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{nav.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card at Sidebar Bottom */}
        <div className="pt-4 border-t border-slate-800">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                NIK: {currentUser.nik}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
