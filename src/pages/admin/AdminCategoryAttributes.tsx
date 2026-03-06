import { useEffect, useState } from 'react';
import { categoryApi, attributeDefinitionApi, categoryAttributeApi } from '../../api/j2ee';
import type { Category, AttributeDefinition, CategoryAttribute } from '../../api/j2ee/types';
import { Link2, Plus, Trash2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminCategoryAttributes() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [attrDefs, setAttrDefs] = useState<AttributeDefinition[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<CategoryAttribute[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Assign form
  const [attrDefId, setAttrDefId] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([categoryApi.getAll(), attributeDefinitionApi.getAll()]).then(([c, a]) => {
      setCategories(c.data.data);
      setAttrDefs(a.data.data);
    });
  }, []);

  const loadAssignments = (categoryId: number) => {
    setLoadingAssignments(true);
    categoryAttributeApi.getByCategory(categoryId)
      .then((r) => setAssignments(r.data.data))
      .finally(() => setLoadingAssignments(false));
  };

  const handleSelectCategory = (id: number) => {
    setSelectedCategoryId(id);
    loadAssignments(id);
    setError('');
  };

  const handleAssign = async () => {
    if (!selectedCategoryId || !attrDefId) { setError('Chọn thuộc tính để gán'); return; }
    setError('');
    setAssigning(true);
    try {
      await categoryAttributeApi.assign(selectedCategoryId, Number(attrDefId), isRequired, Number(displayOrder));
      loadAssignments(selectedCategoryId);
      setAttrDefId('');
      setIsRequired(false);
      setDisplayOrder('0');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gán thất bại');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Xóa gán này?')) return;
    try {
      await categoryAttributeApi.removeById(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Xóa thất bại');
    }
  };

  // Filter out already assigned attr defs
  const assignedIds = new Set(assignments.map((a) => a.attributeDefinition.id));
  const availableDefs = attrDefs.filter((d) => !assignedIds.has(d.id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thuộc tính theo danh mục</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gán thuộc tính vào từng danh mục sản phẩm</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Category list */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-1.5">
            <Link2 size={14} className="text-slate-400" /> Chọn danh mục
          </h3>
          <ul className="space-y-1 max-h-96 overflow-y-auto">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {cat.name}
                  {cat.parent && <span className="text-xs opacity-60 ml-1">({cat.parent.name})</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Assignments */}
        <div className="md:col-span-2 space-y-4">
          {selectedCategoryId ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm">
                  Gán thuộc tính cho: <span className="text-indigo-600">{categories.find((c) => c.id === selectedCategoryId)?.name}</span>
                </h3>
                {error && (
                  <div className="mb-3 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                    <AlertCircle size={15} className="shrink-0" /> {error}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Thuộc tính</label>
                    <select
                      value={attrDefId}
                      onChange={(e) => setAttrDefId(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    >
                      <option value="">-- Chọn --</option>
                      {availableDefs.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.attrKey})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Thứ tự</label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(e.target.value)}
                      className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-20 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pb-0.5">
                    <input type="checkbox" id="reqCheck" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="reqCheck" className="text-sm text-slate-600">Bắt buộc</label>
                  </div>
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    <Plus size={15} /> {assigning ? '...' : 'Gán'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-700 text-sm">Thuộc tính đã gán ({assignments.length})</h3>
                </div>
                {loadingAssignments ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">Chưa gán thuộc tính nào</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Bắt buộc</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Thứ tự</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.attributeDefinition.name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{a.attributeDefinition.attrKey}</td>
                          <td className="px-4 py-3 text-center">
                            {a.isRequired
                              ? <CheckCircle size={14} className="mx-auto text-emerald-500" />
                              : <XCircle size={14} className="mx-auto text-slate-300" />}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{a.displayOrder}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleRemove(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <Link2 size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Chọn một danh mục để xem/quản lý thuộc tính</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
