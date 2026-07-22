import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Division } from '../types';
import { getDivisions, saveDivisions } from '../lib/storage';

export const DivisionMasterView: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>(getDivisions());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<Division | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const refreshList = () => {
    setDivisions(getDivisions());
  };

  const handleOpenAdd = () => {
    setEditingDiv(null);
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (div: Division) => {
    setEditingDiv(div);
    setFormName(div.name);
    setFormCode(div.code);
    setFormDesc(div.description);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const current = getDivisions();

    if (editingDiv) {
      const idx = current.findIndex((d) => d.id === editingDiv.id);
      if (idx >= 0) {
        current[idx] = { ...editingDiv, name: formName, code: formCode, description: formDesc };
      }
    } else {
      current.push({
        id: 'div-' + Date.now(),
        name: formName,
        code: formCode || formName.substring(0, 3).toUpperCase(),
        description: formDesc,
      });
    }

    saveDivisions(current);
    refreshList();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus divisi ini?')) {
      const current = getDivisions().filter((d) => d.id !== id);
      saveDivisions(current);
      refreshList();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Kelola Data Divisi</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Master unit departemen dan divisi organisasi perusahaan
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Divisi Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {divisions.map((div) => (
          <div
            key={div.id}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px]">
                  KODE: {div.code}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(div)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(div.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">{div.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{div.description}</p>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingDiv ? 'Edit Divisi' : 'Tambah Divisi Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Nama Divisi *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Kode Divisi *</label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs uppercase"
                />
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
