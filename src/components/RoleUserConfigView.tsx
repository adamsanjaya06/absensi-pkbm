import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Users,
  KeyRound,
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
} from 'lucide-react';
import { User as UserType, Role, Gender } from '../types';
import { getUsers, saveUser, deleteUser, getDivisions, getPositions } from '../lib/storage';

export const RoleUserConfigView: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>(getUsers());
  const divisions = getDivisions();
  const positions = getPositions();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'karyawan'>('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  // Form State
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

  // Confirmation Delete Modal
  const [deleteCandidate, setDeleteCandidate] = useState<UserType | null>(null);

  const refreshUsersList = () => {
    setUsers(getUsers());
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
    setIsModalOpen(true);
  };

  const handleQuickRoleChange = (user: UserType, newRole: Role) => {
    const updated: UserType = {
      ...user,
      role: newRole,
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
    };

    saveUser(userToSave);
    refreshUsersList();
    setIsModalOpen(false);
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
  const totalFaceRegistered = users.filter((u) => u.faceRegistered).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Konfigurasi Role & Hak Akses Pengguna
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola hak akses sistem, ubah role pengguna (Admin / Karyawan), atur username & password login, serta tambah atau hapus pengguna.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna & Role Baru</span>
        </button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Akun Pengguna</p>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{users.length}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Semua pengguna terdaftar</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Total Administrator</p>
          <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{totalAdmin}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Akses penuh manajemen</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Karyawan</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{totalKaryawan}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Akses portal absensi</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Status Wajah AI</p>
          <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{totalFaceRegistered} / {users.length}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Sudah mendaftarkan biometrik</p>
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
                <th className="py-3 px-4">Role Hak Akses</th>
                <th className="py-3 px-4">Ubah Role Langsung</th>
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

                  return (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.photoUrl}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
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
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isAdmin
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>{isAdmin ? 'ADMINISTRATOR' : 'KARYAWAN'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleQuickRoleChange(user, e.target.value as Role)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="karyawan">Role: Karyawan</option>
                          <option value="admin">Role: Administrator</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            user.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {user.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition"
                            title="Edit Pengguna & Role"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteCandidate(user)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Add / Edit User & Role */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span>{editingUser ? 'Edit Data Pengguna & Role' : 'Tambah Pengguna Baru'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              {/* Role Picker */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-200">
                  Role & Hak Akses Sistem *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setFormRole('karyawan')}
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
                    onClick={() => setFormRole('admin')}
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
                  <label className="block text-xs font-semibold mb-1">Status Account</label>
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
                  className="px-5 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow transition"
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
