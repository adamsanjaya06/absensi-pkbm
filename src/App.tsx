import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { User, OfficeSettings } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getOfficeSettings,
  initializeStorage,
  setupRealtimeFirebaseSync,
  getUserEffectiveMenus,
  getUsers,
} from './lib/storage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardAdmin } from './components/DashboardAdmin';
import { RoleUserConfigView } from './components/RoleUserConfigView';
import { EmployeeMasterView } from './components/EmployeeMasterView';
import { DivisionMasterView } from './components/DivisionMasterView';
import { PositionMasterView } from './components/PositionMasterView';
import { OfficeSettingsView } from './components/OfficeSettingsView';
import { AttendanceRecapView } from './components/AttendanceRecapView';
import { KaryawanPortal } from './components/KaryawanPortal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [officeSettings, setOfficeSettings] = useState<OfficeSettings>(getOfficeSettings());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Initialize data storage, theme & Firebase real-time listener
  useEffect(() => {
    initializeStorage();
    const user = getCurrentUser();
    if (user) {
      setCurrentUserState(user);
      const effective = getUserEffectiveMenus(user);
      if (effective.length > 0 && !effective.includes(activeTab)) {
        setActiveTab(effective[0]);
      } else if (user.role === 'admin') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('absen');
      }
    }

    // Subscribe to Firebase Cloud Changes
    const unsubscribeSync = setupRealtimeFirebaseSync(() => {
      setOfficeSettings(getOfficeSettings());
    });

    // Real-time listener for permissions and user updates
    const handlePermissionsOrUserUpdate = () => {
      const freshUser = getCurrentUser();
      if (freshUser) {
        // Refresh currentUser in case custom permissions were modified
        const allUsers = getUsers();
        const found = allUsers.find((u) => u.id === freshUser.id) || freshUser;
        setCurrentUserState(found);
      }
    };

    window.addEventListener('absensi_permissions_updated', handlePermissionsOrUserUpdate);
    window.addEventListener('absensi_users_updated', handlePermissionsOrUserUpdate);

    // Load Theme
    const savedTheme = localStorage.getItem('absensi_pwa_theme_v1') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    return () => {
      if (unsubscribeSync) unsubscribeSync();
      window.removeEventListener('absensi_permissions_updated', handlePermissionsOrUserUpdate);
      window.removeEventListener('absensi_users_updated', handlePermissionsOrUserUpdate);
    };
  }, []);

  // Theme Toggle Handler
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('absensi_pwa_theme_v1', nextTheme);
    } catch {}
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    const effective = getUserEffectiveMenus(user);
    if (effective.length > 0) {
      setActiveTab(effective[0]);
    } else {
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'absen');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    setIsLoginModalOpen(false);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleSelectUser} />;
  }

  // Calculate effective allowed menus for current user
  const effectiveMenus = getUserEffectiveMenus(currentUser);
  const isTabAllowed = effectiveMenus.includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Fixed Navbar */}
      <Navbar
        currentUser={currentUser}
        onSelectRoleDemo={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isMobileMenuOpen={isMobileSidebarOpen}
        onToggleMobileMenu={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Body Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex items-start">
        {/* Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic Content Main Panel */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-hidden space-y-6">
          {!isTabAllowed ? (
            /* Restricted Menu Notice */
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-rose-200 dark:border-rose-900/60 shadow-sm text-center max-w-md mx-auto my-12 space-y-4">
              <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Akses Menu Dibatasi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Akun Anda saat ini tidak memiliki izin untuk membuka menu ini.
                  Pengaturan ini dikonfigurasikan oleh Administrator sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab(effectiveMenus[0] || (currentUser.role === 'admin' ? 'dashboard' : 'absen'))}
                className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow transition inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Menu Utama</span>
              </button>
            </div>
          ) : (
            /* Allowed Menu Views */
            <>
              {activeTab === 'dashboard' && (
                <DashboardAdmin
                  office={officeSettings}
                  onNavigateRecap={() => setActiveTab('rekap')}
                  onNavigateEmployees={() => setActiveTab('karyawan')}
                />
              )}
              {activeTab === 'roles' && <RoleUserConfigView />}
              {activeTab === 'karyawan' && <EmployeeMasterView />}
              {activeTab === 'divisi' && <DivisionMasterView />}
              {activeTab === 'jabatan' && <PositionMasterView />}
              {activeTab === 'lokasi' && (
                <OfficeSettingsView onOfficeUpdated={setOfficeSettings} />
              )}
              {activeTab === 'rekap' && <AttendanceRecapView />}

              {/* Employee Operational Tabs (Absen, Riwayat, Profil) */}
              {(activeTab === 'absen' || activeTab === 'riwayat' || activeTab === 'profil') && (
                <KaryawanPortal
                  currentUser={currentUser}
                  office={officeSettings}
                  activeTab={activeTab}
                  onRefreshUser={handleSelectUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSelectUser={handleSelectUser}
        currentUser={currentUser}
      />
    </div>
  );
}
