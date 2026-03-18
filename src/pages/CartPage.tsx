import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage, saleProgramApi } from '../api/j2ee';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Trash2, Plus, Minus, Package, ArrowRight, AlertTriangle, XCircle, Ban } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { CartItemResponse, SaleProgram } from '../api/j2ee/types';
import { getProductDetailPath } from '../utils/productSlug';
import { getBestSaleForProduct, getSalePricing } from '../utils/salePricing';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function Spinner() {
  return (
    <div className="flex justify-center py-24">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function CartPage() {
  const { user } = useAuth();
  const { cart, totalItems, loading, fetchCart, updateCartItem, removeCartItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [activeSales, setActiveSales] = useState<SaleProgram[]>([]);

  // Refs để tránh stale closure trong SSE event handlers
  const fetchCartRef = useRef(fetchCart);
  useEffect(() => { fetchCartRef.current = fetchCart; }, [fetchCart]);
  const cartRef = useRef(cart);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  // SSE: subscribe khi vào trang cart, đóng khi rời trang
  useEffect(() => {
    if (!user) return;
    const es = new EventSource(`${BASE_URL}/api/sse/subscribe`);

    es.addEventListener('product-update', (e: MessageEvent) => {
      const { productId } = JSON.parse(e.data);
      if (cartRef.current?.items.some((item) => item.product.id === productId)) {
        fetchCartRef.current();
      }
    });

    es.addEventListener('variant-update', (e: MessageEvent) => {
      const { variantId } = JSON.parse(e.data);
      if (cartRef.current?.items.some((item) => item.variantId === variantId)) {
        fetchCartRef.current();
      }
    });

    return () => { es.close(); };
  }, [user]);

  useEffect(() => {
    saleProgramApi
      .getActive()
      .then((res) => setActiveSales(res.data.data || []))
      .catch(() => setActiveSales([]));
  }, []);

  if (!user) {
    return (
      <div className="text-center py-24">
        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">Vui lòng đăng nhập để xem giỏ hàng</p>
        <Link to="/login" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm">
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (loading) return <Spinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-24">
        <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-2 font-medium">Giỏ hàng của bạn đang trống</p>
        <p className="text-sm text-slate-400 mb-6">Hãy thêm sản phẩm vào giỏ hàng!</p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-sm"
        >
          Khám phá sản phẩm <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const handleUpdateQty = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      setUpdatingId(itemId);
      setError('');
      await updateCartItem(itemId, newQty);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể cập nhật số lượng';
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    try {
      setRemovingId(itemId);
      setError('');
      await removeCartItem(itemId);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể xóa sản phẩm'));
    } finally {
      setRemovingId(null);
    }
  };

  const isUnavailable = (item: CartItemResponse) =>
    item.product.isActive === false || item.product.status === 'INACTIVE';

  const getItemStatus = (item: CartItemResponse) => {
    if (item.product.isActive === false || item.product.status === 'INACTIVE') return 'inactive';
    if (item.preorder) return 'preorder';
    if (!item.inStock) return 'out_of_stock';
    return 'available';
  };

  const hasUnavailable = cart?.items.some(isUnavailable) ?? false;

  const itemPricingMap = useMemo(() => {
    const entries = (cart?.items || []).map((item) => {
      const saleResult = getBestSaleForProduct(item.product.id, item.unitPrice, activeSales, {
        quantity: item.quantity,
      });
      const pricing = getSalePricing(item.unitPrice, item.quantity, saleResult.discountPerUnit);

      return [
        item.id,
        {
          saleName: saleResult.sale?.name || null,
          originalSubtotal: pricing.originalSubtotal,
          discountSubtotal: pricing.discountSubtotal,
          finalSubtotal: pricing.finalSubtotal,
        },
      ] as const;
    });

    return new Map(entries);
  }, [cart?.items, activeSales]);

  const checkoutAmount = cart?.items
    .filter((item) => !isUnavailable(item))
    .reduce((sum, item) => {
      const pricing = itemPricingMap.get(item.id);
      return sum + (pricing?.finalSubtotal ?? item.subtotal);
    }, 0) ?? 0;

  const totalSaleDiscount = cart?.items
    .filter((item) => !isUnavailable(item))
    .reduce((sum, item) => {
      const pricing = itemPricingMap.get(item.id);
      return sum + (pricing?.discountSubtotal ?? 0);
    }, 0) ?? 0;

  const handleClear = async () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) return;
    try {
      setClearing(true);
      setError('');
      await clearCart();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể xóa giỏ hàng'));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-indigo-600" />
          Giỏ hàng
          <span className="text-base font-semibold text-slate-400">({totalItems} sản phẩm)</span>
        </h1>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Xóa tất cả
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map((item) => {
            const fallbackMedia = item.product.media?.find((m) => m.isPrimary && m.mediaType === 'IMAGE')
              || item.product.media?.find((m) => m.mediaType === 'IMAGE');
            const imgUrl = item.variantImageUrl
              ? resolveUrl(item.variantImageUrl)
              : fallbackMedia ? resolveUrl(fallbackMedia.mediaUrl) : null;
            const displayName = item.variantSku || item.product.name;
            const isUpdating = updatingId === item.id;
            const isRemoving = removingId === item.id;
            const pricing = itemPricingMap.get(item.id);
            const hasSale = !!pricing && pricing.discountSubtotal > 0;

            return (
              <div
                key={item.id}
                className={`flex gap-4 bg-white rounded-xl border p-4 shadow-sm transition-opacity ${
                  isRemoving ? 'opacity-50' : ''
                } ${
                  getItemStatus(item) === 'inactive' ? 'border-slate-200 bg-slate-50/60 opacity-75'
                  : getItemStatus(item) === 'out_of_stock' ? 'border-rose-200 bg-rose-50/30'
                  : 'border-slate-100'
                }`}
              >
                {/* Image */}
                <Link to={getProductDetailPath(item.product)} className="shrink-0">
                  <div className="w-20 h-20 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-100">
                    {imgUrl ? (
                      <img src={imgUrl} alt={displayName} className="object-contain w-full h-full p-1" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={getProductDetailPath(item.product)}
                    className="text-sm font-semibold text-slate-800 hover:text-indigo-600 line-clamp-2 transition-colors"
                  >
                    {displayName}
                  </Link>
                  {item.product.brand && (
                    <p className="text-xs text-indigo-500 font-medium mt-0.5">{item.product.brand.name}</p>
                  )}
                  {item.variantOptions && item.variantOptions.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{item.variantOptions.join(' • ')}</p>
                  )}

                  {/* Stock warning */}
                  {getItemStatus(item) === 'inactive' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                      <Ban className="w-3 h-3" /> Ngừng kinh doanh
                    </span>
                  ) : getItemStatus(item) === 'out_of_stock' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                      <XCircle className="w-3 h-3" /> Hàng sắp về
                    </span>
                  ) : getItemStatus(item) === 'preorder' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full mt-1">
                      <ShoppingCart className="w-3 h-3" /> Đặt trước
                    </span>
                  ) : item.availableStock <= 5 ? (
                    <p className="text-xs text-amber-600 font-medium mt-1">Còn {item.availableStock} sản phẩm</p>
                  ) : null}

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    {/* Quantity */}
                    <div className={`flex items-center border rounded-lg overflow-hidden ${
                      isUnavailable(item) ? 'border-slate-200 opacity-50' : 'border-slate-200'
                    }`}>
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1 || isUnavailable(item)}
                        className="px-2.5 py-1.5 hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-semibold text-slate-800 min-w-8 text-center">
                        {isUpdating ? '...' : item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                        disabled={isUpdating || (!item.preorder && item.quantity >= item.availableStock) || isUnavailable(item)}
                        className="px-2.5 py-1.5 hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal + remove */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {hasSale && !isUnavailable(item) && (
                          <p className="text-xs text-slate-400 line-through">
                            {Number(pricing.originalSubtotal).toLocaleString('vi-VN')}₫
                          </p>
                        )}
                        <p className={`text-base font-bold ${
                          isUnavailable(item) ? 'text-slate-400 line-through' : 'text-indigo-600'
                        }`}>
                          {Number(pricing?.finalSubtotal ?? item.subtotal).toLocaleString('vi-VN')}₫
                        </p>
                        {hasSale && !isUnavailable(item) && (
                          <p className="text-[11px] text-emerald-600">Giảm theo chương trình</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={isRemoving}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 sticky top-24">
            <h2 className="text-base font-bold text-slate-800 mb-4">Tóm tắt đơn hàng</h2>

            <div className="space-y-2 text-sm mb-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className={`truncate max-w-[60%] ${
                    isUnavailable(item) ? 'text-slate-400 line-through' : 'text-slate-500'
                  }`}>{item.variantSku || item.product.name} × {item.quantity}</span>
                  {getItemStatus(item) === 'inactive' ? (
                    <span className="text-xs font-semibold text-slate-500">Ngừng kinh doanh</span>
                  ) : getItemStatus(item) === 'out_of_stock' ? (
                    <span className="text-xs font-semibold text-amber-700">Hàng sắp về</span>
                  ) : getItemStatus(item) === 'preorder' ? (
                    <span className="text-xs font-semibold text-indigo-700">Đặt trước</span>
                  ) : (
                    <div className="text-right">
                      {(itemPricingMap.get(item.id)?.discountSubtotal ?? 0) > 0 && (
                        <p className="text-[11px] text-slate-400 line-through">
                          {Number(itemPricingMap.get(item.id)?.originalSubtotal ?? item.subtotal).toLocaleString('vi-VN')}₫
                        </p>
                      )}
                      <span className="font-medium text-slate-700">
                        {Number(itemPricingMap.get(item.id)?.finalSubtotal ?? item.subtotal).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 mb-4">
              {totalSaleDiscount > 0 && (
                <div className="flex justify-between text-sm text-slate-500 mb-1">
                  <span>Giảm giá chương trình</span>
                  <span className="text-emerald-600 font-medium">-{Number(totalSaleDiscount).toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800">
                <span>Tổng cộng</span>
                <span className="text-[#e60012] text-lg">{Number(checkoutAmount).toLocaleString('vi-VN')}₫</span>
              </div>
              {hasUnavailable && (
                <p className="text-xs text-slate-400 mt-1">(Không bao gồm sản phẩm không thể mua)</p>
              )}
            </div>

            {hasUnavailable && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2.5 rounded-xl mb-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Giỏ hàng có sản phẩm không khả dụng (ngừng kinh doanh). Vui lòng xóa trước khi thanh toán.</span>
              </div>
            )}

            <button
              onClick={() => navigate('/checkout')}
              disabled={hasUnavailable}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm text-sm"
            >
              Tiến hành đặt hàng <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/products"
              className="mt-3 block text-center text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
