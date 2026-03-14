import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/j2ee';
import type { PaymentMethod, ProductMedia } from '../api/j2ee/types';

// ─── Buy Now state (truyền từ ProductDetailPage, không dùng giỏ hàng) ─────────
interface BuyNowState {
  productId: number;
  variantId?: number;
  qty: number;
  productName: string;
  unitPrice: number;
  media?: ProductMedia[];
}
import OrderSuccessScreen from '../components/OrderSuccessScreen';
import {
  ShoppingCart, MapPin, User, Phone, Mail, FileText,
  ArrowLeft, CreditCard, Banknote, Smartphone, ChevronRight,
  LocateFixed, AlertCircle, CheckCircle2, Package, XCircle,
} from 'lucide-react';
import { validateVietnamesePhone, normalizePhone, formatPhoneDisplay } from '../utils/phoneUtils';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

const inputClass =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors';
const labelClass = 'block text-sm font-semibold text-slate-700 mb-1.5';

// ─── Provinces API types ──────────────────────────────────────────────────────
interface Province { code?: number; id?: number; name: string; }
interface Ward { code?: number; id?: number; name: string; }
const getId = (obj: { code?: number; id?: number }) => obj.code ?? obj.id ?? 0;

// ─── Payment method ───────────────────────────────────────────────────────────
const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  {
    key: 'CASH',
    label: 'Tiền mặt',
    icon: <Banknote className="w-5 h-5" />,
    desc: 'Thanh toán khi nhận hàng (COD)',
    color: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    key: 'VNPAY',
    label: 'VNPAY',
    icon: <CreditCard className="w-5 h-5" />,
    desc: 'Thanh toán qua cổng VNPAY',
    color: 'border-blue-500 bg-blue-50 text-blue-700',
  },
  {
    key: 'MOMO',
    label: 'MoMo',
    icon: <Smartphone className="w-5 h-5" />,
    desc: 'Ví điện tử MoMo',
    color: 'border-pink-500 bg-pink-50 text-pink-700',
  },
];

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

const formatPhone = formatPhoneDisplay;

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const buyNow = (location.state as { buyNow?: BuyNowState } | null)?.buyNow;
  const isBuyNow = !!buyNow;
  const navigate = useNavigate();
  // Khi Mua ngay → quay về trang sản phẩm; khi từ giỏ hàng → quay về /cart
  const backTarget = isBuyNow ? `/products/${buyNow!.productId}` : '/cart';
  const backLabel = isBuyNow ? 'Sản phẩm' : 'Giỏ hàng';
  const vnpayFailed = searchParams.get('vnpay') === 'failed';
  const vnpayFailCode = searchParams.get('code');
  const momoFailed = searchParams.get('momo') === 'failed';
  const momoFailCode = searchParams.get('code');

  // ── Address selects ──────────────────────────────────────────────────────
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  // ── Form state ───────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: formatPhone(user?.phone || ''),
    email: user?.email || '',
    streetAddress: '',
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<import('../api/j2ee/types').OrderResponse | null>(null);

  // ── Load provinces on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/v2/p/')
      .then((r) => r.json())
      .then((data: Province[]) => setProvinces(data))
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProvinces(false));
  }, []);

  // ── Load wards when province changes ────────────────────────────────────
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = provinces.find((p) => String(getId(p)) === code)?.name || '';
    setForm((prev) => ({ ...prev, provinceCode: code, provinceName: name, wardCode: '', wardName: '' }));
    setWards([]);
    if (!code) return;
    setLoadingWards(true);
    fetch(`https://provinces.open-api.vn/api/v2/p/${code}?depth=2`)
      .then((r) => r.json())
      .then((data: { wards?: Ward[] }) => setWards(data.wards || []))
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = wards.find((w) => String(getId(w)) === code)?.name || '';
    setForm((prev) => ({ ...prev, wardCode: code, wardName: name }));
  };

  // ── Get current location ─────────────────────────────────────────────────
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt của bạn không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=vi`,
            { headers: { 'User-Agent': 'TechStore/1.0' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // Build street address from nominatim fields
          const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
          // Try to match province/district from the API list
          const raw = data.display_name || '';
          setForm((prev) => ({ ...prev, streetAddress: street || prev.streetAddress }));
          // Try to match province name from provinces list
          const matchedProvince = provinces.find((p) =>
            raw.toLowerCase().includes(p.name.toLowerCase().replace('tỉnh ', '').replace('thành phố ', ''))
          );
          if (matchedProvince) {
            setLoadingWards(true);
            const wardRes = await fetch(`https://provinces.open-api.vn/api/v2/p/${getId(matchedProvince)}?depth=2`);
            const wardData: { wards?: Ward[] } = await wardRes.json();
            const wardList = wardData.wards || [];
            setWards(wardList);
            setLoadingWards(false);
            const matchedWard = wardList.find((w) =>
              raw.toLowerCase().includes(w.name.toLowerCase().replace('phường ', '').replace('xã ', '').replace('thị trấn ', ''))
            );
            setForm((prev) => ({
              ...prev,
              provinceCode: String(getId(matchedProvince)),
              provinceName: matchedProvince.name,
              wardCode: matchedWard ? String(getId(matchedWard)) : '',
              wardName: matchedWard ? matchedWard.name : '',
              streetAddress: street || prev.streetAddress,
            }));
          } else {
            setLocationError('Không thể xác định địa chỉ từ vị trí hiện tại. Vui lòng chọn thủ công.');
          }
        } catch {
          setLocationError('Không thể lấy thông tin địa chỉ. Vui lòng thử lại.');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Bạn đã từ chối quyền truy cập vị trí.');
        } else {
          setLocationError('Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
        }
      },
      { timeout: 10000 }
    );
  };


  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }));
    setPhoneError('');
  };

  // ── Cart computed values ─────────────────────────────────────────────────
  const availableItems = cart?.items.filter(
    (item) => item.inStock && item.product.isActive !== false && item.product.status !== 'INACTIVE'
  ) ?? [];
  const totalAmount = isBuyNow
    ? (buyNow!.unitPrice * buyNow!.qty)
    : availableItems.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = isBuyNow ? 1 : availableItems.length;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.provinceCode) return;
    setSubmitError('');
    // Validate số điện thoại Việt Nam
    const rawPhone = form.phone.replace(/\s/g, '');
    const phoneErr = validateVietnamesePhone(rawPhone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    setPhoneError('');
    setSubmitting(true);

    try {
      const shippingAddress = [
        form.streetAddress,
        form.wardName,
        form.provinceName,
      ].filter(Boolean).join(', ');

      const orderItems = isBuyNow
        ? [{ productId: buyNow!.productId, variantId: buyNow!.variantId, quantity: buyNow!.qty }]
        : availableItems.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId ?? undefined,
            quantity: i.quantity,
          }));

      const res = await orderApi.createOrder({
        fullName: form.fullName,
        phone: normalizePhone(form.phone),
        email: form.email || undefined,
        shippingAddress,
        note: form.note || undefined,
        paymentMethod,
        items: orderItems,
      });

      const order = res.data.data;

      // Xóa giỏ hàng ngay sau khi đặt hàng thành công (bất kể phương thức thanh toán)
      // để giỏ hàng luôn sạch dù người dùng chưa thanh toán VNPAY/MoMo
      if (!isBuyNow) await clearCart();

      // Nếu VNPAY → redirect trình duyệt sang cổng thanh toán
      if (paymentMethod === 'VNPAY' && order.vnpayUrl) {
        window.location.href = order.vnpayUrl;
        return;
      }

      // Nếu MoMo → redirect trình duyệt sang cổng thanh toán MoMo
      if (paymentMethod === 'MOMO' && order.momoUrl) {
        window.location.href = order.momoUrl;
        return;
      }

      setPlacedOrder(order);
      setSuccess(true);
    } catch {
      setSubmitError('Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Redirect if not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <div className="text-center py-24">
        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">Vui lòng đăng nhập để thanh toán</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
          Đăng nhập
        </Link>
      </div>
    );
  }

  // ── VNPAY payment failure screen ──────────────────────────────────────────
  if (vnpayFailed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Thanh toán không thành công</h2>
          <p className="text-slate-500 text-sm">
            {vnpayFailCode === '24'
              ? 'Bạn đã huỷ giao dịch.'
              : vnpayFailCode === '11'
              ? 'Giao dịch đã hết hạn.'
              : `Thanh toán thất bại (mã lỗi: ${vnpayFailCode ?? 'unknown'}).`}{' '}
            Đơn hàng đã bị huỷ tự động.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/cart"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            Quay lại giỏ hàng
          </Link>
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

  // ── MoMo payment failure screen ────────────────────────────────────────────
  if (momoFailed) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Thanh toán không thành công</h2>
          <p className="text-slate-500 text-sm">
            {momoFailCode === '1006'
              ? 'Bạn đã huỷ giao dịch.'
              : momoFailCode === '1005'
              ? 'Url thanh toán đã hết hạn.'
              : `Thanh toán thất bại (mã lỗi: ${momoFailCode ?? 'unknown'}).`}{' '}
            Đơn hàng đã bị huỷ tự động.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/cart"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            Quay lại giỏ hàng
          </Link>
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

  if (success && placedOrder) {
    return <OrderSuccessScreen order={placedOrder} />;
  }

  if (!isBuyNow && (!cart || availableItems.length === 0)) {
    return (
      <div className="text-center py-24">
        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-2 font-medium">Không có sản phẩm để thanh toán</p>
        <Link to="/cart" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm mt-4">
          <ArrowLeft className="w-4 h-4" /> Quay lại giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Thanh toán</h1>
          <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
            <button
              type="button"
              onClick={() => navigate(backTarget)}
              className="hover:text-indigo-600 transition-colors"
            >
              {backLabel}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-medium">Thanh toán</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left: Form ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Personal info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Thông tin người nhận
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={form.fullName}
                      onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Nguyễn Văn A"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="0912 345 678"
                      title="Nhập số điện thoại hợp lệ"
                      className={`${inputClass} pl-10 ${phoneError ? 'border-rose-400 ring-rose-300' : ''}`}
                    />
                  </div>
                  <div>
                    {phoneError && <p className="text-xs text-rose-500 mt-1">{phoneError}</p>}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="example@email.com"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Dùng để nhận xác nhận đơn hàng</p>
              </div>
            </div>

            {/* Shipping address */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Địa chỉ giao hàng
                </h2>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating || loadingProvinces}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-pulse' : ''}`} />
                  {locating ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}
                </button>
              </div>

              {locationError && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {locationError}
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Số nhà, tên đường <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.streetAddress}
                  onChange={(e) => setForm((p) => ({ ...p, streetAddress: e.target.value }))}
                  placeholder="Ví dụ: 123 Nguyễn Huệ"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Tỉnh / Thành phố <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.provinceCode}
                  onChange={handleProvinceChange}
                  disabled={loadingProvinces}
                  className={inputClass}
                >
                  <option value="">{loadingProvinces ? 'Đang tải...' : '-- Chọn Tỉnh/TP --'}</option>
                  {provinces.map((p) => (
                    <option key={getId(p)} value={getId(p)}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  Phường / Xã <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.wardCode}
                  onChange={handleWardChange}
                  disabled={!form.provinceCode || loadingWards}
                  className={inputClass}
                >
                  <option value="">
                    {loadingWards ? 'Đang tải...' : !form.provinceCode ? '-- Chọn Tỉnh/TP trước --' : '-- Chọn Phường/Xã (tuỳ chọn) --'}
                  </option>
                  {wards.map((w) => (
                    <option key={getId(w)} value={getId(w)}>{w.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1"><span className="text-rose-500">*</span> Bắt buộc điền các trường</p>
              </div>
            </div>

            {/* Note */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <label className={`${labelClass} flex items-center gap-2`}>
                <FileText className="w-4 h-4 text-indigo-500" />
                Ghi chú đơn hàng
              </label>
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1">Không bắt buộc</p>
            </div>

            {/* Payment methods */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                Phương thức thanh toán
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                      paymentMethod === m.key
                        ? m.color + ' shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      paymentMethod === m.key ? 'bg-white/70' : 'bg-slate-100'
                    }`}>
                      {m.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{m.label}</p>
                      <p className={`text-xs mt-0.5 ${paymentMethod === m.key ? 'opacity-80' : 'text-slate-400'}`}>
                        {m.desc}
                      </p>
                    </div>
                    {paymentMethod === m.key && (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Right: Order summary ────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-24 space-y-4">
              <h2 className="font-bold text-slate-800">Đơn hàng ({itemCount} sản phẩm)</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {isBuyNow ? (
                  // ── Buy Now: hiển thị 1 sản phẩm duy nhất ──────────────
                  (() => {
                    const imgMedia =
                      buyNow!.media?.find((m) => m.isPrimary && m.mediaType === 'IMAGE') ||
                      buyNow!.media?.find((m) => m.mediaType === 'IMAGE');
                    const imgUrl = imgMedia ? resolveUrl(imgMedia.mediaUrl) : null;
                    return (
                      <div className="flex gap-3 items-start">
                        <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                          {imgUrl ? (
                            <img src={imgUrl} alt={buyNow!.productName} className="object-contain w-full h-full p-0.5" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{buyNow!.productName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">× {buyNow!.qty}</p>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 shrink-0">
                          {Number(buyNow!.unitPrice * buyNow!.qty).toLocaleString('vi-VN')}₫
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  // ── Checkout từ giỏ hàng ────────────────────────────────
                  availableItems.map((item) => {
                    const imgMedia =
                      item.product.media?.find((m) => m.isPrimary && m.mediaType === 'IMAGE') ||
                      item.product.media?.find((m) => m.mediaType === 'IMAGE');
                    const imgUrl = imgMedia ? resolveUrl(imgMedia.mediaUrl) : null;
                    return (
                      <div key={item.id} className="flex gap-3 items-start">
                        <div className="w-12 h-12 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                          {imgUrl ? (
                            <img src={imgUrl} alt={item.product.name} className="object-contain w-full h-full p-0.5" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-200" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">{item.product.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">× {item.quantity}</p>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 shrink-0">
                          {Number(item.subtotal).toLocaleString('vi-VN')}₫
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Tạm tính</span>
                  <span>{Number(totalAmount).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Phí vận chuyển</span>
                  <span className="text-emerald-600 font-medium">Miễn phí</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-100">
                  <span>Tổng cộng</span>
                  <span className="text-[#e60012] text-base">{Number(totalAmount).toLocaleString('vi-VN')}₫</span>
                </div>
              </div>

              {/* Selected payment */}
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2 text-sm text-slate-600">
                <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  Thanh toán:{' '}
                  <span className="font-semibold text-slate-800">
                    {PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label}
                  </span>
                </span>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-xs px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đặt hàng ngay <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center">
                Bằng cách đặt hàng, bạn đồng ý với điều khoản của chúng tôi
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
