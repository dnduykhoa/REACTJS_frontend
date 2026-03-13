import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi, brandApi, productSpecApi, categoryAttributeApi } from '../../api/j2ee';
import type { Product, Category, Brand, ProductMedia, ProductSpecification, CategoryAttribute } from '../../api/j2ee/types';
import { ArrowLeft, AlertCircle, Trash2, Plus } from 'lucide-react';

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
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

  // Category attribute state
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  // attrDefId → input value string
  const [attrValues, setAttrValues] = useState<Record<number, string>>({});
  // attrDefId → existing spec id (for update/delete in edit mode)
  const [attrSpecIds, setAttrSpecIds] = useState<Record<number, number>>({});

  useEffect(() => {
    Promise.all([categoryApi.getAll(), brandApi.getAll()]).then(([c, b]) => {
      setCategories(c.data.data);
      setBrands(b.data.data);
    });

    if (isEdit && id) {
      setLoading(true);
      Promise.all([productApi.getById(Number(id)), productSpecApi.getByProduct(Number(id))])
        .then(async ([pRes, sRes]) => {
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
          const allSpecs: ProductSpecification[] = sRes.data.data;
          setSpecs(allSpecs);

          // Load category attributes and pre-populate values from existing specs
          if (p.category) {
            const caRes = await categoryAttributeApi.getByCategory(p.category.id);
            const catAttrs = caRes.data.data;
            setCategoryAttributes(catAttrs);

            const valMap: Record<number, string> = {};
            const specIdMap: Record<number, number> = {};
            allSpecs.forEach((spec) => {
              if (spec.attributeDefinition) {
                const defId = spec.attributeDefinition.id;
                const isNumber = spec.attributeDefinition.dataType === 'NUMBER';
                valMap[defId] = isNumber
                  ? spec.valueNumber != null ? String(spec.valueNumber) : ''
                  : spec.specValue || '';
                specIdMap[defId] = spec.id;
              }
            });
            setAttrValues(valMap);
            setAttrSpecIds(specIdMap);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleStockQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = Number(e.target.value);
    setForm((prev) => ({
      ...prev,
      stockQuantity: e.target.value,
      // Tự động kích hoạt lại sản phẩm khi có hàng trong kho
      isActive: qty > 0 ? true : prev.isActive,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, categoryId: e.target.value }));
    const catId = Number(e.target.value);
    if (catId) {
      categoryAttributeApi.getByCategory(catId).then((res) => {
        setCategoryAttributes(res.data.data);
        // Reset values, keeping only those that match the new category's attributes
        setAttrValues({});
        setAttrSpecIds({});
      });
    } else {
      setCategoryAttributes([]);
      setAttrValues({});
      setAttrSpecIds({});
    }
  };

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

      let productId: number;
      if (isEdit && id) {
        await productApi.update(Number(id), params);
        productId = Number(id);
      } else {
        const createRes = await productApi.create(params);
        productId = createRes.data.data.id;
      }

      // Save category attribute values as product specifications
      for (const ca of categoryAttributes) {
        const def = ca.attributeDefinition;
        const val = (attrValues[def.id] ?? '').trim();
        const existingSpecId = attrSpecIds[def.id];
        const isNumber = def.dataType === 'NUMBER';

        if (existingSpecId) {
          if (val === '') {
            await productSpecApi.delete(productId, existingSpecId);
          } else {
            await productSpecApi.update(productId, existingSpecId, {
              specValue: isNumber ? undefined : val,
              valueNumber: isNumber ? Number(val) : undefined,
            });
          }
        } else if (val !== '') {
          await productSpecApi.add(productId, {
            attrDefId: def.id,
            specValue: isNumber ? undefined : val,
            valueNumber: isNumber ? Number(val) : undefined,
            displayOrder: ca.displayOrder,
          });
        }
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
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/products" className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Danh sách sản phẩm</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Thông tin cơ bản</h2>

          <div>
            <label className={labelClass}>Tên sản phẩm <span className="text-rose-500">*</span></label>
            <input type="text" required value={form.name} onChange={set('name')} className={inputClass} placeholder="Nhập tên sản phẩm" />
          </div>

          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea
              rows={5}
              value={form.description}
              onChange={set('description')}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const nextValue = `${target.value.slice(0, start)}\n${target.value.slice(end)}`;
                setForm((prev) => ({ ...prev, description: nextValue }));
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + 1;
                });
              }}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Giá (VNĐ) <span className="text-rose-500">*</span></label>
              <input type="number" required min={0} value={form.price} onChange={set('price')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Số lượng kho <span className="text-rose-500">*</span></label>
              <input type="number" required min={0} value={form.stockQuantity} onChange={handleStockQuantityChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Danh mục</label>
              <select value={form.categoryId} onChange={handleCategoryChange} className={inputClass}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Thương hiệu</label>
              <select value={form.brandId} onChange={set('brandId')} className={inputClass}>
                <option value="">-- Chọn thương hiệu --</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-slate-700">Hiển thị sản phẩm</span>
          </label>
        </div>

        {/* Category Attributes */}
        {categoryAttributes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">Thuộc tính sản phẩm</h2>
              <p className="text-xs text-slate-500 mt-0.5">Các thuộc tính theo danh mục đã chọn</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryAttributes
                .slice()
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((ca) => {
                  const def = ca.attributeDefinition;
                  const val = attrValues[def.id] ?? '';
                  const setVal = (v: string) =>
                    setAttrValues((prev) => ({ ...prev, [def.id]: v }));
                  const fieldLabel = `${def.name}${def.unit ? ` (${def.unit})` : ''}`;
                  return (
                    <div key={ca.id}>
                      <label className={labelClass}>
                        {fieldLabel}
                        {ca.isRequired && <span className="text-rose-500 ml-0.5">*</span>}
                        {def.attributeGroup && (
                          <span className="ml-1.5 text-xs text-slate-400 font-normal">
                            — {def.attributeGroup.name}
                          </span>
                        )}
                      </label>
                      {def.dataType === 'BOOLEAN' ? (
                        <select
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          required={ca.isRequired}
                          className={inputClass}
                        >
                          <option value="">-- Chọn --</option>
                          <option value="true">Có</option>
                          <option value="false">Không</option>
                        </select>
                      ) : def.dataType === 'NUMBER' ? (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          required={ca.isRequired}
                          placeholder={`Nhập${def.unit ? ' ' + def.unit : ''}`}
                          className={inputClass}
                        />
                      ) : (
                        <textarea
                          rows={3}
                          value={val}
                          onChange={(e) => setVal(e.target.value)}
                          required={ca.isRequired}
                          placeholder={`Nhập ${def.name.toLowerCase()}`}
                          className={inputClass}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Media */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Hình ảnh / Video</h2>

          {existingMedia.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Ảnh hiện tại (tick để xóa):</p>
              <div className="flex flex-wrap gap-2">
                {existingMedia.map((m) => (
                  <div key={m.id} className="relative">
                    <img
                      src={resolveUrl(m.mediaUrl)}
                      alt=""
                      className={`w-20 h-20 object-cover rounded-xl border-2 transition ${
                        deleteMediaIds.includes(m.id) ? 'border-rose-400 opacity-50' : 'border-slate-200'
                      }`}
                    />
                    <input
                      type="checkbox"
                      checked={deleteMediaIds.includes(m.id)}
                      onChange={() => toggleDeleteMedia(m.id)}
                      className="absolute top-1 right-1"
                      title="Xóa ảnh này"
                    />
                    {m.isPrimary && (
                      <span className="absolute bottom-0 left-0 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-br-xl rounded-tl-none rounded-tr-none">
                        Chính
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Upload ảnh / video mới</label>
            <div className="border border-dashed border-slate-300 rounded-xl px-4 py-4 bg-slate-50 hover:bg-slate-100 transition">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="text-sm text-slate-600 w-full"
              />
            </div>
          </div>
        </div>

        {/* Specs (edit mode only) */}
        {isEdit && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Thông số kỹ thuật</h2>

            {specs.length > 0 && (
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá trị</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specs.map((spec) => (
                      <tr key={spec.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">
                          {spec.attributeDefinition?.name || spec.specKey || '—'}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {spec.specValue ||
                            (spec.valueNumber != null
                              ? `${spec.valueNumber}${spec.attributeDefinition?.unit ? ' ' + spec.attributeDefinition.unit : ''}`
                              : '—')}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSpec(spec.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Thêm thông số mới:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Tên (specKey)"
                  value={newSpec.specKey}
                  onChange={(e) => setNewSpec({ ...newSpec, specKey: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <input
                  type="text"
                  placeholder="Giá trị text"
                  value={newSpec.specValue}
                  onChange={(e) => setNewSpec({ ...newSpec, specValue: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <input
                  type="number"
                  placeholder="Giá trị số"
                  value={newSpec.valueNumber}
                  onChange={(e) => setNewSpec({ ...newSpec, valueNumber: e.target.value })}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleAddSpec}
                  disabled={addingSpec}
                  className="flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-xl px-3 py-2 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  <Plus size={12} /> {addingSpec ? '...' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Thêm sản phẩm'}
          </button>
          <Link
            to="/admin/products"
            className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-200 transition"
          >
            Hủy
          </Link>
        </div>
      </form>
    </div>
  );
}
