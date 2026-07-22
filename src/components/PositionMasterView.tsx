import React, { useState } from 'react';
import { Briefcase, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Position } from '../types';
import { getPositions, savePositions } from '../lib/storage';

export const PositionMasterView: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>(getPositions());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formLevel, setFormLevel] = useState('Staff');
  const [formDesc, setFormDesc] = useState('');

  const refreshList = () => {
    setPositions(getPositions());
  };

  const handleOpenAdd = () => {
    setEditingPos(null);
    setFormTitle('');
    setFormLevel('Staff');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos: Position) => {
    setEditingPos(pos);
    setFormTitle(pos.title);
    setFormLevel(pos.level);
    setFormDesc(pos.description);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const current = getPositions();

    if (editingPos) {
      const idx = current.findIndex((p) => p.id === editingPos.id);
      if (idx >= 0) {
        current[idx] = { ...editingPos, title: formTitle, level: formLevel, description: formDesc };
      }
    } else {
      current.push({
        id: 'pos-' + Date.now(),
        title: formTitle,
        level: formLevel,
        description: formDesc,
      });
    }

    savePositions(current);
    refreshList();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus jabatan ini?')) {
      const current = getPositions().filter((p) => p.id !== id);
      savePositions(current);
      refreshList();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Kelola Data Jabatan</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Master struktur posisi dan level jabatan karyawan
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Jabatan Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map((pos) => (
          <div
            key={pos.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase">
                  LEVEL: {pos.level}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(pos)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(pos.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">{pos.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{pos.description}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingPos ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Jabatan *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Level Jabatan</label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                >
                  <option value="Managerial">Managerial / Head</option>
                  <option value="Senior">Senior Level</option>
                  <option value="Staff">Staff / Specialist</option>
                  <option value="Junior">Junior / Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
