import { Link } from 'react-router-dom';
import type { Product } from '../api/j2ee/types';
import { Package } from 'lucide-react';

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

export default function ProductCard({ product }: { product: Product }) {
  const imgUrl = getImageUrl(product);
  const outOfStock = product.stockQuantity === 0;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="object-contain h-full w-full p-3 group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <Package className="w-14 h-14 text-slate-200" />
        )}
        {outOfStock && (
          <span className="absolute top-2 right-2 bg-slate-900/75 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
            Hết hàng
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-1">
        {product.brand && (
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
            {product.brand.name}
          </p>
        )}
        <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 flex-1 leading-snug">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-bold text-indigo-600">
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>
          {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
            <span className="text-xs text-amber-600 font-medium">
              Còn {product.stockQuantity}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
