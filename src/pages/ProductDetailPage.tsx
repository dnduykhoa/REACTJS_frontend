import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productApi } from '../api/j2ee';
import type { Product, ProductMedia } from '../api/j2ee/types';
import { Package, ChevronRight, CheckCircle2, XCircle, Tag } from 'lucide-react';

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

  if (loading) return <Spinner />;

  if (error || !product) {
    return (
      <div className="text-center py-24">
        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 mb-4">{error || 'Sản phẩm không tồn tại'}</p>
        <Link to="/products" className="text-indigo-600 hover:underline text-sm">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const images = product.media?.filter((m) => m.mediaType === 'IMAGE') || [];
  const specs = product.specifications || [];

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

  const inStock = product.stockQuantity > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
        <Link to="/" className="hover:text-indigo-600 transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/products" className="hover:text-indigo-600 transition-colors">Sản phẩm</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        {/* ── Media ── */}
        <div>
          <div className="h-80 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center mb-4 border border-slate-100">
            {activeMedia ? (
              activeMedia.mediaType === 'VIDEO' ? (
                <video src={resolveUrl(activeMedia.mediaUrl)} controls className="max-h-full" />
              ) : (
                <img
                  src={resolveUrl(activeMedia.mediaUrl)}
                  alt={product.name}
                  className="object-contain max-h-full max-w-full p-4"
                />
              )
            ) : (
              <Package className="w-20 h-20 text-slate-200" />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {images.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMedia(m)}
                  className={`w-16 h-16 border-2 rounded-xl overflow-hidden transition-colors ${
                    activeMedia?.id === m.id
                      ? 'border-indigo-500 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <img src={resolveUrl(m.mediaUrl)} alt="" className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col gap-4">
          {product.brand && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              {product.brand.name}
            </span>
          )}
          <h1 className="text-2xl font-extrabold text-slate-800 leading-snug">{product.name}</h1>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-indigo-600">
              {Number(product.price).toLocaleString('vi-VN')}₫
            </p>
          </div>

          {/* Stock & category */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-rose-500'}`}>
              {inStock ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {inStock ? `Còn hàng (${product.stockQuantity})` : 'Hết hàng'}
            </div>
            {product.category && (
              <Link
                to={`/products?categoryId=${product.category.id}`}
                className="text-xs bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-colors font-medium"
              >
                {product.category.name}
              </Link>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
              {product.description}
            </p>
          )}

          <div className="mt-auto pt-4">
            <button
              disabled={!inStock}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {inStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Specifications ── */}
      {Object.keys(grouped).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mt-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Thông số kỹ thuật</h2>
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName}>
                <h3 className="text-sm font-semibold text-indigo-600 mb-3 uppercase tracking-wide">{groupName}</h3>
                <div className="rounded-xl overflow-hidden border border-slate-100">
                  <table className="w-full text-sm">
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="py-2.5 px-4 w-2/5 text-slate-500 font-medium">{item.key}</td>
                          <td className="py-2.5 px-4 text-slate-800">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
