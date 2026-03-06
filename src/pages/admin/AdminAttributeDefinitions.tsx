import { useEffect, useState } from 'react';
import { attributeDefinitionApi, attributeGroupApi } from '../../api/j2ee';
import type { AttributeDefinition, AttributeDefinitionRequest, AttributeGroup, DataType } from '../../api/j2ee/types';

const DATA_TYPES: DataType[] = ['STRING', 'NUMBER', 'BOOLEAN', 'LIST'];

const emptyForm = (): AttributeDefinitionRequest => ({
  name: '',
  attrKey: '',
  dataType: 'STRING',
  unit: '',
  isFilterable: false,
  isRequired: false,
  displayOrder: 0,
  isActive: true,
  groupId: undefined,
});

export default function AdminAttributeDefinitions() {
  const [defs, setDefs] = useState<AttributeDefinition[]>([]);
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttributeDefinition | null>(null);
  const [form, setForm] = useState<AttributeDefinitionRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([attributeDefinitionApi.getAll(), attributeGroupApi.getAll()]).then(([d, g]) => {
      setDefs(d.data.data);
      setGroups(g.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(''); setShowForm(true); };
  const openEdit = (d: AttributeDefinition) => {
    setEditing(d);
    setForm({
      name: d.name,
      attrKey: d.attrKey,
      dataType: d.dataType,
      unit: d.unit || '',
      isFilterable: d.isFilterable,
      isRequired: d.isRequired,
      displayOrder: d.displayOrder,
      isActive: d.isActive,
      groupId: d.attributeGroup?.id,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim() || !form.attrKey.trim()) { setError('Tên và Key là bắt buộc'); return; }
    setSaving(true);
    try {
      if (editing) {
        await attributeDefinitionApi.update(editing.id, form);
      } else {
        await attributeDefinitionApi.create(form);
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
    if (!confirm('Xóa thuộc tính này?')) return;
    try {
      await attributeDefinitionApi.delete(id);
      load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xóa thất bại');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Thuộc tính sản phẩm</h2>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Thêm thuộc tính
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-4">{editing ? 'Chỉnh sửa thuộc tính' : 'Thêm thuộc tính'}</h3>
            {error && <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key (unique) <span className="text-red-500">*</span></label>
                  <input type="text" value={form.attrKey} onChange={(e) => setForm({ ...form, attrKey: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="vd: ram, cpu" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kiểu dữ liệu</label>
                  <select value={form.dataType} onChange={(e) => setForm({ ...form, dataType: e.target.value as DataType })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
                  <input type="text" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="GB, GHz, inch..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm thuộc tính</label>
                <select value={form.groupId ?? ''} onChange={(e) => setForm({ ...form, groupId: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Không có nhóm --</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự</label>
                <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="filterable" checked={form.isFilterable ?? false} onChange={(e) => setForm({ ...form, isFilterable: e.target.checked })} />
                  <label htmlFor="filterable" className="text-sm text-gray-700">Có thể lọc</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="required" checked={form.isRequired ?? false} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
                  <label htmlFor="required" className="text-sm text-gray-700">Bắt buộc</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="attrActive" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  <label htmlFor="attrActive" className="text-sm text-gray-700">Hiển thị</label>
                </div>
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
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Key</th>
                <th className="px-4 py-3 text-left">Kiểu</th>
                <th className="px-4 py-3 text-left">Nhóm</th>
                <th className="px-4 py-3 text-center">Lọc</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {defs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Chưa có thuộc tính nào</td></tr>}
              {defs.map((d, idx) => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono text-xs">{d.attrKey}</td>
                  <td className="px-4 py-2">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{d.dataType}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{d.attributeGroup?.name || '—'}</td>
                  <td className="px-4 py-2 text-center">{d.isFilterable ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline text-xs">Sửa</button>
                      <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:underline text-xs">Xóa</button>
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
