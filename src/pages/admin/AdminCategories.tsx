import { useEffect, useState } from 'react';
import { categoryApi } from '../../api/j2ee';
import type { Category, CategoryRequest } from '../../api/j2ee/types';
import { Tag, Plus, Pencil, Trash2, AlertCircle, X } from 'lucide-react';

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const emptyForm = (): CategoryRequest => ({
  name: '',
  description: '',
  displayOrder: 0,
  isActive: true,
  parentId: null,
});

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    categoryApi.getAll().then((r) => setCategories(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
      parentId: cat.parent?.id ?? null,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Tên danh mục không được để trống'); return; }
    setSaving(true);
    try {
      if (editing) {
        await categoryApi.update(editing.id, form);
      } else {
        await categoryApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Lưu thất bại'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa danh mục này?')) return;
    try {
      await categoryApi.delete(id);
      load();
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Xóa thất bại'
      );
    }
  };

  // Build display: show parent name
  const getCategoryLabel = (id: number) => categories.find((c) => c.id === id)?.name || '';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
          <p className="text-sm text-slate-500 mt-0.5">{categories.length} danh mục</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-lg">
                {editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tên <span className="text-rose-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Tên danh mục" />
              </div>
              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Thứ tự hiển thị</label>
                  <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Danh mục cha</label>
                  <select value={form.parentId ?? ''} onChange={(e) => setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                    <option value="">-- Không có --</option>
                    {categories.filter((c) => c.id !== editing?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Hiển thị</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh mục cha</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Thứ tự</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center">
                  <Tag size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">Chưa có danh mục nào</p>
                </td></tr>
              )}
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                  <td className="px-4 py-3 text-slate-500">{cat.parent ? getCategoryLabel(cat.parent.id) : '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{cat.displayOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
