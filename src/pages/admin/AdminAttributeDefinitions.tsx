import { useEffect, useState } from 'react';
import { attributeDefinitionApi, attributeGroupApi } from '../../api/j2ee';
import type { AttributeDefinition, AttributeDefinitionRequest, AttributeGroup, DataType } from '../../api/j2ee/types';
import { Sliders, Plus, Pencil, Trash2, AlertCircle, X, CheckCircle, XCircle } from 'lucide-react';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 15;

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

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
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setPage(1);
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thuộc tính sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-0.5">{defs.length} thuộc tính</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
          <Plus size={16} /> Thêm thuộc tính
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 text-lg">{editing ? 'Chỉnh sửa thuộc tính' : 'Thêm thuộc tính'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tên hiển thị <span className="text-rose-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Key (unique) <span className="text-rose-500">*</span></label>
                  <input type="text" value={form.attrKey} onChange={(e) => setForm({ ...form, attrKey: e.target.value })} className={inputClass} placeholder="ram, cpu, ..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Kiểu dữ liệu</label>
                  <select value={form.dataType} onChange={(e) => setForm({ ...form, dataType: e.target.value as DataType })} className={inputClass}>
                    {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Đơn vị</label>
                  <input type="text" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} placeholder="GB, GHz, inch..." />
                </div>
              </div>
              <div>
                <label className={labelClass}>Nhóm thuộc tính</label>
                <select value={form.groupId ?? ''} onChange={(e) => setForm({ ...form, groupId: e.target.value ? Number(e.target.value) : undefined })} className={inputClass}>
                  <option value="">-- Không có nhóm --</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Thứ tự</label>
                <input type="number" value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className={inputClass} />
              </div>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFilterable ?? false} onChange={(e) => setForm({ ...form, isFilterable: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Có thể lọc</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isRequired ?? false} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Bắt buộc</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Hiển thị</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition">{saving ? 'Lưu...' : 'Lưu'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kiểu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhóm</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Lọc</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {defs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <Sliders size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">Chưa có thuộc tính nào</p>
                </td></tr>
              )}
              {defs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((d, idx) => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.attrKey}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{d.dataType}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{d.attributeGroup?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {d.isFilterable
                      ? <CheckCircle size={14} className="mx-auto text-emerald-500" />
                      : <XCircle size={14} className="mx-auto text-slate-300" />}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.isActive ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Chỉnh sửa"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Xóa"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageCount={Math.ceil(defs.length / PAGE_SIZE)} total={defs.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
