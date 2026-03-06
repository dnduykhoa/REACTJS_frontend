import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi, brandApi, productSpecApi } from '../../api/j2ee';
import type { Product, Category, Brand, ProductMedia, ProductSpecification } from '../../api/j2ee/types';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function resolveUrl(url: string) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BASE_URL}/uploads/${url}`;
}

export default function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Product fields
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stockQuantity: '',
    categoryId: '',
    brandId: '',
    isActive: true,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<ProductMedia[]>([]);
  const [deleteMediaIds, setDeleteMediaIds] = useState<number[]>([]);

  // Specs state
  const [specs, setSpecs] = useState<ProductSpecification[]>([]);
  const [newSpec, setNewSpec] = useState({ specKey: '', specValue: '', valueNumber: '', displayOrder: '0' });
  const [addingSpec, setAddingSpec] = useState(false);

  useEffect(() => {
    Promise.all([categoryApi.getAll(), brandApi.getAll()]).then(([c, b]) => {
      setCategories(c.data.data);
      setBrands(b.data.data);
    });

    if (isEdit && id) {
      setLoading(true);
      Promise.all([productApi.getById(Number(id)), productSpecApi.getByProduct(Number(id))])
        .then(([pRes, sRes]) => {
          const p: Product = pRes.data.data;
          setForm({
            name: p.name,
            description: p.description || '',
            price: String(p.price),
            stockQuantity: String(p.stockQuantity),
            categoryId: p.category ? String(p.category.id) : '',
            brandId: p.brand ? String(p.brand.id) : '',
            isActive: p.isActive,
          });
          setExistingMedia(p.media || []);
          setSpecs(sRes.data.data);
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const params = {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        stockQuantity: Number(form.stockQuantity),
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        brandId: form.brandId ? Number(form.brandId) : undefined,
        isActive: form.isActive,
        files,
        deleteMediaIds,
      };

      if (isEdit && id) {
        await productApi.update(Number(id), params);
      } else {
        await productApi.create(params);
      }
      navigate('/admin/products');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Lưu thất bại'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleDeleteMedia = (mediaId: number) => {
    setDeleteMediaIds((prev) =>
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    );
  };

  const handleAddSpec = async () => {
    if (!id) return;
    if (!newSpec.specKey && !newSpec.specValue) return;
    setAddingSpec(true);
    try {
      await productSpecApi.add(Number(id), {
        specKey: newSpec.specKey || undefined,
        specValue: newSpec.specValue || undefined,
        valueNumber: newSpec.valueNumber ? Number(newSpec.valueNumber) : undefined,
        displayOrder: Number(newSpec.displayOrder),
      });
      const res = await productSpecApi.getByProduct(Number(id));
      setSpecs(res.data.data);
      setNewSpec({ specKey: '', specValue: '', valueNumber: '', displayOrder: '0' });
    } catch {
      alert('Thêm thông số thất bại');
    } finally {
      setAddingSpec(false);
    }
  };

  const handleDeleteSpec = async (specId: number) => {
    if (!id) return;
    try {
      await productSpecApi.delete(Number(id), specId);
      setSpecs((prev) => prev.filter((s) => s.id !== specId));
    } catch {
      alert('Xóa thông số thất bại');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Link to="/admin/products" className="text-blue-600 hover:underline text-sm">
          ← Danh sách sản phẩm
        </Link>
        <span className="text-gray-400">/</span>
        <h2 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </h2>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Thông tin cơ bản</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={set('name')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giá (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={form.price}
                onChange={set('price')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số lượng kho <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={form.stockQuantity}
                onChange={set('stockQuantity')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
              <select
                value={form.categoryId}
                onChange={set('categoryId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
              <select
                value={form.brandId}
                onChange={set('brandId')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn thương hiệu --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Hiển thị sản phẩm</label>
          </div>
        </div>

        {/* Media */}
        <div className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Hình ảnh / Video</h3>

          {existingMedia.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Ảnh hiện tại (tick để xóa):</p>
              <div className="flex flex-wrap gap-2">
                {existingMedia.map((m) => (
                  <div key={m.id} className="relative">
                    <img
                      src={resolveUrl(m.mediaUrl)}
                      alt=""
                      className={`w-20 h-20 object-cover rounded border-2 ${deleteMediaIds.includes(m.id) ? 'border-red-400 opacity-50' : 'border-gray-200'}`}
                    />
                    <input
                      type="checkbox"
                      checked={deleteMediaIds.includes(m.id)}
                      onChange={() => toggleDeleteMedia(m.id)}
                      className="absolute top-0.5 right-0.5"
                      title="Xóa ảnh này"
                    />
                    {m.isPrimary && (
                      <span className="absolute bottom-0 left-0 bg-blue-500 text-white text-xs px-1 rounded-br">
                        Chính
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload ảnh / video mới
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="text-sm text-gray-600"
            />
          </div>
        </div>

        {/* Specs (only in edit mode) */}
        {isEdit && (
          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <h3 className="font-semibold text-gray-700">Thông số kỹ thuật</h3>

            {specs.length > 0 && (
              <table className="w-full text-sm mb-3">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500">Tên</th>
                    <th className="px-3 py-2 text-left text-gray-500">Giá trị</th>
                    <th className="px-3 py-2 text-center text-gray-500">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.id} className="border-t border-gray-100">
                      <td className="px-3 py-1.5">
                        {spec.attributeDefinition?.name || spec.specKey || '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {spec.specValue ||
                          (spec.valueNumber != null
                            ? `${spec.valueNumber}${spec.attributeDefinition?.unit ? ' ' + spec.attributeDefinition.unit : ''}`
                            : '—')}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSpec(spec.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-500 mb-2">Thêm thông số mới:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Tên (specKey)"
                  value={newSpec.specKey}
                  onChange={(e) => setNewSpec({ ...newSpec, specKey: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Giá trị text"
                  value={newSpec.specValue}
                  onChange={(e) => setNewSpec({ ...newSpec, specValue: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Giá trị số"
                  value={newSpec.valueNumber}
                  onChange={(e) => setNewSpec({ ...newSpec, valueNumber: e.target.value })}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSpec}
                  disabled={addingSpec}
                  className="bg-blue-600 text-white rounded px-2 py-1.5 text-xs hover:bg-blue-700 disabled:opacity-60"
                >
                  {addingSpec ? '...' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm sản phẩm'}
          </button>
          <Link
            to="/admin/products"
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200"
          >
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
