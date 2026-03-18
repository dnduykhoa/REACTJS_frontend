import { useEffect, useState } from 'react';
import { AlertCircle, Pencil, Plus, Ticket, Trash2, X, Power } from 'lucide-react';
import { getApiErrorMessage, voucherApi } from '../../api/j2ee';
import type { DiscountType, Voucher, VoucherRequest, VoucherType } from '../../api/j2ee/types';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 12;

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

type FormState = {
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: string;
  minOrderAmount: string;
  voucherType: VoucherType;
  maxUsageCount: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  maxDiscountAmount: '',
  minOrderAmount: '',
  voucherType: 'SINGLE_USE',
  maxUsageCount: '',
  startDate: '',
  endDate: '',
  isActive: true,
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

function formatDate(value?: string | null) {
  if (!value) return '—';
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

function isVoucherDeleteConflict(error: unknown): boolean {
  const message = String(
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error as { message?: string })?.message ||
      ''
  ).toLowerCase();

  return (
    message.includes('delete statement conflicted') ||
    message.includes('reference constraint') ||
    message.includes('applied_voucher_id') ||
    message.includes('conflicted with the reference constraint')
  );
}

function getErrorStatus(error: unknown): number | null {
  return (error as { response?: { status?: number } })?.response?.status ?? null;
}

function getVoucherStatus(item: Voucher): 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED' {
  const usageCount = item.usageCount ?? 0;
  const maxUsageCount = item.maxUsageCount;
  const isExhausted = maxUsageCount != null && usageCount >= maxUsageCount;

  if (isExhausted) return 'EXHAUSTED';
  if (item.isActive) return 'ACTIVE';
  return 'INACTIVE';
}

export default function AdminVouchers() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setError('');
    voucherApi
      .getAll()
      .then((res) => setItems(res.data.data || []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Không thể tải danh sách voucher.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: Voucher) => {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || '',
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxDiscountAmount: item.maxDiscountAmount == null ? '' : String(item.maxDiscountAmount),
      minOrderAmount: item.minOrderAmount == null ? '' : String(item.minOrderAmount),
      voucherType: item.voucherType,
      maxUsageCount: item.maxUsageCount == null ? '' : String(item.maxUsageCount),
      startDate: toDatetimeLocal(item.startDate),
      endDate: toDatetimeLocal(item.endDate),
      isActive: item.isActive,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    setError('');

    if (!form.code.trim() || !form.name.trim()) {
      setError('Code và tên voucher là bắt buộc.');
      return;
    }

    const payload: VoucherRequest = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountAmount:
        form.maxDiscountAmount.trim() === '' ? undefined : Number(form.maxDiscountAmount),
      minOrderAmount: form.minOrderAmount.trim() === '' ? undefined : Number(form.minOrderAmount),
      voucherType: form.voucherType,
      maxUsageCount: form.maxUsageCount.trim() === '' ? undefined : Number(form.maxUsageCount),
      startDate: form.startDate ? toIso(form.startDate) : undefined,
      endDate: form.endDate ? toIso(form.endDate) : undefined,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing) {
        await voucherApi.update(editing.id, payload);
      } else {
        await voucherApi.create(payload);
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Lưu voucher thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await voucherApi.toggle(id);
      load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể đổi trạng thái voucher.'));
    }
  };

  const handleDelete = async (item: Voucher) => {
    if (!window.confirm('Xóa voucher này?')) return;
    try {
      await voucherApi.delete(item.id);
      load();
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      const shouldSoftDeactivate =
        isVoucherDeleteConflict(err) || status === 400 || status === 409;

      if (shouldSoftDeactivate) {
        try {
          const nowIso = new Date().toISOString();

          await voucherApi.update(item.id, {
            code: item.code,
            name: item.name,
            description: item.description || undefined,
            discountType: item.discountType,
            discountValue: item.discountValue,
            maxDiscountAmount: item.maxDiscountAmount ?? undefined,
            minOrderAmount: item.minOrderAmount ?? undefined,
            voucherType: item.voucherType,
            maxUsageCount: item.maxUsageCount ?? undefined,
            startDate: item.startDate ?? undefined,
            endDate: nowIso,
            isActive: false,
          });

          setError('Voucher đã được dùng trong đơn hàng nên không thể xóa cứng. Hệ thống đã chuyển sang trạng thái ngưng sử dụng.');
          load();
          return;
        } catch (softErr: unknown) {
          setError(getApiErrorMessage(softErr, 'Không thể ngưng sử dụng voucher sau khi xóa cứng thất bại.'));
          return;
        }
      }

      setError(getApiErrorMessage(err, 'Không thể xóa voucher.'));
    }
  };

  const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mã giảm giá</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} voucher</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm voucher
        </button>
      </div>

      {error && !showForm && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editing ? 'Chỉnh sửa voucher' : 'Thêm voucher'}
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
                  <label className={labelClass}>Code *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tên voucher *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className={inputClass}
                  />
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
                <div>
                  <label className={labelClass}>Giá trị giảm *</label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, discountValue: Number(e.target.value) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Giảm tối đa</label>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={labelClass}>Đơn tối thiểu</label>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Loại voucher *</label>
                  <select
                    value={form.voucherType}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, voucherType: e.target.value as VoucherType }))
                    }
                    className={inputClass}
                  >
                    <option value="SINGLE_USE">Dùng 1 lần (SINGLE_USE)</option>
                    <option value="MULTI_USE">Dùng nhiều lần (MULTI_USE)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Số lượt dùng tối đa</label>
                  <input
                    type="number"
                    value={form.maxUsageCount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, maxUsageCount: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className={labelClass}>Bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Kết thúc</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Giảm giá</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Ticket size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Chưa có voucher</p>
                  </td>
                </tr>
              )}
              {paginated.map((item, idx) => (
                (() => {
                  const status = getVoucherStatus(item);
                  const statusClass =
                    status === 'EXHAUSTED'
                      ? 'bg-amber-100 text-amber-700'
                      : status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500';
                  const statusLabel =
                    status === 'EXHAUSTED' ? 'Hết mã' : status === 'ACTIVE' ? 'Đang bật' : 'Đang tắt';

                  return (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                      {item.code}
                    </span>
                  </td>
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
                    <p>{item.voucherType}</p>
                    <p>Used: {item.usageCount ?? 0}/{item.maxUsageCount ?? '∞'}</p>
                    {item.maxUsageCount != null && (
                      <p className="text-[11px] text-slate-400">
                        Còn lại: {Math.max(item.maxUsageCount - (item.usageCount ?? 0), 0)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    <p>{formatDate(item.startDate)}</p>
                    <p>{formatDate(item.endDate)}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${statusClass}`}
                    >
                      {statusLabel}
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
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                        title="Bật / Tắt"
                        disabled={status === 'EXHAUSTED'}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                  );
                })()
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
