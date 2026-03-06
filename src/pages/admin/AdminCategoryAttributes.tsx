import { useEffect, useState } from 'react';
import { categoryApi, attributeDefinitionApi, categoryAttributeApi } from '../../api/j2ee';
import type { Category, AttributeDefinition, CategoryAttribute } from '../../api/j2ee/types';

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
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5">Thuộc tính theo danh mục</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Category list */}
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Chọn danh mục</h3>
          <ul className="space-y-1 max-h-96 overflow-y-auto">
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
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
              <div className="bg-white rounded-xl shadow p-4">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm">
                  Gán thuộc tính cho: <span className="text-blue-600">{categories.find((c) => c.id === selectedCategoryId)?.name}</span>
                </h3>
                {error && <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Thuộc tính</label>
                    <select
                      value={attrDefId}
                      onChange={(e) => setAttrDefId(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Chọn --</option>
                      {availableDefs.map((d) => (
                        <option key={d.id} value={d.id}>{d.name} ({d.attrKey})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Thứ tự</label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pb-2">
                    <input type="checkbox" id="reqCheck" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
                    <label htmlFor="reqCheck" className="text-sm text-gray-600">Bắt buộc</label>
                  </div>
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                  >
                    {assigning ? '...' : 'Gán'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700 text-sm">Thuộc tính đã gán ({assignments.length})</h3>
                </div>
                {loadingAssignments ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Chưa gán thuộc tính nào</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Tên</th>
                        <th className="px-4 py-2 text-left">Key</th>
                        <th className="px-4 py-2 text-center">Bắt buộc</th>
                        <th className="px-4 py-2 text-center">Thứ tự</th>
                        <th className="px-4 py-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{a.attributeDefinition.name}</td>
                          <td className="px-4 py-2 text-gray-500 font-mono text-xs">{a.attributeDefinition.attrKey}</td>
                          <td className="px-4 py-2 text-center">{a.isRequired ? '✓' : '—'}</td>
                          <td className="px-4 py-2 text-center">{a.displayOrder}</td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => handleRemove(a.id)} className="text-red-500 hover:text-red-700 text-xs">Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              Chọn một danh mục để xem/quản lý thuộc tính
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
