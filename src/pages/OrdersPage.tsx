import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, orderApi, reviewApi } from '../api/j2ee';
import type { OrderResponse, OrderStatus } from '../api/j2ee/types';
import OrderSuccessScreen from '../components/OrderSuccessScreen';
import {
  Package, ChevronDown, ChevronUp, ShoppingBag,
  MapPin, Phone, CreditCard, FileText, Clock,
  XCircle, RefreshCw, CheckCircle2, Star,
} from 'lucide-react';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  PENDING:   { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700' },
  SHIPPING:  { label: 'Đang giao',    color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED: { label: 'Đã giao',      color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã huỷ',       color: 'bg-rose-100 text-rose-700' },
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH:  'Tiền mặt (COD)',
  VNPAY: 'VNPAY',
  MOMO:  'MoMo',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Đã hết hạn';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDeadline(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STAR_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

function QuickStarRating({
  orderItemId,
  onSuccess,
}: {
  orderItemId: number;
  onSuccess: () => void;
}) {
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleRate = async (star: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      await reviewApi.submitReview({ orderItemId, rating: star });
      onSuccess();
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex items-center gap-0.5 mt-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-[11px] text-slate-400 mr-1 leading-none select-none shrink-0">
        Đánh giá:
      </span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={submitting}
          onMouseEnter={() => !submitting && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={(e) => handleRate(star, e)}
          className={`p-0.5 ${submitting ? 'cursor-wait opacity-40' : 'cursor-pointer'}`}
          title={STAR_LABELS[star]}
        >
          <Star
            className={`w-3.5 h-3.5 transition-colors duration-100 ${
              star <= hovered
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }`}
          />
        </button>
      ))}
      <span className="text-[11px] text-amber-500 ml-1 leading-none select-none w-[54px] shrink-0">
        {STAR_LABELS[hovered]}
      </span>
      {submitting && (
        <div className="w-3 h-3 border border-amber-300 border-t-amber-500 rounded-full animate-spin shrink-0" />
      )}
      {submitError && (
        <span className="text-[11px] text-rose-400 leading-none shrink-0">Thử lại</span>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onClick,
  canRetry,
  remainingText,
  retrying,
  onRetryPayment,
  onReviewSuccess,
}: {
  order: OrderResponse;
  onClick: () => void;
  canRetry: boolean;
  remainingText: string;
  retrying: boolean;
  onRetryPayment: () => void;
  onReviewSuccess: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-600' };
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all"
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{formatDate(order.createdAt)}</span>
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-sm text-slate-500">Mã đơn: <span className="font-semibold text-slate-700">{order.orderCode}</span></span>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Items preview */}
      <div className="px-5 py-4">
        <div className="space-y-2">
          {order.items.slice(0, expanded ? undefined : 2).map((item) => {
            const displayName = item.variantDisplayName || item.variantName || item.variantSku || item.productName;
            const displayImageUrl = item.displayImageUrl || item.imageUrl || item.productImageUrl;
            return (
              <div key={item.id} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                  {displayImageUrl ? (
                  <img
                      src={displayImageUrl.startsWith('http') ? displayImageUrl : `${BASE_URL}${displayImageUrl}`}
                      alt={displayName}
                    className="object-contain w-full h-full p-0.5"
                  />
                ) : (
                  <Package className="w-4 h-4 text-slate-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{displayName}</p>
                <p className="text-xs text-slate-400">× {item.quantity}</p>
                {isDelivered && (
                  item.reviewed ? (
                    <span
                      className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-emerald-600 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Đã đánh giá
                    </span>
                  ) : (
                    <QuickStarRating orderItemId={item.id} onSuccess={onReviewSuccess} />
                  )
                )}
              </div>
              <span className="text-sm font-semibold text-black shrink-0 mt-0.5">
                {Number(item.subtotal).toLocaleString('vi-VN')}₫
              </span>
            </div>
            );
          })}
          {!expanded && order.items.length > 2 && (
            <p className="text-xs text-slate-400">... và {order.items.length - 2} sản phẩm khác</p>
          )}
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <span>{order.shippingAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{order.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
            {order.paymentDeadline && order.status === 'PENDING' && (
              <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Hạn thanh toán: {formatDeadline(order.paymentDeadline)} ({remainingText})</span>
              </div>
            )}
            {order.note && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{order.note}</span>
              </div>
            )}
            {order.appliedVoucherCode && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Mã voucher: <span className="font-semibold text-indigo-600">{order.appliedVoucherCode}</span></span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</> : <><ChevronDown className="w-3.5 h-3.5" /> Xem chi tiết</>}
            </button>
            {canRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryPayment();
                }}
                disabled={retrying}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
              >
                {retrying ? 'Đang tạo link...' : 'Thanh toán lại'}
              </button>
            )}
          </div>
          <div className="text-right">
            {(order.saleDiscount > 0 || order.voucherDiscount > 0) && (
              <p className="text-xs text-slate-400 line-through">
                {Number(order.originalAmount ?? order.totalAmount).toLocaleString('vi-VN')}₫
              </p>
            )}
            <p className="text-base font-bold text-rose-600">{Number(order.totalAmount).toLocaleString('vi-VN')}₫</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vnpayOrder, setVnpayOrder] = useState<OrderResponse | null>(null);
  const [momoOrder, setMomoOrder] = useState<OrderResponse | null>(null);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vnpaySuccess = searchParams.get('vnpay') === 'success';
  const vnpayFailed = searchParams.get('vnpay') === 'failed';
  const vnpayOrderCode = searchParams.get('orderCode');
  const momoSuccess = searchParams.get('momo') === 'success';
  const momoFailed = searchParams.get('momo') === 'failed';
  const momoOrderCode = searchParams.get('orderCode');

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOrders = () => {
    if (!user) return;
    orderApi.getMyOrders()
      .then((res) => {
        const list = res.data.data;
        setOrders(list);
        if (vnpaySuccess && vnpayOrderCode) {
          const found = list.find((o) => o.orderCode === vnpayOrderCode);
          if (found) setVnpayOrder(found);
        }
        if (momoSuccess && momoOrderCode) {
          const found = list.find((o) => o.orderCode === momoOrderCode);
          if (found) setMomoOrder(found);
        }
        if ((vnpayFailed || momoFailed) && vnpayOrderCode) {
          setPaymentNotice(`Thanh toán chưa thành công cho đơn ${vnpayOrderCode}. Bạn có thể bấm "Thanh toán lại" trước khi hết hạn.`);
        }
      })
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Không thể tải danh sách đơn hàng.')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, vnpaySuccess, vnpayOrderCode, momoSuccess, momoOrderCode, vnpayFailed, momoFailed]);

  const getRemainingMs = (order: OrderResponse) => {
    if (!order.paymentDeadline) return -1;
    return new Date(order.paymentDeadline).getTime() - nowMs;
  };

  const canRetryPayment = (order: OrderResponse) => {
    const isOnline = order.paymentMethod === 'VNPAY' || order.paymentMethod === 'MOMO';
    return order.status === 'PENDING' && isOnline && getRemainingMs(order) > 0;
  };

  const handleRetryPayment = async (order: OrderResponse) => {
    try {
      setRetryingOrderId(order.id);
      const res = await orderApi.retryPayment(order.id);
      const updated = res.data.data;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

      if (updated.paymentMethod === 'VNPAY' && updated.vnpayUrl) {
        window.location.href = updated.vnpayUrl;
        return;
      }
      if (updated.paymentMethod === 'MOMO' && updated.momoUrl) {
        window.location.href = updated.momoUrl;
        return;
      }
      setPaymentNotice('Không lấy được link thanh toán. Vui lòng thử lại.');
    } catch (err: unknown) {
      setPaymentNotice(getApiErrorMessage(err, 'Không thể thanh toán lại đơn hàng.'));
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleReviewSuccess = () => {
    setLoading(true);
    fetchOrders();
  };

  if (!user) {
    return (
      <div className="text-center py-24">
        <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">Vui lòng đăng nhập để xem đơn hàng</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (vnpayOrder) {
    return (
      <OrderSuccessScreen
        order={vnpayOrder}
        subtitle="Thanh toán VNPAY thành công. Cảm ơn bạn đã đặt hàng!"
        onViewOrders={() => { setVnpayOrder(null); navigate('/orders', { replace: true }); }}
      />
    );
  }

  if (momoOrder) {
    return (
      <OrderSuccessScreen
        order={momoOrder}
        subtitle="Thanh toán MoMo thành công. Cảm ơn bạn đã đặt hàng!"
        onViewOrders={() => { setMomoOrder(null); navigate('/orders', { replace: true }); }}
      />
    );
  }

  // ── Màn hình thanh toán thất bại ──────────────────────────────────────────
  if ((vnpayFailed || momoFailed) && !loading) {
    const failedOrderCode = vnpayOrderCode || momoOrderCode;
    const failedOrder = orders.find((o) => o.orderCode === failedOrderCode);
    const canRetry = failedOrder ? canRetryPayment(failedOrder) : false;

    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Thanh toán không thành công</h2>
          <p className="text-slate-500 text-sm">
            {vnpayFailed
              ? 'Giao dịch VNPAY không hoàn tất.'
              : 'Giao dịch MoMo không hoàn tất.'}{' '}
            {failedOrderCode && (
              <span>Đơn hàng <span className="font-semibold text-slate-700">{failedOrderCode}</span> vẫn đang chờ thanh toán.</span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {canRetry && failedOrder && (
            <button
              onClick={() => handleRetryPayment(failedOrder)}
              disabled={retryingOrderId === failedOrder.id}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              {retryingOrderId === failedOrder.id ? 'Đang tạo link...' : 'Thanh toán lại'}
            </button>
          )}
          <button
            onClick={() => navigate('/orders', { replace: true })}
            className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            Xem đơn hàng của tôi
          </button>
          <Link
            to="/products"
            className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors text-sm"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6">Đơn hàng của tôi</h1>

      {paymentNotice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          {paymentNotice}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-20 text-rose-500">{error}</div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-20">
          <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">Bạn chưa có đơn hàng nào</p>
          <Link to="/products" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
            Mua sắm ngay
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/orders/${order.id}`)}
              canRetry={canRetryPayment(order)}
              remainingText={formatRemaining(getRemainingMs(order))}
              retrying={retryingOrderId === order.id}
              onRetryPayment={() => handleRetryPayment(order)}
              onReviewSuccess={handleReviewSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
