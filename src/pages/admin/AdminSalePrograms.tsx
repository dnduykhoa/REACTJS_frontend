import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Plus, Power, Tag, Trash2, X } from 'lucide-react';
import { getApiErrorMessage, productApi, saleProgramApi } from '../../api/j2ee';
import type {
  DiscountType,
  Product,
  SaleConditionType,
  SaleProgram,
  SaleProgramRequest,
} from '../../api/j2ee/types';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 12;

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

type ConditionForm = {
  key: string;
  conditionType: SaleConditionType;
  conditionValue: string;
  description: string;
};

type FormState = {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  applyAllProducts: boolean;
  selectedProductIds: number[];
  conditions: ConditionForm[];
};

const emptyForm = (): FormState => ({
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  maxDiscountAmount: '',
  startDate: '',
  endDate: '',
  isActive: true,
  applyAllProducts: true,
  selectedProductIds: [],
  conditions: [],
});

function toDatetimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function discountLabel(discountType: DiscountType, discountValue: number) {
  if (discountType === 'PERCENTAGE') return `${discountValue}%`;
  return `${Number(discountValue).toLocaleString('vi-VN')}₫`;
}

export default function AdminSalePrograms() {
  const [items, setItems] = useState<SaleProgram[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SaleProgram | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [page, setPage] = useState(1);

  const allProductIds = useMemo(() => products.map((p) => p.id), [products]);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([saleProgramApi.getAll(), productApi.getAll()])
      .then(([saleRes, productRes]) => {
        setItems(saleRes.data.data || []);
        setProducts(productRes.data.data || []);
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Không thể tải danh sách chương trình sale.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Disable scroll khi modal mở
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: SaleProgram) => {
    const productIdSet = new Set(item.productIds || []);
    const isAll = allProductIds.length > 0 && allProductIds.every((id) => productIdSet.has(id));

    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || '',
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxDiscountAmount: item.maxDiscountAmount == null ? '' : String(item.maxDiscountAmount),
      startDate: toDatetimeLocal(item.startDate),
      endDate: toDatetimeLocal(item.endDate),
      isActive: item.isActive,
      applyAllProducts: isAll,
      selectedProductIds: isAll ? [] : item.productIds || [],
      conditions: (item.conditions || []).map((c, index) => ({
        key: `${c.conditionType}-${index}-${Date.now()}`,
        conditionType: c.conditionType,
        conditionValue: c.conditionValue,
        description: c.description || '',
      })),
    });
    setError('');
    setShowForm(true);
  };

  const toggleProduct = (productId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedProductIds: prev.selectedProductIds.includes(productId)
        ? prev.selectedProductIds.filter((id) => id !== productId)
        : [...prev.selectedProductIds, productId],
    }));
  };

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        {
          key: `new-${Date.now()}-${prev.conditions.length}`,
          conditionType: 'PAYMENT_METHOD',
          conditionValue: '',
          description: '',
        },
      ],
    }));
  };

  const updateCondition = (key: string, field: keyof Omit<ConditionForm, 'key'>, value: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition) =>
        condition.key === key ? { ...condition, [field]: value } : condition
      ),
    }));
  };

  const removeCondition = (key: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((condition) => condition.key !== key),
    }));
  };

  const handleSave = async () => {
    setError('');

    if (!form.name.trim()) {
      setError('Tên chương trình không được để trống.');
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError('Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc.');
      return;
    }

    const invalidCondition = form.conditions.find(
      (condition) => !condition.conditionType || !condition.conditionValue.trim()
    );

    if (invalidCondition) {
      setError('Mỗi điều kiện phải có loại điều kiện và giá trị điều kiện.');
      return;
    }

    const payload: SaleProgramRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount:
        form.maxDiscountAmount.trim() === '' ? undefined : Number(form.maxDiscountAmount),
      startDate: toIso(form.startDate),
      endDate: toIso(form.endDate),
      isActive: form.isActive,
      productIds: form.applyAllProducts ? allProductIds : form.selectedProductIds,
      conditions:
        form.conditions.length > 0
          ? form.conditions.map((condition) => ({
              conditionType: condition.conditionType,
              conditionValue: condition.conditionValue.trim(),
              description: condition.description.trim() || undefined,
            }))
          : undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await saleProgramApi.update(editing.id, payload);
      } else {
        await saleProgramApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Lưu chương trình sale thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await saleProgramApi.toggle(id);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể đổi trạng thái chương trình sale.'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa chương trình sale này?')) return;
    try {
      await saleProgramApi.delete(id);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể xóa chương trình sale.'));
    }
  };

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chương trình giảm giá</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} chương trình</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm chương trình
        </button>
      </div>

      {error && !showForm && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 min-h-screen overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl max-h-[96vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editing ? 'Chỉnh sửa chương trình sale' : 'Thêm chương trình sale'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-6">

            {error && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
                <AlertCircle size={15} className="shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tên chương trình *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Loại giảm giá *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))
                    }
                    className={inputClass}
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (₫)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Mô tả</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Giá trị giảm *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.discountValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Cho phép xóa để nhập giá trị mới
                      if (val === '') {
                        setForm((prev) => ({ ...prev, discountValue: 0 }));
                      } else {
                        const numVal = Number(val);
                        if (numVal >= 0) {
                          setForm((prev) => ({ ...prev, discountValue: numVal }));
                        }
                      }
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Giảm tối đa</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.maxDiscountAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || Number(val) >= 0) {
                        setForm((prev) => ({ ...prev, maxDiscountAmount: val }));
                      }
                    }}
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={labelClass}>Bắt đầu *</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Kết thúc *</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={form.applyAllProducts}
                    onChange={(e) => setForm((prev) => ({ ...prev, applyAllProducts: e.target.checked }))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Áp dụng cho toàn bộ sản phẩm
                </label>
                <p className="text-xs text-slate-400 mt-1">
                  Khi bật tuỳ chọn này, FE sẽ gửi toàn bộ productIds để tránh lệch nghĩa với BE.
                </p>

                {!form.applyAllProducts && (
                  <div className="mt-3 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-3 space-y-2">
                    {products.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.selectedProductIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">#{product.id} - {product.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Điều kiện áp dụng</h4>
                  <button
                    type="button"
                    onClick={addCondition}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Thêm điều kiện
                  </button>
                </div>

                {form.conditions.length === 0 && (
                  <p className="text-xs text-slate-400">Không có điều kiện bổ sung.</p>
                )}

                {form.conditions.map((condition) => (
                  <div key={condition.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                    <div className="md:col-span-3">
                      <select
                        value={condition.conditionType}
                        onChange={(e) =>
                          updateCondition(
                            condition.key,
                            'conditionType',
                            e.target.value as SaleConditionType
                          )
                        }
                        className={inputClass}
                      >
                        <option value="PAYMENT_METHOD">Phương thức thanh toán</option>
                        <option value="MIN_ORDER_AMOUNT">Giá trị đơn tối thiểu</option>
                        <option value="MIN_QUANTITY">Số lượng tối thiểu</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <input
                        value={condition.conditionValue}
                        onChange={(e) => updateCondition(condition.key, 'conditionValue', e.target.value)}
                        className={inputClass}
                        placeholder="Giá trị điều kiện"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <input
                        value={condition.description}
                        onChange={(e) => updateCondition(condition.key, 'description', e.target.value)}
                        className={inputClass}
                        placeholder="Mô tả điều kiện (không bắt buộc)"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeCondition(condition.key)}
                        className="w-full px-2 py-2 rounded-xl text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={14} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Kích hoạt
              </label>
            </div>
            </div>

            <div className="flex gap-2 p-6 border-t border-slate-100 bg-white">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
              >
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Giảm giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Áp dụng</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Tag size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có chương trình sale</p>
                  </td>
                </tr>
              )}
              {paginated.map((item, idx) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{item.description || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <p>{discountLabel(item.discountType, item.discountValue)}</p>
                    <p className="text-xs text-slate-400">
                      Max: {item.maxDiscountAmount == null ? '—' : `${Number(item.maxDiscountAmount).toLocaleString('vi-VN')}₫`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{formatDate(item.startDate)}</p>
                    <p>{formatDate(item.endDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 text-xs">
                    {item.productIds?.length ? `${item.productIds.length} sản phẩm` : 'Không có'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                        item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.isActive ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggle(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Bật / Tắt"
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page}
            pageCount={Math.ceil(items.length / PAGE_SIZE)}
            total={items.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
