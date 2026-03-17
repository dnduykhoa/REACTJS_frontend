import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product, ProductStatus } from '../api/j2ee/types';
import type { ProductWithDisplayHint } from '../utils/productPresentation';
import { Package, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getProductDetailPath } from '../utils/productSlug';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function getImageUrl(product: Product) {
  const primary = product.media?.find((m) => m.isPrimary && m.mediaType === 'IMAGE');
  const first = product.media?.find((m) => m.mediaType === 'IMAGE');
  const url = primary?.mediaUrl || first?.mediaUrl;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function resolveStatus(product: Product): ProductStatus {
  return product.status ?? (product.isActive ? (product.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'ACTIVE') : 'INACTIVE');
}

const STATUS_BADGE: Record<Exclude<ProductStatus, 'ACTIVE'>, { label: string; cls: string }> = {
  NEW_ARRIVAL: { label: 'Hàng mới về', cls: 'bg-emerald-600/80 backdrop-blur-sm text-white' },
  OUT_OF_STOCK: { label: 'Hàng sắp về', cls: 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-white/80' },
  INACTIVE: { label: 'Ngừng kinh doanh', cls: 'bg-rose-600/80 backdrop-blur-sm text-white' },
};

export default function ProductCard({ product }: { product: ProductWithDisplayHint }) {
  const imgUrl = getImageUrl(product);
  const status = resolveStatus(product);
  const canAddDirectly = status === 'ACTIVE' || status === 'NEW_ARRIVAL';
  const canOpenPreorder = status === 'OUT_OF_STOCK';
  const purchasable = canAddDirectly || canOpenPreorder;
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const detailPath = getProductDetailPath(product);
  const detailState = { displayVariantId: product._displayVariantId ?? null };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if ((product.variants?.length || 0) > 0 || canOpenPreorder) {
      navigate(detailPath, { state: detailState });
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setAdding(true);
      await addToCart(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // silently fail on card — detail page has full error feedback
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={`group bg-white rounded-xl border shadow-sm transition-all duration-200 overflow-hidden flex flex-col ${
      status === 'OUT_OF_STOCK'
        ? 'border-orange-200 bg-gradient-to-b from-orange-50 via-white to-white'
        : 'border-slate-100'
    } ${
      !purchasable ? 'opacity-70 grayscale-25' : 'hover:shadow-lg hover:-translate-y-1'
    }`}>
      {/* Image */}
      <Link to={detailPath} state={detailState} className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className={`object-contain h-full w-full p-3 transition-transform duration-300 ${
              !purchasable ? '' : 'group-hover:scale-[1.04]'
            }`}
          />
        ) : (
          <Package className="w-14 h-14 text-slate-200" />
        )}
        {status !== 'ACTIVE' && (
          <span className={`absolute top-2 right-2 text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[status as Exclude<ProductStatus, 'ACTIVE'>].cls}`}>
            {STATUS_BADGE[status as Exclude<ProductStatus, 'ACTIVE'>].label}
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        {product.brand && (
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
            {product.brand.name}
          </p>
        )}
        <Link to={detailPath} state={detailState} className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-2">
          <p className={`text-base font-bold ${purchasable ? 'text-[#e60012]' : 'text-slate-400'}`}>
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>
          {purchasable && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
            <span className="text-xs text-amber-600 font-medium">
              Còn {product.stockQuantity}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={!purchasable || adding}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors
            ${added
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : !purchasable
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600'
            }`}
        >
          {added ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Đã thêm</>
          ) : !purchasable ? (
            <><ShoppingCart className="w-3.5 h-3.5" /> {status === 'INACTIVE' ? 'Ngừng kinh doanh' : (status === 'OUT_OF_STOCK' ? 'Hàng sắp về' : 'Không khả dụng')}</>
          ) : canOpenPreorder ? (
            <><ShoppingCart className="w-3.5 h-3.5" /> Đăng ký chờ hàng</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" /> {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}</>
          )}
        </button>
      </div>
    </div>
  );
}
