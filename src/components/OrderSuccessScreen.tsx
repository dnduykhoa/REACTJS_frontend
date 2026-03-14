import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, Phone, CreditCard, Package } from 'lucide-react';
import type { OrderResponse } from '../api/j2ee/types';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt (COD)',
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
};

interface Props {
  order: OrderResponse;
  /** Dòng mô tả phụ bên dưới tiêu đề. Mặc định là thông báo COD. */
  subtitle?: string;
  /**
   * Nếu truyền vào thì nút "Xem đơn hàng" sẽ gọi callback này (dùng cho
   * trường hợp cần navigate + reset state như VNPAY redirect).
   * Nếu không truyền thì dùng <Link to="/orders">.
   */
  onViewOrders?: () => void;
}

export default function OrderSuccessScreen({ order, subtitle, onViewOrders }: Props) {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Đặt hàng thành công!</h2>
        <p className="text-slate-500 text-sm">
          {subtitle ?? 'Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ xác nhận sớm nhất.'}
        </p>
      </div>

      {/* ── Order detail card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 mb-6">
        {/* Order code */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Mã đơn hàng</p>
          <p className="text-sm font-bold text-indigo-600">{order.orderCode}</p>
        </div>

        {/* Items */}
        <div className="border-t border-slate-100 pt-3 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                {item.productImageUrl ? (
                  <img
                    src={
                      item.productImageUrl.startsWith('http')
                        ? item.productImageUrl
                        : `${BASE_URL}${item.productImageUrl}`
                    }
                    alt={item.productName}
                    className="object-contain w-full h-full p-0.5"
                  />
                ) : (
                  <Package className="w-5 h-5 text-slate-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate font-medium">{item.productName}</p>
                <p className="text-xs text-slate-400">
                  × {item.quantity} &nbsp;&bull;&nbsp;{' '}
                  {Number(item.unitPrice).toLocaleString('vi-VN')}₫
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-700 shrink-0">
                {Number(item.subtotal).toLocaleString('vi-VN')}₫
              </span>
            </div>
          ))}
        </div>

        {/* Shipping / payment info */}
        <div className="border-t border-slate-100 pt-3 space-y-2 text-sm text-slate-600">
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
        </div>

        {/* Total */}
        <div className="flex justify-between font-bold text-slate-800 border-t border-slate-100 pt-3">
          <span>Tổng cộng</span>
          <span className="text-[#e60012]">
            {Number(order.totalAmount).toLocaleString('vi-VN')}₫
          </span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onViewOrders ? (
          <button
            onClick={onViewOrders}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            Xem đơn hàng của tôi
          </button>
        ) : (
          <Link
            to="/orders"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            Xem đơn hàng của tôi
          </Link>
        )}
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
