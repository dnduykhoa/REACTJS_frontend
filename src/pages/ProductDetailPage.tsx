import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productApi } from '../api/j2ee';
import type { Product, ProductMedia } from '../api/j2ee/types';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BASE_URL}/uploads/${url}`;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<ProductMedia | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    productApi
      .getById(Number(id))
      .then((res) => {
        const p = res.data.data;
        setProduct(p);
        const primary = p.media?.find((m) => m.isPrimary) || p.media?.[0] || null;
        setActiveMedia(primary);
      })
      .catch(() => setError('Không tìm thấy sản phẩm'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">{error || 'Sản phẩm không tồn tại'}</p>
        <Link to="/products" className="text-blue-600 hover:underline text-sm">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const images = product.media?.filter((m) => m.mediaType === 'IMAGE') || [];
  const specs = product.specifications || [];

  // Group specs by attributeGroup
  const grouped: Record<string, { key: string; value: string }[]> = {};
  for (const spec of specs) {
    const group = spec.attributeDefinition?.attributeGroup?.name || 'Thông số khác';
    const key = spec.attributeDefinition?.name || spec.specKey || '';
    const value =
      spec.specValue ||
      (spec.valueNumber != null
        ? `${spec.valueNumber}${spec.attributeDefinition?.unit ? ' ' + spec.attributeDefinition.unit : ''}`
        : '');
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push({ key, value });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="text-sm text-gray-500 mb-4 flex items-center gap-1">
        <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-blue-600">Sản phẩm</Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl shadow p-6">
        {/* Media */}
        <div>
          <div className="h-72 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center mb-3">
            {activeMedia ? (
              activeMedia.mediaType === 'VIDEO' ? (
                <video src={resolveUrl(activeMedia.mediaUrl)} controls className="max-h-full" />
              ) : (
                <img
                  src={resolveUrl(activeMedia.mediaUrl)}
                  alt={product.name}
                  className="object-contain max-h-full"
                />
              )
            ) : (
              <span className="text-gray-300 text-6xl">🖥️</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMedia(m)}
                  className={`w-14 h-14 border-2 rounded-lg overflow-hidden ${activeMedia?.id === m.id ? 'border-blue-500' : 'border-gray-200'}`}
                >
                  <img
                    src={resolveUrl(m.mediaUrl)}
                    alt=""
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-sm text-gray-400 mb-1">{product.brand.name}</p>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-3">{product.name}</h1>
          <p className="text-3xl font-bold text-blue-600 mb-4">
            {Number(product.price).toLocaleString('vi-VN')}₫
          </p>

          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
            <span>
              Kho:{' '}
              <strong className={product.stockQuantity > 0 ? 'text-green-600' : 'text-red-500'}>
                {product.stockQuantity > 0 ? `Còn ${product.stockQuantity}` : 'Hết hàng'}
              </strong>
            </span>
            {product.category && (
              <span>
                Danh mục:{' '}
                <Link
                  to={`/products?categoryId=${product.category.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {product.category.name}
                </Link>
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
          )}

          <div className="mt-auto pt-4">
            <button
              disabled={product.stockQuantity === 0}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {product.stockQuantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {Object.keys(grouped).length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Thông số kỹ thuật</h2>
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="mb-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-2">{groupName}</h3>
              <table className="w-full text-sm">
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-1.5 px-3 w-1/3 text-gray-500 font-medium">{item.key}</td>
                      <td className="py-1.5 px-3 text-gray-800">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
