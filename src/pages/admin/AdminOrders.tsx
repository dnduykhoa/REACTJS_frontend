import { useEffect, useState } from 'react';
import { orderApi } from '../../api/j2ee';
import type { OrderResponse, OrderStatus } from '../../api/j2ee/types';
import {
  ShoppingBag,
  Search,
  X,
  ChevronDown,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Eye,
  AlertCircle,
  User,
} from 'lucide-react';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 15;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; cls: string; icon: React.ElementType }
> = {
  PENDING:   { label: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700',   icon: Clock        },
  CONFIRMED: { label: 'Đã xác nhận',  cls: 'bg-indigo-100 text-indigo-700', icon: CheckCircle2 },
  SHIPPING:  { label: 'Đang giao',    cls: 'bg-sky-100 text-sky-700',        icon: Truck        },
  DELIVERED: { label: 'Đã giao',      cls: 'bg-emerald-100 text-emerald-700',icon: Package      },
  CANCELLED: { label: 'Đã huỷ',       cls: 'bg-rose-100 text-rose-700',      icon: XCircle      },
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
};

// Các bước chuyển trạng thái hợp lệ cho admin
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING:  ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const CANCEL_REASONS = [
  'Khách hàng yêu cầu huỷ',
  'Hết hàng / không còn cung cấp',
  'Thông tin đặt hàng không hợp lệ',
  'Không liên lạc được với khách',
  'Đơn hàng trùng lặp',
  'Khác',
];

type StatusFilter = 'all' | OrderStatus;

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'Tất cả'        },
  { key: 'PENDING',   label: 'Chờ xác nhận'  },
  { key: 'CONFIRMED', label: 'Đã xác nhận'   },
  { key: 'SHIPPING',  label: 'Đang giao'     },
  { key: 'DELIVERED', label: 'Đã giao'       },
  { key: 'CANCELLED', label: 'Đã huỷ'        },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, cls, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Component chính ──────────────────────────────────────────────────────────
export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Detail modal
  const [detail, setDetail] = useState<OrderResponse | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Cancel reason modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReasonSelected, setCancelReasonSelected] = useState('');
  const [cancelCustomReason, setCancelCustomReason] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    orderApi
      .getAllOrders()
      .then((r) => setOrders(r.data.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setLoadError('Bạn không có quyền truy cập trang đơn hàng quản trị.');
        } else {
          setLoadError('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
        }
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // ── Filter ──
  const filtered = orders.filter((o) => {
    const matchStatus = tab === 'all' || o.status === tab;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.orderCode.toLowerCase().includes(q) ||
      o.fullName.toLowerCase().includes(q) ||
      (o.phone && o.phone.includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (t: StatusFilter) => {
    setTab(t);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // ── Count badges ──
  const countByStatus = (s: StatusFilter) =>
    s === 'all' ? orders.length : orders.filter((o) => o.status === s).length;

  // ── Update status ──
  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!detail) return;
    if (newStatus === 'CANCELLED') {
      setCancelReasonSelected('');
      setCancelCustomReason('');
      setStatusError('');
      setCancelModalOpen(true);
      return;
    }
    setStatusUpdating(true);
    setStatusError('');
    try {
      const res = await orderApi.updateOrderStatus(detail.id, newStatus);
      const updated = res.data.data;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setDetail(updated);
    } catch (err: unknown) {
      setStatusError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Cập nhật thất bại'
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Confirm cancel with reason ──
  const handleConfirmCancel = async () => {
    if (!detail) return;
    const reason =
      cancelReasonSelected === 'Khác' ? cancelCustomReason.trim() : cancelReasonSelected;
    setStatusUpdating(true);
    setStatusError('');
    try {
      const res = await orderApi.updateOrderStatus(detail.id, 'CANCELLED', reason || undefined);
      const updated = res.data.data;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setDetail(updated);
      setCancelModalOpen(false);
    } catch (err: unknown) {
      setStatusError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Huỷ đơn thất bại'
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-sm text-slate-500 mt-0.5">{orders.length} đơn hàng</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 border border-slate-200 transition"
        >
          Làm mới
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {countByStatus(key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm mã đơn, tên khách, SĐT, email..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setPage(1); }}
            className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 border border-slate-200 transition"
          >
            Xóa lọc
          </button>
        )}
      </form>

      {/* Table */}
      {loadError && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={15} className="shrink-0" /> {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thanh toán</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ngày đặt</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <ShoppingBag size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400">Không có đơn hàng nào</p>
                  </td>
                </tr>
              )}
              {paginated.map((order, idx) => (
                <tr
                  key={order.id}
                  className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => { setDetail(order); setStatusError(''); }}
                >
                  <td className="px-4 py-3 text-slate-400 tabular-nums">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">
                      {order.orderCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{order.fullName}</p>
                    <p className="text-xs text-slate-400">{order.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                    {fmtMoney(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {fmtDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetail(order); setStatusError(''); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </div>
      )}

      {/* Cancel Reason Modal */}
      {cancelModalOpen && detail && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setCancelModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <XCircle size={18} className="text-rose-500" />
                <h3 className="text-base font-bold text-slate-900">Lý do huỷ đơn</h3>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-500">Chọn lý do huỷ đơn hàng <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{detail.orderCode}</span>:</p>
              <div className="space-y-2">
                {CANCEL_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                      cancelReasonSelected === r
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={r}
                      checked={cancelReasonSelected === r}
                      onChange={() => setCancelReasonSelected(r)}
                      className="accent-rose-500"
                    />
                    <span className="text-sm text-slate-700">{r}</span>
                  </label>
                ))}
              </div>

              {cancelReasonSelected === 'Khác' && (
                <textarea
                  rows={3}
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  placeholder="Nhập lý do huỷ..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 transition resize-none"
                />
              )}

              {statusError && (
                <p className="flex items-center gap-1 text-xs text-rose-600">
                  <AlertCircle size={12} /> {statusError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
              >
                Đóng
              </button>
              <button
                disabled={
                  statusUpdating ||
                  !cancelReasonSelected ||
                  (cancelReasonSelected === 'Khác' && !cancelCustomReason.trim())
                }
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {statusUpdating ? 'Đang huỷ...' : 'Xác nhận huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Chi tiết đơn hàng</h2>
                <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                  {detail.orderCode}
                </span>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Status + action */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={detail.status} />
                <span className="text-slate-300">|</span>
                <span className="text-sm text-slate-500">{fmtDate(detail.createdAt)}</span>

                {NEXT_STATUSES[detail.status].length > 0 && (
                  <div className="ml-auto flex items-center gap-2 flex-wrap">
                    {statusError && (
                      <span className="flex items-center gap-1 text-xs text-rose-600">
                        <AlertCircle size={12} /> {statusError}
                      </span>
                    )}
                    {NEXT_STATUSES[detail.status].map((next) => {
                      const cfg = STATUS_CONFIG[next];
                      const Icon = cfg.icon;
                      const isCancelled = next === 'CANCELLED';
                      return (
                        <button
                          key={next}
                          disabled={statusUpdating}
                          onClick={() => handleStatusChange(next)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {statusUpdating ? 'Đang lưu...' : cfg.label}
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Khách hàng</p>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span>{detail.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{detail.phone}</span>
                  </div>
                  {detail.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{detail.email}</span>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Giao hàng & Thanh toán</p>
                  <div className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{detail.shippingAddress}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CreditCard size={13} className="text-slate-400 shrink-0" />
                    <span>{PAYMENT_LABEL[detail.paymentMethod] ?? detail.paymentMethod}</span>
                  </div>
                  {detail.note && (
                    <p className="text-xs text-slate-400 italic mt-1">Ghi chú: {detail.note}</p>
                  )}
                </div>
              </div>

              {/* Cancel reason */}
              {detail.status === 'CANCELLED' && detail.cancelReason && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-rose-700">Lý do huỷ</p>
                    <p className="text-sm text-rose-600 mt-0.5">{detail.cancelReason}</p>
                  </div>
                </div>
              )}

              {/* Order items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Sản phẩm ({detail.items.length})
                </p>
                <div className="space-y-2">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                      {item.productImageUrl ? (
                        <img
                          src={item.productImageUrl.startsWith('http')
                            ? item.productImageUrl
                            : `${import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080'}${item.productImageUrl}`}
                          alt={item.productName}
                          className="w-12 h-12 object-cover rounded-lg bg-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package size={18} className="text-slate-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                        {item.variantOptions && item.variantOptions.length > 0 && (
                          <p className="text-xs text-slate-500 truncate">{item.variantOptions.join(' · ')}</p>
                        )}
                        {item.variantSku && (
                          <p className="text-xs text-slate-400">Tên biến thể: {item.variantSku}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-slate-800">{fmtMoney(item.subtotal)}</p>
                        <p className="text-xs text-slate-400">{fmtMoney(item.unitPrice)} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">Tổng cộng</span>
                <span className="text-xl font-bold text-[#e60012]">{fmtMoney(detail.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
