import { useEffect, useState } from 'react';
import { brandApi } from '../../api/j2ee';
import type { Brand } from '../../api/j2ee/types';
import { Building2, Plus, Pencil, Trash2, AlertCircle, X } from 'lucide-react';

type BrandForm = { name: string; logoUrl: string; description: string; displayOrder: number; isActive: boolean };
const emptyForm = (): BrandForm => ({ name: '', logoUrl: '', description: '', displayOrder: 0, isActive: true });

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

export default function AdminBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    brandApi.getAll().then((r) => setBrands(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true); };
  const openEdit = (b: Brand) => {
    setEditing(b);
    setForm({ name: b.name, logoUrl: b.logoUrl || '', description: b.description || '', displayOrder: b.displayOrder, isActive: b.isActive });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Tên thương hiệu không được để trống'); return; }
    setSaving(true);
    try {
      if (editing) {
        await brandApi.update(editing.id, form);
      } else {
        await brandApi.create(form);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa thương hiệu này?')) return;
    try {
      await brandApi.delete(id);
      load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const set = (field: keyof BrandForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thương hiệu</h1>
          <p className="text-sm text-slate-500 mt-0.5">{brands.length} thương hiệu</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm thương hiệu
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-lg">
                {editing ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới'}
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
                <input type="text" value={form.name} onChange={set('name')} className={inputClass} placeholder="Tên thương hiệu" />
              </div>
              <div>
                <label className={labelClass}>URL Logo</label>
                <input type="text" value={form.logoUrl} onChange={set('logoUrl')} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea rows={2} value={form.description} onChange={set('description')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Thứ tự hiển thị</label>
                <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className={inputClass} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700">Hiển thị</span>
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">
                Hủy
              </button>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mô tả</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Thứ tự</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có thương hiệu nào</p>
                  </td>
                </tr>
              )}
              {brands.map((b, idx) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" className="w-7 h-7 object-contain rounded" />
                      ) : (
                        <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center">
                          <Building2 size={14} className="text-slate-400" />
                        </div>
                      )}
                      <span className="font-medium text-slate-800">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs">
                    <span className="line-clamp-1">{b.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{b.displayOrder}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {b.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa">
                        <Trash2 size={14} />
                      </button>
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
