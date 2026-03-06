import { useEffect, useState } from 'react';
import { categoryApi } from '../../api/j2ee';
import type { Category, CategoryRequest } from '../../api/j2ee/types';

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
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Quản lý danh mục</h2>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Thêm danh mục
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 mb-4">
              {editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            {error && (
              <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  rows={2}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={form.displayOrder ?? 0}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục cha
                  </label>
                  <select
                    value={form.parentId ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Không có --</option>
                    {categories
                      .filter((c) => c.id !== editing?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <label htmlFor="catActive" className="text-sm text-gray-700">Hiển thị</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Danh mục cha</th>
                <th className="px-4 py-3 text-center">Thứ tự</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Chưa có danh mục
                  </td>
                </tr>
              )}
              {categories.map((cat, idx) => (
                <tr key={cat.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {cat.parent ? getCategoryLabel(cat.parent.id) : '—'}
                  </td>
                  <td className="px-4 py-2 text-center">{cat.displayOrder}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Xóa
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
