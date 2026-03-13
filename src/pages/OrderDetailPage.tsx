import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/j2ee';
import type { OrderResponse, OrderStatus } from '../api/j2ee/types';
import {
  ArrowLeft, Package, MapPin, Phone, CreditCard,
  FileText, Clock, CheckCircle2, XCircle, AlertCircle,
  ChevronRight, RefreshCw, Headphones, User, MessageSquare,
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; step: number }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700',    step: 1 },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700',      step: 2 },
  SHIPPING:  { label: 'Đang giao',    color: 'bg-indigo-100 text-indigo-700',   step: 3 },
  DELIVERED: { label: 'Đã giao',      color: 'bg-emerald-100 text-emerald-700', step: 4 },
  CANCELLED: { label: 'Đã huỷ',       color: 'bg-rose-100 text-rose-700',       step: 0 },
};

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'PENDING',   label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận'  },
  { key: 'SHIPPING',  label: 'Đang giao'    },
  { key: 'DELIVERED', label: 'Đã giao'      },
];

const PAYMENT_LABEL: Record<string, string> = {
  CASH:  'Tiền mặt (COD)',
  VNPAY: 'VNPAY',
  MOMO:  'MoMo',
};

const CANCEL_REASONS = [
  'Đổi ý, không muốn mua nữa',
  'Đặt nhầm sản phẩm',
  'Tìm được chỗ mua rẻ hơn',
  'Giao hàng quá lâu',
  'Muốn thay đổi địa chỉ giao hàng',
  'Lý do khác',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Spinner() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);
  // ── Cancel modal state ──
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (!id) return;
    orderApi
      .getOrderById(Number(id))
      .then((res) => setOrder(res.data.data))
      .catch(() => setError('Không tìm thấy đơn hàng.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) {
    return (
      <div className="text-center py-24">
        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">Vui lòng đăng nhập để xem đơn hàng</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) return <Spinner />;

  if (error || !order) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">{error || 'Đơn hàng không tồn tại'}</p>
        <Link to="/orders" className="text-indigo-600 hover:underline text-sm">← Quay lại đơn hàng</Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-600', step: 0 };
  const isCancelled = order.status === 'CANCELLED';
  // VNPAY/MOMO đã thanh toán → status = CONFIRMED, không cho huỷ nữa
  // COD thì CONFIRMED vẫn chưa thanh toán → vẫn cho huỷ
  const canCancel =
    order.status === 'PENDING' ||
    (order.status === 'CONFIRMED' && order.paymentMethod === 'CASH');

  const finalReason = selectedReason === 'Lý do khác' ? customReason.trim() : selectedReason;

  const handleConfirmCancel = async () => {
    if (!finalReason) return;
    setCancelling(true);
    setCancelError('');
    try {
      const res = await orderApi.cancelOrder(order.id, finalReason);
      setOrder(res.data.data);
      setCancelSuccess(true);
      setShowCancelModal(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể huỷ đơn hàng. Vui lòng thử lại.';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">Chi tiết đơn hàng</h1>
          <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
            <Link to="/orders" className="hover:text-indigo-600 transition-colors">Đơn hàng của tôi</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">{order.orderCode}</span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Status tracker ── */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-100 mx-10 z-0" />
              <div
                className="absolute left-0 top-5 h-0.5 bg-indigo-500 mx-10 z-0 transition-all"
                style={{ width: `${((status.step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
              {STEPS.map((step, i) => {
                const done = status.step > i + 1;
                const active = status.step === i + 1;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      done    ? 'bg-indigo-500 border-indigo-500 text-white' :
                      active  ? 'bg-white border-indigo-500 text-indigo-600' :
                               'bg-white border-slate-200 text-slate-300'
                    }`}>
                      {done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-xs text-center font-medium ${active ? 'text-indigo-600' : done ? 'text-slate-600' : 'text-slate-300'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Order info ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-slate-800 mb-4">Thông tin đơn hàng</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-400">Mã đơn:</span>
              <span className="font-semibold text-slate-800">{order.orderCode}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-400">Ngày đặt:</span>
              <span className="font-medium text-slate-700">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-400">Thanh toán:</span>
              <span className="font-medium text-slate-700">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
            </div>
            {isCancelled && order.cancelledAt && (
              <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-slate-400">Thời gian huỷ:</span>
                <span className="font-medium text-rose-600">{formatDate(order.cancelledAt)}</span>
              </div>
            )}
            {isCancelled && order.cancelReason && (
              <div className="flex items-start gap-2 text-slate-600 sm:col-span-2">
                <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-400 shrink-0">Lý do huỷ:</span>
                <span className="font-medium text-slate-700">{order.cancelReason}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Recipient info ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
          <h2 className="font-bold text-slate-800 mb-4">Thông tin người nhận</h2>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{order.fullName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{order.phone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{order.shippingAddress}</span>
            </div>
            {order.note && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="italic text-slate-500">{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Product list ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-800 mb-4">Danh sách sản phẩm</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-slate-500 font-semibold pb-3 pr-4">Sản phẩm</th>
                  <th className="text-right text-slate-500 font-semibold pb-3 px-4">Giá</th>
                  <th className="text-right text-slate-500 font-semibold pb-3 px-4">Số lượng</th>
                  <th className="text-right text-slate-500 font-semibold pb-3">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.productImageUrl ? (
                            <img
                              src={item.productImageUrl.startsWith('http') ? item.productImageUrl : `${BASE_URL}${item.productImageUrl}`}
                              alt={item.productName}
                              className="object-contain w-full h-full p-0.5"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-200" />
                          )}
                        </div>
                        <span className="font-medium text-slate-700 line-clamp-2">{item.productName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                      {Number(item.unitPrice).toLocaleString('vi-VN')}₫
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {Number(item.subtotal).toLocaleString('vi-VN')}₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Tạm tính</span>
              <span>{Number(order.totalAmount).toLocaleString('vi-VN')}₫</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Phí vận chuyển</span>
              <span className="text-emerald-600 font-medium">Miễn phí</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t border-slate-100">
              <span>Tổng cộng</span>
              <span className="text-[#e60012]">{Number(order.totalAmount).toLocaleString('vi-VN')}₫</span>
            </div>
          </div>
        </div>

        {/* ── Cancel feedback ── */}
        {cancelSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Đơn hàng đã được huỷ thành công.
          </div>
        )}
        {cancelError && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl">
            <XCircle className="w-4 h-4 shrink-0" />
            {cancelError}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3">
          {canCancel && !cancelSuccess && (
            <button
              onClick={() => { setShowCancelModal(true); setCancelError(''); }}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-rose-100 transition-colors text-sm"
            >
              <XCircle className="w-4 h-4" />
              Huỷ đơn hàng
            </button>
          )}
          {(isCancelled || order.status === 'DELIVERED') && (
            <Link
              to="/products"
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-100 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Mua lại
            </Link>
          )}
          <a
            href="mailto:support@techstore.vn"
            className="flex items-center gap-2 bg-slate-50 text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-colors text-sm"
          >
            <Headphones className="w-4 h-4" />
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </div>

    {/* ── Cancel modal ── */}
    {showCancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Lý do huỷ đơn hàng</h3>
            <button
              onClick={() => setShowCancelModal(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {CANCEL_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => { setSelectedReason(reason); setCustomReason(''); }}
                className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition-all ${
                  selectedReason === reason
                    ? 'border-rose-400 bg-rose-50 text-rose-700 font-medium'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === 'Lý do khác' && (
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-colors resize-none"
            />
          )}

          {cancelError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {cancelError}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Thoát
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={!finalReason || cancelling}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {cancelling ? 'Đang huỷ...' : 'Xác nhận huỷ'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
