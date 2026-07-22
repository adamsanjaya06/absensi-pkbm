import React, { useState, useEffect } from 'react';
import { User, OfficeSettings } from './types';
import {
  getCurrentUser,
  setCurrentUser,
  getOfficeSettings,
  initializeStorage,
  setupRealtimeFirebaseSync,
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
    setCurrentUserState(user);

    if (user?.role === 'admin') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('absen');
    }

    // Set up real-time Firebase sync
    const unsubscribeSync = setupRealtimeFirebaseSync(() => {
      setOfficeSettings(getOfficeSettings());
    });

    // Load dark mode preference
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
    };
  }, []);

  // Theme Toggle Handler
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('absensi_pwa_theme_v1', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    if (user.role === 'admin') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('absen');
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
          {/* Admin Tabs */}
          {currentUser.role === 'admin' && (
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
            </>
          )}

          {/* Employee Tabs */}
          {currentUser.role === 'karyawan' && (
            <KaryawanPortal
              currentUser={currentUser}
              office={officeSettings}
              activeTab={activeTab}
              onRefreshUser={handleSelectUser}
            />
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
