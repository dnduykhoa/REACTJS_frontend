import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/j2ee';
import type { OrderResponse, OrderStatus } from '../api/j2ee/types';
import OrderSuccessScreen from '../components/OrderSuccessScreen';
import {
  Package, ChevronDown, ChevronUp, ShoppingBag,
  MapPin, Phone, CreditCard, FileText, Clock,
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

function OrderCard({ order, onClick }: { order: OrderResponse; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-slate-100 text-slate-600' };

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
          {order.items.slice(0, expanded ? undefined : 2).map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                {item.productImageUrl ? (
                  <img
                    src={item.productImageUrl.startsWith('http') ? item.productImageUrl : `${BASE_URL}${item.productImageUrl}`}
                    alt={item.productName}
                    className="object-contain w-full h-full p-0.5"
                  />
                ) : (
                  <Package className="w-4 h-4 text-slate-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{item.productName}</p>
                <p className="text-xs text-slate-400">× {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold text-black shrink-0">
                {Number(item.subtotal).toLocaleString('vi-VN')}₫
              </span>
            </div>
          ))}
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
            {order.note && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span>{order.note}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Thu gọn</> : <><ChevronDown className="w-3.5 h-3.5" /> Xem chi tiết</>}
          </button>
          <div className="text-right">
            <p className="text-xs text-slate-400">Tổng tiền</p>
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vnpaySuccess = searchParams.get('vnpay') === 'success';
  const vnpayOrderCode = searchParams.get('orderCode');
  const momoSuccess = searchParams.get('momo') === 'success';
  const momoOrderCode = searchParams.get('orderCode');

  useEffect(() => {
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
      })
      .catch(() => setError('Không thể tải danh sách đơn hàng.'))
      .finally(() => setLoading(false));
  }, [user, vnpaySuccess, vnpayOrderCode, momoSuccess, momoOrderCode]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6">Đơn hàng của tôi</h1>

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
            <OrderCard key={order.id} order={order} onClick={() => navigate(`/orders/${order.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
