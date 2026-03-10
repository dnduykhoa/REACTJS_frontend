import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product, ProductStatus } from '../api/j2ee/types';
import { Package, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

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
  OUT_OF_STOCK: { label: 'Hết hàng', cls: 'bg-slate-900/70 backdrop-blur-sm text-white' },
  INACTIVE: { label: 'Ngưng bán', cls: 'bg-rose-600/80 backdrop-blur-sm text-white' },
};

export default function ProductCard({ product }: { product: Product }) {
  const imgUrl = getImageUrl(product);
  const status = resolveStatus(product);
  const unavailable = status !== 'ACTIVE';
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className={`group bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-200 overflow-hidden flex flex-col ${
      unavailable ? 'opacity-70 grayscale-[25%]' : 'hover:shadow-lg hover:-translate-y-1'
    }`}>
      {/* Image */}
      <Link to={`/products/${product.id}`} className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden block">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className={`object-contain h-full w-full p-3 transition-transform duration-300 ${
              unavailable ? '' : 'group-hover:scale-[1.04]'
            }`}
          />
        ) : (
          <Package className="w-14 h-14 text-slate-200" />
        )}
        {unavailable && (
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
        <Link to={`/products/${product.id}`} className="flex-1">
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-2">
          <p className={`text-base font-bold ${unavailable ? 'text-slate-400' : 'text-indigo-600'}`}>
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>
          {!unavailable && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
            <span className="text-xs text-amber-600 font-medium">
              Còn {product.stockQuantity}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={unavailable || adding}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors
            ${added
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : unavailable
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600'
            }`}
        >
          {added ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Đã thêm</>
          ) : unavailable ? (
            <><ShoppingCart className="w-3.5 h-3.5" /> {status === 'INACTIVE' ? 'Ngưng bán' : 'Hết hàng'}</>
          ) : (
            <><ShoppingCart className="w-3.5 h-3.5" /> {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}</>
          )}
        </button>
      </div>
    </div>
  );
}
