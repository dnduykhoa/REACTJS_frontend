import { Link } from 'react-router-dom';
import type { Product } from '../api/j2ee/types';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function getImageUrl(product: Product) {
  const primary = product.media?.find((m) => m.isPrimary && m.mediaType === 'IMAGE');
  const first = product.media?.find((m) => m.mediaType === 'IMAGE');
  const url = primary?.mediaUrl || first?.mediaUrl;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}/uploads/${url}`;
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const imgUrl = getImageUrl(product);

  return (
    <Link
      to={`/products/${product.id}`}
      className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
    >
      <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={product.name}
            className="object-contain h-full w-full p-2"
          />
        ) : (
          <span className="text-gray-400 text-4xl">🖥️</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-gray-400 mb-1">{product.brand?.name || ''}</p>
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{product.name}</h3>
        <p className="mt-2 text-blue-600 font-bold text-base">
          {Number(product.price).toLocaleString('vi-VN')}₫
        </p>
        {product.stockQuantity === 0 && (
          <span className="mt-1 text-xs text-red-500">Hết hàng</span>
        )}
      </div>
    </Link>
  );
}
