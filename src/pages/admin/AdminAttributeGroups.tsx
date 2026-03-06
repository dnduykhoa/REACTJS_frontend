import { useEffect, useState } from 'react';
import { attributeGroupApi } from '../../api/j2ee';
import type { AttributeGroup } from '../../api/j2ee/types';

type GroupForm = { name: string; description: string; displayOrder: number; isActive: boolean };
const emptyForm = (): GroupForm => ({ name: '', description: '', displayOrder: 0, isActive: true });

export default function AdminAttributeGroups() {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttributeGroup | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    attributeGroupApi.getAll().then((r) => setGroups(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true); };
  const openEdit = (g: AttributeGroup) => {
    setEditing(g);
    setForm({ name: g.name, description: g.description || '', displayOrder: g.displayOrder, isActive: g.isActive });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Tên không được để trống'); return; }
    setSaving(true);
    try {
      if (editing) {
        await attributeGroupApi.update(editing.id, form);
      } else {
        await attributeGroupApi.create(form);
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
    if (!confirm('Xóa nhóm thuộc tính này?')) return;
    try {
      await attributeGroupApi.delete(id);
      load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const set = (field: keyof GroupForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Nhóm thuộc tính</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Thêm nhóm
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 mb-4">{editing ? 'Chỉnh sửa nhóm' : 'Thêm nhóm mới'}</h3>
            {error && <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={set('name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea rows={2} value={form.description} onChange={set('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="grpActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <label htmlFor="grpActive" className="text-sm text-gray-700">Hiển thị</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? '...' : 'Lưu'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Tên nhóm</th>
                <th className="px-4 py-3 text-left">Mô tả</th>
                <th className="px-4 py-3 text-center">Thứ tự</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Chưa có nhóm nào</td></tr>}
              {groups.map((g, idx) => (
                <tr key={g.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{g.name}</td>
                  <td className="px-4 py-2 text-gray-500"><span className="line-clamp-1">{g.description || '—'}</span></td>
                  <td className="px-4 py-2 text-center">{g.displayOrder}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {g.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(g)} className="text-blue-600 hover:underline text-xs">Sửa</button>
                      <button onClick={() => handleDelete(g.id)} className="text-red-500 hover:underline text-xs">Xóa</button>
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
