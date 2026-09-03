import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Building,
  Briefcase,
  AlertCircle,
  Camera,
  RefreshCw,
  Lock,
  User as UserIcon,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Sparkles,
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  MapPin,
  History,
  CheckSquare,
  Square,
} from 'lucide-react';
import { User as UserType, Role, Gender, ALL_APP_MENUS, AppMenuId, RolePermissionsConfig } from '../types';
import {
  getUsers,
  saveUser,
  deleteUser,
  getDivisions,
  getPositions,
  getRolePermissions,
  saveRolePermissions,
  getUserEffectiveMenus,
  DEFAULT_ROLE_PERMISSIONS,
} from '../lib/storage';

const MENU_ICONS: Record<AppMenuId, React.ComponentType<{ className?: string }>> = {
  absen: Camera,
  riwayat: History,
  profil: UserIcon,
  dashboard: LayoutDashboard,
  rekap: FileSpreadsheet,
  karyawan: Users,
  divisi: Building2,
  jabatan: Briefcase,
  lokasi: MapPin,
  roles: ShieldCheck,
};

export const RoleUserConfigView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>(getUsers());
  const divisions = getDivisions();
  const positions = getPositions();

  // Active top tab: 'matrix' (Role Permissions Matrix) vs 'users' (User Accounts & Custom Access)
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'users'>('matrix');

  // Role Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(getRolePermissions());
  const [isRolePermSaved, setIsRolePermSaved] = useState(false);

  // Search and filters for user list
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'karyawan'>('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Modal State for Add / Edit user
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form State for User
  const [formNik, setFormNik] = useState('');
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<Role>('karyawan');
  const [formGender, setFormGender] = useState<Gender>('L');
  const [formDivisionId, setFormDivisionId] = useState('');
  const [formPositionId, setFormPositionId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formStatus, setFormStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  // Custom User Permissions in Add/Edit modal
  const [formHasCustomPerms, setFormHasCustomPerms] = useState(false);
  const [formAllowedMenus, setFormAllowedMenus] = useState<string[]>([]);

  // Standalone Custom User Permission Modal
  const [userPermTarget, setUserPermTarget] = useState<UserType | null>(null);
  const [targetCustomPerms, setTargetCustomPerms] = useState<boolean>(false);
  const [targetAllowedMenus, setTargetAllowedMenus] = useState<string[]>([]);

  // Confirmation Delete Modal
  const [deleteCandidate, setDeleteCandidate] = useState<UserType | null>(null);

  useEffect(() => {
    const handlePermsUpdate = () => {
      setRolePermissions(getRolePermissions());
    };
    const handleUsersUpdate = () => {
      setUsers(getUsers());
    };

    window.addEventListener('absensi_permissions_updated', handlePermsUpdate);
    window.addEventListener('absensi_users_updated', handleUsersUpdate);

    return () => {
      window.removeEventListener('absensi_permissions_updated', handlePermsUpdate);
      window.removeEventListener('absensi_users_updated', handleUsersUpdate);
    };
  }, []);

  const refreshUsersList = () => {
    setUsers(getUsers());
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle role menu permission
  const handleToggleRoleMenu = (role: Role, menuId: AppMenuId) => {
    // Prevent locking out roles menu for admin
    if (role === 'admin' && menuId === 'roles') return;

    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const updated = current.includes(menuId)
        ? current.filter((id) => id !== menuId)
        : [...current, menuId];

      const newConfig = {
        ...prev,
        [role]: updated,
      };

      saveRolePermissions(newConfig);
      setIsRolePermSaved(true);
      setTimeout(() => setIsRolePermSaved(false), 2500);
      return newConfig;
    });
  };

  const handleSelectAllRoleMenus = (role: Role) => {
    const allIds = ALL_APP_MENUS.map((m) => m.id);
    const newConfig = {
      ...rolePermissions,
      [role]: allIds,
    };
    setRolePermissions(newConfig);
    saveRolePermissions(newConfig);
    setIsRolePermSaved(true);
    setTimeout(() => setIsRolePermSaved(false), 2500);
  };

  const handleResetRoleMenusDefault = (role: Role) => {
    const newConfig = {
      ...rolePermissions,
      [role]: DEFAULT_ROLE_PERMISSIONS[role],
    };
    setRolePermissions(newConfig);
    saveRolePermissions(newConfig);
    setIsRolePermSaved(true);
    setTimeout(() => setIsRolePermSaved(false), 2500);
  };

  const handleClearRoleMenus = (role: Role) => {
    const newConfig = {
      ...rolePermissions,
      [role]: role === 'admin' ? ['roles'] : [],
    };
    setRolePermissions(newConfig);
    saveRolePermissions(newConfig);
    setIsRolePermSaved(true);
    setTimeout(() => setIsRolePermSaved(false), 2500);
  };

  // User Add/Edit modal handlers
  const handleOpenAddModal = () => {
    setEditingUser(null);
    const newNik = `EMP00${users.length + 1}`;
    setFormNik(newNik);
    setFormName('');
    setFormUsername(newNik.toLowerCase());
    setFormPassword('123456');
    setFormEmail('');
    setFormRole('karyawan');
    setFormGender('L');
    setFormDivisionId(divisions[0]?.id || '');
    setFormPositionId(positions[0]?.id || '');
    setFormPhone('081234567890');
    setFormPhotoUrl(
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300'
    );
    setFormStatus('aktif');
    setFormHasCustomPerms(false);
    setFormAllowedMenus(DEFAULT_ROLE_PERMISSIONS.karyawan);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserType) => {
    setEditingUser(user);
    setFormNik(user.nik);
    setFormName(user.name);
    setFormUsername(user.username || user.nik.toLowerCase());
    setFormPassword(user.password || '123456');
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormGender(user.gender);
    setFormDivisionId(user.divisionId);
    setFormPositionId(user.positionId);
    setFormPhone(user.phone);
    setFormPhotoUrl(user.photoUrl);
    setFormStatus(user.status);
    setFormHasCustomPerms(!!user.hasCustomPermissions);
    setFormAllowedMenus(user.allowedMenus || rolePermissions[user.role] || []);
    setIsModalOpen(true);
  };

  const handleQuickRoleChange = (user: UserType, newRole: Role) => {
    const updated: UserType = {
      ...user,
      role: newRole,
      // If user had no custom permissions, their effective menus will update automatically to new role's menus
    };
    saveUser(updated);
    refreshUsersList();
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDiv = divisions.find((d) => d.id === formDivisionId);
    const selectedPos = positions.find((p) => p.id === formPositionId);

    const userToSave: UserType = {
      id: editingUser ? editingUser.id : 'user-' + Date.now(),
      nik: formNik,
      name: formName,
      username: formUsername || formNik.toLowerCase(),
      password: formPassword || '123456',
      email: formEmail,
      gender: formGender,
      divisionId: formDivisionId,
      divisionName: selectedDiv ? selectedDiv.name : 'Umum',
      positionId: formPositionId,
      positionName: selectedPos ? selectedPos.title : 'Staff',
      phone: formPhone,
      status: formStatus,
      role: formRole,
      photoUrl:
        formPhotoUrl ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300',
      faceDescriptor: editingUser ? editingUser.faceDescriptor : [],
      faceRegistered: editingUser ? editingUser.faceRegistered : false,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
      hasCustomPermissions: formHasCustomPerms,
      allowedMenus: formHasCustomPerms ? formAllowedMenus : undefined,
    };

    saveUser(userToSave);
    refreshUsersList();
    setIsModalOpen(false);
  };

  // Open standalone user permission modal
  const handleOpenUserPermModal = (user: UserType) => {
    setUserPermTarget(user);
    setTargetCustomPerms(!!user.hasCustomPermissions);
    setTargetAllowedMenus(
      user.hasCustomPermissions && user.allowedMenus && user.allowedMenus.length > 0
        ? user.allowedMenus
        : rolePermissions[user.role] || DEFAULT_ROLE_PERMISSIONS[user.role]
    );
  };

  const handleSaveUserPermModal = () => {
    if (!userPermTarget) return;

    const updated: UserType = {
      ...userPermTarget,
      hasCustomPermissions: targetCustomPerms,
      allowedMenus: targetCustomPerms ? targetAllowedMenus : undefined,
    };

    saveUser(updated);
    refreshUsersList();
    setUserPermTarget(null);
  };

  const handleDeleteUserConfirm = () => {
    if (deleteCandidate) {
      deleteUser(deleteCandidate.id);
      refreshUsersList();
      setDeleteCandidate(null);
    }
  };

  // Filtering users
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.nik.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      u.email.toLowerCase().includes(term);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalAdmin = users.filter((u) => u.role === 'admin').length;
  const totalKaryawan = users.filter((u) => u.role === 'karyawan').length;
  const totalCustomPerms = users.filter((u) => u.hasCustomPermissions).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Konfigurasi Role & Hak Akses Menu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tentukan hak akses menu apa saja yang bisa diakses oleh pengguna biasa (Karyawan) maupun Administrator.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRolePermSaved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Hak Akses Tersimpan</span>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSubTab === 'matrix'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Matriks Hak Akses Menu Per Peran</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSubTab === 'users'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pengguna & Akses Kustom ({users.length})</span>
          {totalCustomPerms > 0 && (
            <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {totalCustomPerms} Kustom
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MATRIKS HAK AKSES MENU PER PERAN (REQUESTED) */}
      {/* ======================================================== */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-6">
          {/* Info Card */}
          <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-purple-900 dark:text-purple-200">
                Pengaturan Hak Akses Menu Fleksibel (RBAC Dynamic)
              </p>
              <p className="text-purple-700 dark:text-purple-300 leading-relaxed">
                Centang atau hilangkan centang menu di bawah untuk menentukan menu apa saja yang dapat dilihat & diakses oleh pengguna.
                Misalnya, Anda bisa mengizinkan Karyawan mengakses <strong>Rekap Absensi & Laporan</strong> jika mereka staf HR, atau membatasi menu tertentu sesuai kebutuhan perusahaan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROLE KARYAWAN / PENGGUNA BIASA */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Hak Akses Peran: Karyawan (Pengguna Biasa)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Menu aktif: {rolePermissions.karyawan.length} dari {ALL_APP_MENUS.length} menu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectAllRoleMenus('karyawan')}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetRoleMenusDefault('karyawan')}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    title="Reset ke standar (Absen, Riwayat, Profil)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearRoleMenus('karyawan')}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {/* Menus List for Karyawan */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {ALL_APP_MENUS.map((menu) => {
                  const isChecked = rolePermissions.karyawan.includes(menu.id);
                  const Icon = MENU_ICONS[menu.id] || ShieldCheck;

                  return (
                    <label
                      key={menu.id}
                      onClick={() => handleToggleRoleMenu('karyawan', menu.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 text-slate-700 dark:text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {menu.label}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-full">
                            {menu.categoryLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {menu.description}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isChecked
                              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isChecked ? 'Diizinkan' : 'Terkunci'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ROLE ADMINISTRATOR */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Hak Akses Peran: Administrator
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Menu aktif: {rolePermissions.admin.length} dari {ALL_APP_MENUS.length} menu
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectAllRoleMenus('admin')}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResetRoleMenusDefault('admin')}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Menus List for Admin */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {ALL_APP_MENUS.map((menu) => {
                  const isChecked = rolePermissions.admin.includes(menu.id);
                  const isLockedRole = menu.id === 'roles'; // Prevent locking out configuration
                  const Icon = MENU_ICONS[menu.id] || ShieldCheck;

                  return (
                    <label
                      key={menu.id}
                      onClick={() => !isLockedRole && handleToggleRoleMenu('admin', menu.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border select-none transition ${
                        isLockedRole
                          ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 cursor-not-allowed'
                          : isChecked
                          ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 cursor-pointer'
                          : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 cursor-pointer'
                      }`}
                    >
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLockedRole}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer disabled:opacity-50"
                        />
                      </div>

                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 text-slate-700 dark:text-slate-300">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {menu.label}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-full">
                            {menu.categoryLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {menu.description}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLockedRole
                              ? 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : isChecked
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isLockedRole ? 'Wajib Admin' : isChecked ? 'Diizinkan' : 'Terkunci'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DAFTAR PENGGUNA & HAK AKSES KUSTOM PER USER */}
      {/* ======================================================== */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Akun Pengguna</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{users.length}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Semua akun terdaftar</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Administrator</p>
              <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{totalAdmin}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Akses pengawasan</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Karyawan Biasa</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{totalKaryawan}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Presensi kehadiran</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-amber-500">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Hak Akses Kustom</p>
              <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{totalCustomPerms}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Izin menu khusus user</p>
            </div>
          </div>

          {/* Main Users Table Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, username, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-bold text-slate-500 shrink-0">Filter Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white w-full sm:w-auto"
                >
                  <option value="ALL">Semua Role Pengguna</option>
                  <option value="admin">Administrator</option>
                  <option value="karyawan">Karyawan</option>
                </select>
              </div>
            </div>

            {/* User List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-y border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Pengguna & NIK</th>
                    <th className="py-3 px-4">Kredensial Login</th>
                    <th className="py-3 px-4">Role Utama</th>
                    <th className="py-3 px-4">Pilihan Hak Akses Menu</th>
                    <th className="py-3 px-4 text-center">Status Account</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada data pengguna yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isPassVisible = showPasswords[user.id] || false;
                      const isAdmin = user.role === 'admin';
                      const effectiveMenus = getUserEffectiveMenus(user);
                      const isCustom = user.hasCustomPermissions && user.allowedMenus && user.allowedMenus.length > 0;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {user.photoUrl ? (
                                <img
                                  src={user.photoUrl}
                                  alt={user.name}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-sm border border-slate-200 dark:border-slate-700 shrink-0">
                                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-sm">{user.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  NIK: {user.nik} | {user.divisionName}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                User: {user.username || user.nik.toLowerCase()}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                  Pass: {isPassVisible ? user.password || '123456' : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(user.id)}
                                  className="text-slate-400 hover:text-slate-600"
                                  title="Tampilkan / Sembunyikan Password"
                                >
                                  {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={user.role}
                                onChange={(e) => handleQuickRoleChange(user, e.target.value as Role)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer ${
                                  isAdmin
                                    ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                                    : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                                }`}
                              >
                                <option value="karyawan">Role Karyawan</option>
                                <option value="admin">Administrator</option>
                              </select>
                            </div>
                          </td>

                          {/* Hak Akses Menu Column */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isCustom
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {isCustom ? <Sparkles className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                  <span>{isCustom ? 'Akses Kustom' : 'Standar Peran'} ({effectiveMenus.length} Menu)</span>
                                </span>

                                <button
                                  onClick={() => handleOpenUserPermModal(user)}
                                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                  title="Atur hak akses menu khusus untuk pengguna ini"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Atur Menu</span>
                                </button>
                              </div>

                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {effectiveMenus.join(', ')}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                user.status === 'aktif'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(user)}
                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 rounded-lg transition"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate(user)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded-lg transition"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL ATUR HAK AKSES MENU KHUSUS PENGGUNA TERTENTU */}
      {/* ======================================================== */}
      {userPermTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Atur Hak Akses Menu Pengguna
                  </h3>
                  <p className="text-xs text-slate-500">
                    {userPermTarget.name} ({userPermTarget.nik}) • Role: {userPermTarget.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUserPermTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Permission Mode Toggle */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mode Hak Akses Pengguna:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetCustomPerms(false);
                      setTargetAllowedMenus(rolePermissions[userPermTarget.role] || DEFAULT_ROLE_PERMISSIONS[userPermTarget.role]);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      !targetCustomPerms
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Gunakan Standar Peran</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCustomPerms(true)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      targetCustomPerms
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Kustomisasi Menu Khusus</span>
                  </button>
                </div>
              </div>

              {/* Menu Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilihan Menu yang Diizinkan: ({targetAllowedMenus.length} dari {ALL_APP_MENUS.length})
                  </span>

                  {targetCustomPerms && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTargetAllowedMenus(ALL_APP_MENUS.map((m) => m.id))}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-700 dark:text-slate-300"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetAllowedMenus(userPermTarget.role === 'admin' ? ['roles'] : [])}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-700 dark:text-slate-300"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {ALL_APP_MENUS.map((menu) => {
                    const isChecked = targetAllowedMenus.includes(menu.id);
                    const Icon = MENU_ICONS[menu.id] || ShieldCheck;
                    const isDisabled = !targetCustomPerms || (userPermTarget.role === 'admin' && menu.id === 'roles');

                    return (
                      <label
                        key={menu.id}
                        onClick={() => {
                          if (isDisabled) return;
                          setTargetAllowedMenus((prev) =>
                            prev.includes(menu.id)
                              ? prev.filter((id) => id !== menu.id)
                              : [...prev, menu.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs select-none transition ${
                          isDisabled
                            ? 'opacity-70 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                            : isChecked
                            ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 cursor-pointer'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-pointer opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                          />
                          <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {menu.label}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-400">
                              ({menu.categoryLabel})
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isChecked
                              ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {isChecked ? 'Diizinkan' : 'Ditolak'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserPermTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUserPermModal}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Simpan Hak Akses Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL TAMBAH / EDIT USER DENGAN PILIHAN HAK AKSES */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {editingUser ? 'Edit Data Pengguna & Hak Akses' : 'Tambah Pengguna & Peran Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Peran Akun *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => {
                      setFormRole('karyawan');
                      if (!formHasCustomPerms) {
                        setFormAllowedMenus(rolePermissions.karyawan || DEFAULT_ROLE_PERMISSIONS.karyawan);
                      }
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                      formRole === 'karyawan'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Role Karyawan</span>
                  </label>

                  <label
                    onClick={() => {
                      setFormRole('admin');
                      if (!formHasCustomPerms) {
                        setFormAllowedMenus(rolePermissions.admin || DEFAULT_ROLE_PERMISSIONS.admin);
                      }
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 text-xs font-bold transition ${
                      formRole === 'admin'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Administrator</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">NIK *</label>
                  <input
                    type="text"
                    required
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Divisi Kerja</label>
                  <select
                    value={formDivisionId}
                    onChange={(e) => setFormDivisionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Jabatan Kerja</label>
                  <select
                    value={formPositionId}
                    onChange={(e) => setFormPositionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  >
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Status Akun</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              {/* SEKSI PILIHAN HAK AKSES MENU PENGGUNA */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Hak Akses Menu Akun Ini
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formHasCustomPerms}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormHasCustomPerms(checked);
                        if (!checked) {
                          setFormAllowedMenus(rolePermissions[formRole] || DEFAULT_ROLE_PERMISSIONS[formRole]);
                        }
                      }}
                      className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Kustomisasi Khusus
                    </span>
                  </label>
                </div>

                {formHasCustomPerms ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] text-slate-500">
                      Pilih menu apa saja yang diizinkan untuk pengguna ini:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {ALL_APP_MENUS.map((menu) => {
                        const isChecked = formAllowedMenus.includes(menu.id);
                        return (
                          <label
                            key={menu.id}
                            onClick={() => {
                              setFormAllowedMenus((prev) =>
                                prev.includes(menu.id)
                                  ? prev.filter((id) => id !== menu.id)
                                  : [...prev, menu.id]
                              );
                            }}
                            className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer select-none"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {menu.label}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                isChecked ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {isChecked ? 'Diizinkan' : 'Ditolak'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Mengikuti hak akses standar peran <strong>{formRole === 'admin' ? 'Administrator' : 'Karyawan'}</strong> ({rolePermissions[formRole]?.length || 0} menu aktif).
                  </p>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Simpan Data Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Hapus Pengguna Ini?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda akan menghapus akun <strong>{deleteCandidate.name}</strong> ({deleteCandidate.nik}). Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUserConfirm}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
