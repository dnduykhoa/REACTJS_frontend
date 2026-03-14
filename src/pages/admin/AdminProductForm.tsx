import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi, brandApi, productSpecApi, categoryAttributeApi, productVariantApi } from '../../api/j2ee';
import type { Product, Category, Brand, ProductMedia, ProductSpecification, CategoryAttribute, ProductVariant } from '../../api/j2ee/types';
import { ArrowLeft, AlertCircle, Trash2, Plus, ChevronDown } from 'lucide-react';

const inputClass = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed disabled:opacity-70';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

type VariantDraft = {
  tempId: string;
  variantId?: number;
  sku: string;
  price: string;
  stockQuantity: string;
  isActive: boolean;
  displayOrder: string;
  optionValues: Record<number, string>;
};

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

export default function AdminProductForm() {
  const { id, variantId } = useParams<{ id: string; variantId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const editingVariantId = variantId ? Number(variantId) : null;
  const isVariantEdit = editingVariantId != null && !Number.isNaN(editingVariantId);

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
  const [variantRows, setVariantRows] = useState<VariantDraft[]>([]);
  const [variantAttrDraftIds, setVariantAttrDraftIds] = useState<number[]>([]);
  const [variantAttrIds, setVariantAttrIds] = useState<number[]>([]);
  const [variantAttrDropdownOpen, setVariantAttrDropdownOpen] = useState(false);
  const [variantFiles, setVariantFiles] = useState<Record<string, File[]>>({});
  const [variantExistingMedia, setVariantExistingMedia] = useState<Record<string, ProductMedia[]>>({});
  const [variantDeleteMediaIds, setVariantDeleteMediaIds] = useState<Record<string, number[]>>({});

  useEffect(() => {
    Promise.all([categoryApi.getAll(), brandApi.getAll()]).then(([c, b]) => {
      setCategories(c.data.data);
      setBrands(b.data.data);
    });

    if (isEdit && id) {
      setLoading(true);
      Promise.all([
        productApi.getById(Number(id)),
        productSpecApi.getByProduct(Number(id)),
        productVariantApi.getByProduct(Number(id)).catch(() => null),
      ])
        .then(async ([pRes, sRes, vRes]) => {
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

          const variants: ProductVariant[] = vRes?.data?.data || [];
          const initialVariantMedia: Record<string, ProductMedia[]> = {};
          setVariantRows(
            variants.map((variant) => {
              const optionValues: Record<number, string> = {};
              for (const value of variant.values || []) {
                const defId = value.attributeDefinition?.id;
                if (defId == null) continue;
                if (value.attrValue != null && value.attrValue !== '') {
                  optionValues[defId] = value.attrValue;
                  continue;
                }
                if (value.valueNumber != null) {
                  optionValues[defId] = String(value.valueNumber);
                }
              }
              const tempId = `existing-${variant.id}`;
              initialVariantMedia[tempId] = variant.media || [];
              return {
                tempId,
                variantId: variant.id,
                sku: variant.sku,
                price: String(variant.price),
                stockQuantity: String(variant.stockQuantity),
                isActive: variant.isActive,
                displayOrder: String(variant.displayOrder),
                optionValues,
              };
            })
          );

          if (isVariantEdit && !variants.some((variant) => variant.id === editingVariantId)) {
            setError('Không tìm thấy biến thể cần chỉnh sửa');
          }

          setVariantExistingMedia(initialVariantMedia);
          setVariantDeleteMediaIds({});
          setVariantFiles({});

          // Load category attributes and pre-populate values from existing specs
          if (p.category) {
            const caRes = await categoryAttributeApi.getByCategory(p.category.id);
            const catAttrs = caRes.data.data;
            setCategoryAttributes(catAttrs);

            const defaultAttrIds = catAttrs
              .map((ca: CategoryAttribute) => ca.attributeDefinition.id)
              .filter((idValue: number, index: number, arr: number[]) => arr.indexOf(idValue) === index);

            const usedVariantAttrIds = variants
              .flatMap((variant) => (variant.values || []).map((value) => value.attributeDefinition?.id))
              .filter((idValue): idValue is number => idValue != null)
              .filter((idValue, index, arr) => arr.indexOf(idValue) === index);

            const initialVariantAttrIds = usedVariantAttrIds.length > 0 ? usedVariantAttrIds : defaultAttrIds;
            setVariantAttrDraftIds(initialVariantAttrIds);
            setVariantAttrIds(initialVariantAttrIds);

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
  }, [editingVariantId, id, isEdit, isVariantEdit]);

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
        const nextAttributes: CategoryAttribute[] = res.data.data;
        setCategoryAttributes(nextAttributes);
        const defaultAttrIds = nextAttributes
          .map((ca) => ca.attributeDefinition.id)
          .filter((idValue, index, arr) => arr.indexOf(idValue) === index);
        setVariantAttrDraftIds(defaultAttrIds);
        setVariantAttrIds(defaultAttrIds);
        // Reset values, keeping only those that match the new category's attributes
        setAttrValues({});
        setAttrSpecIds({});
      });
    } else {
      setCategoryAttributes([]);
      setVariantAttrDraftIds([]);
      setVariantAttrIds([]);
      setAttrValues({});
      setAttrSpecIds({});
    }
  };

  const toggleVariantAttributeDraft = (attrDefId: number) => {
    setVariantAttrDraftIds((prev) =>
      prev.includes(attrDefId)
        ? prev.filter((idValue) => idValue !== attrDefId)
        : [...prev, attrDefId]
    );
  };

  const applyVariantAttributes = () => {
    setVariantAttrIds(variantAttrDraftIds);
    setVariantAttrDropdownOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const rowsToPersist = isVariantEdit
        ? variantRows.filter((row) => row.variantId === editingVariantId)
        : variantRows;

      const normalizedVariantRows = rowsToPersist.filter(
        (row) => row.sku.trim() !== '' && Number(row.price) > 0
      );

      if (!isVariantEdit && variantRows.length > 0 && normalizedVariantRows.length === 0) {
        throw new Error('Vui lòng nhập ít nhất 1 biến thể hợp lệ (SKU và giá > 0)');
      }

      const parentPrice = normalizedVariantRows.length > 0
        ? Math.min(...normalizedVariantRows.map((row) => Number(row.price)))
        : Number(form.price);

      const parentStockQuantity = normalizedVariantRows.length > 0
        ? normalizedVariantRows.reduce((sum, row) => {
          const stock = Number(row.stockQuantity || '0');
          return sum + (Number.isNaN(stock) ? 0 : Math.max(0, stock));
        }, 0)
        : Number(form.stockQuantity);

      const params = {
        name: form.name,
        description: form.description || undefined,
        price: parentPrice,
        stockQuantity: parentStockQuantity,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        brandId: form.brandId ? Number(form.brandId) : undefined,
        isActive: form.isActive,
        files,
        deleteMediaIds,
      };

      let productId: number;
      if (isEdit && id) {
        if (!isVariantEdit) {
          await productApi.update(Number(id), params);
        }
        productId = Number(id);
      } else {
        const createRes = await productApi.create(params);
        productId = createRes.data.data.id;
      }

      // Save category attribute values as product specifications
      if (!isVariantEdit) {
        for (const ca of categoryAttributes.filter((ca) => !variantAttrIds.includes(ca.attributeDefinition.id))) {
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
      }

      if (normalizedVariantRows.length > 0 && variantAttrIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 thuộc tính dùng cho biến thể');
      }

      const selectedVariantAttributes = categoryAttributes
        .filter((ca) => variantAttrIds.includes(ca.attributeDefinition.id))
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const existingVariantsRes = isEdit ? await productVariantApi.getByProduct(productId) : null;
      const existingVariantIds = new Set((existingVariantsRes?.data?.data || []).map((variant) => variant.id));
      const keptVariantIds = new Set<number>();

      for (const row of normalizedVariantRows) {
        const seenAttrDefIds = new Set<number>();
        const rawValues = selectedVariantAttributes
          .map((ca) => {
            const def = ca.attributeDefinition;
            if (seenAttrDefIds.has(def.id)) return null;
            seenAttrDefIds.add(def.id);
            const optionValue = (row.optionValues[def.id] ?? '').trim();
            if (!optionValue) return null;

            if (def.dataType === 'NUMBER') {
              const numericValue = Number(optionValue);
              if (Number.isNaN(numericValue)) {
                throw new Error(`Giá trị biến thể của ${def.name} phải là số`);
              }
              return {
                attrDefId: def.id,
                valueNumber: numericValue,
                displayOrder: ca.displayOrder,
              };
            }

            return {
              attrDefId: def.id,
              attrValue: optionValue,
              displayOrder: ca.displayOrder,
            };
          });

        const values = rawValues.filter((value) => value != null);

        if (values.length === 0) continue;

        let savedVariantId: number;
        if (row.variantId != null && existingVariantIds.has(row.variantId)) {
          const updated = await productVariantApi.update(productId, row.variantId, {
            sku: row.sku.trim(),
            price: Number(row.price),
            stockQuantity: Number(row.stockQuantity || '0'),
            isActive: row.isActive,
            displayOrder: Number(row.displayOrder || '0'),
            values,
          });
          savedVariantId = updated.data.data.id;
        } else {
          const created = await productVariantApi.create(productId, {
            sku: row.sku.trim(),
            price: Number(row.price),
            stockQuantity: Number(row.stockQuantity || '0'),
            isActive: row.isActive,
            displayOrder: Number(row.displayOrder || '0'),
            values,
          });
          savedVariantId = created.data.data.id;
        }

        keptVariantIds.add(savedVariantId);

        const mediaToDelete = variantDeleteMediaIds[row.tempId] || [];
        for (const mediaId of mediaToDelete) {
          await productVariantApi.deleteMedia(productId, savedVariantId, mediaId);
        }

        const filesForVariant = variantFiles[row.tempId] || [];
        if (filesForVariant.length > 0) {
          await productVariantApi.uploadMedia(productId, savedVariantId, filesForVariant, true);
        }
      }

      if (isEdit && existingVariantsRes && !isVariantEdit) {
        for (const existingVariant of existingVariantsRes.data.data) {
          if (!keptVariantIds.has(existingVariant.id)) {
            await productVariantApi.delete(productId, existingVariant.id);
          }
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

  const toggleVariantDeleteMedia = (tempId: string, mediaId: number) => {
    setVariantDeleteMediaIds((prev) => {
      const current = prev[tempId] || [];
      const next = current.includes(mediaId)
        ? current.filter((id) => id !== mediaId)
        : [...current, mediaId];
      return { ...prev, [tempId]: next };
    });
  };

  const handleVariantFilesChange = (tempId: string, files: File[]) => {
    setVariantFiles((prev) => ({ ...prev, [tempId]: files }));
  };

  const toggleDeleteMedia = (mediaId: number) => {
    setDeleteMediaIds((prev) =>
      prev.includes(mediaId) ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]
    );
  };

  const addVariantRow = () => {
    setVariantRows((prev) => [
      ...prev,
      {
        tempId: `new-${Date.now()}-${prev.length}`,
        sku: '',
        price: '',
        stockQuantity: '0',
        isActive: true,
        displayOrder: String(prev.length),
        optionValues: {},
      },
    ]);
  };

  const updateVariantRow = (tempId: string, patch: Partial<VariantDraft>) => {
    setVariantRows((prev) => prev.map((row) => (row.tempId === tempId ? { ...row, ...patch } : row)));
  };

  const removeVariantRow = (tempId: string) => {
    setVariantRows((prev) => prev.filter((row) => row.tempId !== tempId));
    setVariantFiles((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
    setVariantExistingMedia((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
    setVariantDeleteMediaIds((prev) => {
      const next = { ...prev };
      delete next[tempId];
      return next;
    });
  };

  const selectedVariantAttributes = categoryAttributes
    .filter((ca) => variantAttrIds.includes(ca.attributeDefinition.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const visibleVariantRows = isVariantEdit
    ? variantRows.filter((row) => row.variantId === editingVariantId)
    : variantRows;

  const sortedCategoryAttributes = categoryAttributes
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const nonVariantCategoryAttrs = categoryAttributes
    .filter((ca) => !variantAttrIds.includes(ca.attributeDefinition.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const variantRowsForParentPricing = useMemo(
    () => variantRows.filter((row) => row.sku.trim() !== '' && Number(row.price) > 0),
    [variantRows]
  );

  const shouldAutoFillParentPricing = !isVariantEdit && variantRows.length > 0;

  const autoParentPrice = variantRowsForParentPricing.length > 0
    ? Math.min(...variantRowsForParentPricing.map((row) => Number(row.price)))
    : null;

  const autoParentStock = variantRowsForParentPricing.reduce((sum, row) => {
    const stock = Number(row.stockQuantity || '0');
    return sum + (Number.isNaN(stock) ? 0 : Math.max(0, stock));
  }, 0);

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
            {isVariantEdit
              ? 'Chỉnh sửa biến thể sản phẩm'
              : isEdit
              ? 'Chỉnh sửa sản phẩm'
              : 'Thêm sản phẩm mới'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isVariantEdit ? 'Thông tin sản phẩm cha chỉ xem. Chỉ có thể chỉnh sửa thông tin biến thể bên dưới.' : 'Danh sách sản phẩm'}
          </p>
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

          {isVariantEdit && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              Đang chỉnh sửa biến thể — thông tin sản phẩm cha chỉ xem, không thể thay đổi.
            </p>
          )}

          <fieldset disabled={isVariantEdit} className={isVariantEdit ? 'space-y-4 opacity-60' : 'space-y-4'}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Giá (VNĐ) <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required={!shouldAutoFillParentPricing}
                min={0}
                value={shouldAutoFillParentPricing ? (autoParentPrice != null ? String(autoParentPrice) : '') : form.price}
                onChange={set('price')}
                disabled={shouldAutoFillParentPricing}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Số lượng kho <span className="text-rose-500">*</span></label>
              <input
                type="number"
                required={!shouldAutoFillParentPricing}
                min={0}
                value={shouldAutoFillParentPricing ? String(autoParentStock) : form.stockQuantity}
                onChange={handleStockQuantityChange}
                disabled={shouldAutoFillParentPricing}
                className={inputClass}
              />
              {shouldAutoFillParentPricing && (
                <p className="text-xs text-slate-500 mt-1">
                  Tự động theo biến thể: giá thấp nhất và tổng tồn kho.
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-sm text-slate-700">Hiển thị sản phẩm</span>
          </label>
          </fieldset>
        </div>

        {/* Variants */}
        {categoryAttributes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Biến thể sản phẩm</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isVariantEdit
                    ? 'Bạn đang chỉnh sửa riêng một biến thể, các biến thể khác sẽ được giữ nguyên.'
                    : 'Mỗi biến thể có SKU, giá, tồn kho và các lựa chọn riêng'}
                </p>
              </div>
              {!isVariantEdit && (
                <button
                  type="button"
                  onClick={addVariantRow}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-3 py-2 text-xs font-semibold hover:bg-indigo-700 transition"
                >
                  <Plus size={12} /> Thêm biến thể
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">Thuộc tính biến thể</p>
                <span className="text-xs text-slate-500">Đã chọn: {variantAttrIds.length}</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="relative md:w-80 lg:w-96 w-full">
                  <button
                    type="button"
                    onClick={() => setVariantAttrDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:border-slate-300"
                  >
                    <span className="truncate text-left">
                      {variantAttrDraftIds.length > 0
                        ? `Đã chọn nháp ${variantAttrDraftIds.length} thuộc tính`
                        : 'Chọn thuộc tính phân biệt'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${variantAttrDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {variantAttrDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-sm max-h-64 overflow-auto">
                      <div className="space-y-1">
                        {sortedCategoryAttributes.map((ca) => {
                          const def = ca.attributeDefinition;
                          const checked = variantAttrDraftIds.includes(def.id);
                          return (
                            <label key={`variant-attr-${def.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleVariantAttributeDraft(def.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{def.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVariantAttrDraftIds(sortedCategoryAttributes.map((ca) => ca.attributeDefinition.id))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariantAttrDraftIds([])}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white"
                  >
                    Bỏ chọn
                  </button>
                  <button
                    type="button"
                    onClick={applyVariantAttributes}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>

            {visibleVariantRows.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có biến thể nào.</p>
            ) : (
              <div className="space-y-3">
                {visibleVariantRows.map((row, index) => (
                  <div key={row.tempId} className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        {isVariantEdit ? 'Biến thể đang chỉnh sửa' : `Biến thể #${index + 1}`}
                      </p>
                      {!isVariantEdit && (
                        <button
                          type="button"
                          onClick={() => removeVariantRow(row.tempId)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className={labelClass}>SKU</label>
                        <input
                          value={row.sku}
                          onChange={(e) => updateVariantRow(row.tempId, { sku: e.target.value })}
                          className={inputClass}
                          placeholder="IP15-128-DB"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Giá</label>
                        <input
                          type="number"
                          min={0}
                          value={row.price}
                          onChange={(e) => updateVariantRow(row.tempId, { price: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Tồn kho</label>
                        <input
                          type="number"
                          min={0}
                          value={row.stockQuantity}
                          onChange={(e) => updateVariantRow(row.tempId, { stockQuantity: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Thứ tự</label>
                        <input
                          type="number"
                          min={0}
                          value={row.displayOrder}
                          onChange={(e) => updateVariantRow(row.tempId, { displayOrder: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedVariantAttributes
                        .map((ca) => {
                          const def = ca.attributeDefinition;
                          return (
                            <div key={`${row.tempId}-${def.id}`}>
                              <label className={labelClass}>{def.name}</label>
                              {def.dataType === 'BOOLEAN' ? (
                                <select
                                  value={row.optionValues[def.id] || ''}
                                  onChange={(e) =>
                                    updateVariantRow(row.tempId, {
                                      optionValues: {
                                        ...row.optionValues,
                                        [def.id]: e.target.value,
                                      },
                                    })
                                  }
                                  className={inputClass}
                                >
                                  <option value="">-- Chọn --</option>
                                  <option value="true">Có</option>
                                  <option value="false">Không</option>
                                </select>
                              ) : def.dataType === 'NUMBER' ? (
                                <input
                                  type="number"
                                  value={row.optionValues[def.id] || ''}
                                  onChange={(e) =>
                                    updateVariantRow(row.tempId, {
                                      optionValues: {
                                        ...row.optionValues,
                                        [def.id]: e.target.value,
                                      },
                                    })
                                  }
                                  className={inputClass}
                                  placeholder={`Nhập${def.unit ? ' ' + def.unit : ''}`}
                                />
                              ) : (
                                <input
                                  value={row.optionValues[def.id] || ''}
                                  onChange={(e) =>
                                    updateVariantRow(row.tempId, {
                                      optionValues: {
                                        ...row.optionValues,
                                        [def.id]: e.target.value,
                                      },
                                    })
                                  }
                                  className={inputClass}
                                  placeholder={`Nhập lựa chọn ${def.name.toLowerCase()}`}
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) => updateVariantRow(row.tempId, { isActive: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700">Biến thể đang hoạt động</span>
                    </label>

                    <div className="space-y-2">
                      {((variantExistingMedia[row.tempId] || []).length > 0) && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Ảnh biến thể hiện tại (tick để xóa):</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {(variantExistingMedia[row.tempId] || []).map((m) => (
                              <div key={m.id} className="relative">
                                <img
                                  src={resolveUrl(m.mediaUrl)}
                                  alt=""
                                  className={`w-16 h-16 object-cover rounded-lg border-2 transition ${
                                    (variantDeleteMediaIds[row.tempId] || []).includes(m.id)
                                      ? 'border-rose-400 opacity-50'
                                      : 'border-slate-200'
                                  }`}
                                />
                                <input
                                  type="checkbox"
                                  checked={(variantDeleteMediaIds[row.tempId] || []).includes(m.id)}
                                  onChange={() => toggleVariantDeleteMedia(row.tempId, m.id)}
                                  className="absolute top-1 right-1"
                                />
                                {m.isPrimary && (
                                  <span className="absolute bottom-0 left-0 bg-indigo-600 text-white text-[10px] px-1 py-0.5 rounded-br-lg">
                                    Chính
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className={labelClass}>Upload ảnh riêng cho biến thể</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleVariantFilesChange(row.tempId, Array.from(e.target.files || []))}
                          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-300`}
                        />
                        {(variantFiles[row.tempId] || []).length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            Đã chọn {(variantFiles[row.tempId] || []).length} ảnh mới cho biến thể này.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Attributes */}
        {nonVariantCategoryAttrs.length > 0 && !isVariantEdit && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">Thuộc tính sản phẩm</h2>
              <p className="text-xs text-slate-500 mt-0.5">Các thuộc tính không phải biến thể theo danh mục đã chọn</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nonVariantCategoryAttrs.map((ca) => {
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
                          rows={1}
                          value={val}
                          onChange={(e) => {
                            setVal(e.target.value);
                            const el = e.target;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          onFocus={(e) => {
                            const el = e.target;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }}
                          required={ca.isRequired}
                          placeholder={`Nhập ${def.name.toLowerCase()}`}
                          className={`${inputClass} resize-none overflow-hidden`}
                          style={{ minHeight: '2.625rem' }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Media */}
        {!isVariantEdit && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Hình ảnh / Video</h2>

          {existingMedia.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Ảnh hiện tại (tick để xóa):</p>
              <div className="flex flex-wrap items-center gap-2">
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
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-300`}
            />
          </div>
        </div>
        )}

        {/* Specs (edit mode only) */}
        {isEdit && !isVariantEdit && (
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
