import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productApi, productVariantApi } from '../api/j2ee';
import type { Product, ProductMedia, ProductVariant } from '../api/j2ee/types';
import { Package, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Tag, Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { buildProductSlug, extractProductIdFromSlug } from '../utils/productSlug';

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<ProductMedia | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [thumbStartIndex, setThumbStartIndex] = useState(0);
  const [lastManualImageInteractionAt, setLastManualImageInteractionAt] = useState<number | null>(null);

  const THUMBNAIL_WINDOW_SIZE = 8;

  const mediaSort = (a: ProductMedia, b: ProductMedia) => {
    const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.id - b.id;
  };

  const allGalleryImages = useMemo(() => {
    const orderedVariants = [...variants].sort((a, b) => {
      const orderDiff = (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.id - b.id;
    });

    const variantImages = orderedVariants.flatMap((variant) =>
      [...(variant.media || [])]
        .filter((m) => m.mediaType === 'IMAGE')
        .sort(mediaSort)
    );

    const productImages = [...(product?.media || [])]
      .filter((m) => m.mediaType === 'IMAGE')
      .sort(mediaSort)
      .filter((m) => !variantImages.some((variantMedia) => variantMedia.id === m.id));

    return [...variantImages, ...productImages];
  }, [variants, product]);

  const selectedVariantImages = useMemo(
    () => [...(selectedVariant?.media || [])].filter((m) => m.mediaType === 'IMAGE').sort(mediaSort),
    [selectedVariant]
  );

  useEffect(() => {
    const productId = extractProductIdFromSlug(slug);
    if (!productId) {
      setError('Không tìm thấy sản phẩm');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    Promise.all([
      productApi.getById(productId),
      productVariantApi.getByProduct(productId, true).catch(() => null),
    ])
      .then(([res, variantRes]) => {
        const p = res.data.data as Product;
        setProduct(p);

        const canonicalSlug = buildProductSlug(p);
        if (slug !== canonicalSlug) {
          navigate(`/products/${canonicalSlug}`, { replace: true });
        }

        const primary = p.media?.find((m) => m.isPrimary) || p.media?.[0] || null;
        setActiveMedia(primary);

        const variantList = variantRes?.data?.data || [];
        setVariants(variantList);

        if (variantList.length > 0) {
          const firstVariant = variantList[0];
          setSelectedVariant(firstVariant);

          const defaultSelections: Record<string, string> = {};
          firstVariant.values.forEach((value) => {
            if (value.attrKey && value.attrValue) {
              defaultSelections[value.attrKey] = value.attrValue;
            }
          });
          setSelectedOptions(defaultSelections);
        }
      })
      .catch(() => setError('Không tìm thấy sản phẩm'))
      .finally(() => setLoading(false));
  }, [slug, navigate]);

  useEffect(() => {
    if (variants.length === 0) return;

    const next = variants.find((variant) =>
      Object.entries(selectedOptions).every(([key, value]) =>
        variant.values.some((variantValue) => variantValue.attrKey === key && variantValue.attrValue === value)
      )
    ) || null;

    setSelectedVariant(next);
  }, [variants, selectedOptions]);

  useEffect(() => {
    if (!product) return;

    if (selectedVariantImages.length > 0) {
      const variantPrimary = selectedVariantImages.find((m) => m.isPrimary) || selectedVariantImages[0];
      setActiveMedia(variantPrimary);
      return;
    }

    if (allGalleryImages.length > 0) {
      const fallbackPrimary = allGalleryImages.find((m) => m.isPrimary) || allGalleryImages[0];
      setActiveMedia(fallbackPrimary);
      return;
    }

    setActiveMedia(null);
  }, [selectedVariant?.id, selectedVariantImages, allGalleryImages, product]);

  useEffect(() => {
    setThumbStartIndex(0);
  }, [allGalleryImages.length]);

  const images = allGalleryImages;
  const activeIndex = activeMedia ? images.findIndex((m) => m.id === activeMedia.id) : -1;
  const maxThumbStart = Math.max(0, images.length - THUMBNAIL_WINDOW_SIZE);

  useEffect(() => {
    if (activeIndex < 0) return;
    setThumbStartIndex((prev) => {
      const clampedPrev = Math.min(prev, maxThumbStart);
      if (activeIndex < clampedPrev) return activeIndex;
      if (activeIndex >= clampedPrev + THUMBNAIL_WINDOW_SIZE) {
        return Math.min(activeIndex - THUMBNAIL_WINDOW_SIZE + 1, maxThumbStart);
      }
      return clampedPrev;
    });
  }, [activeIndex, maxThumbStart]);

  useEffect(() => {
    if (images.length <= 1) return;

    const timerId = window.setInterval(() => {
      if (lastManualImageInteractionAt && Date.now() - lastManualImageInteractionAt < 5000) {
        return;
      }

      setActiveMedia((current) => {
        const currentIndex = current ? images.findIndex((m) => m.id === current.id) : -1;
        const nextIndex = currentIndex >= 0 && currentIndex < images.length - 1 ? currentIndex + 1 : 0;
        return images[nextIndex] || null;
      });
    }, 3000);

    return () => window.clearInterval(timerId);
  }, [images, lastManualImageInteractionAt]);

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

  const showPrevImage = () => {
    if (images.length <= 1) return;
    setLastManualImageInteractionAt(Date.now());
    const nextIndex = activeIndex <= 0 ? images.length - 1 : activeIndex - 1;
    setActiveMedia(images[nextIndex]);
  };

  const showPrevThumbs = () => {
    setThumbStartIndex((prev) => Math.max(0, prev - 1));
  };

  const showNextThumbs = () => {
    setThumbStartIndex((prev) => Math.min(maxThumbStart, prev + 1));
  };

  const visibleThumbs = images.slice(thumbStartIndex, thumbStartIndex + THUMBNAIL_WINDOW_SIZE);
  const canShowPrevThumbs = thumbStartIndex > 0;
  const canShowNextThumbs = thumbStartIndex < maxThumbStart;

  const showNextImage = () => {
    if (images.length <= 1) return;
    setLastManualImageInteractionAt(Date.now());
    const nextIndex = activeIndex >= images.length - 1 ? 0 : activeIndex + 1;
    setActiveMedia(images[nextIndex]);
  };
  const specs = product.specifications || [];

  const optionLabels: Record<string, string> = {};
  const optionMap: Record<string, string[]> = {};
  for (const variant of variants) {
    for (const value of variant.values || []) {
      const key = value.attrKey;
      const optionValue = value.attrValue;
      if (!key || !optionValue) continue;
      if (!optionMap[key]) optionMap[key] = [];
      if (!optionMap[key].includes(optionValue)) {
        optionMap[key].push(optionValue);
      }
      if (!optionLabels[key]) {
        optionLabels[key] = value.attributeDefinition?.name || key;
      }
    }
  }
  const hasVariants = variants.length > 0;
  const requiredOptionKeys = Object.keys(optionMap);
  const isSelectionComplete = !hasVariants || requiredOptionKeys.every((key) => Boolean(selectedOptions[key]));

  const variantHasOption = (variant: ProductVariant, key: string, value: string) =>
    (variant.values || []).some((variantValue) => variantValue.attrKey === key && variantValue.attrValue === value);

  const isOptionAvailable = (optionKey: string, optionValue: string) => {
    return variants.some((variant) => {
      if (!variantHasOption(variant, optionKey, optionValue)) return false;
      for (const [selectedKey, selectedValue] of Object.entries(selectedOptions)) {
        if (!selectedValue || selectedKey === optionKey) continue;
        if (!variantHasOption(variant, selectedKey, selectedValue)) return false;
      }
      return true;
    });
  };

  const isSelectionValid = (selection: Record<string, string>) => {
    const entries = Object.entries(selection).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return true;
    return variants.some((variant) =>
      entries.every(([key, value]) => variantHasOption(variant, key, value))
    );
  };

  const handleOptionSelect = (optionKey: string, optionValue: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionKey]: optionValue };
      if (isSelectionValid(next)) return next;

      const fallback: Record<string, string> = { [optionKey]: optionValue };
      return fallback;
    });
  };

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

  const isDiscontinued = product.status === 'INACTIVE' || (!product.isActive && product.status !== 'OUT_OF_STOCK');
  const currentPrice = selectedVariant?.price ?? product.price;
  const currentStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const inStock = !isDiscontinued && currentStock > 0;
  const canAddToCart = inStock && !isDiscontinued && (!hasVariants || (isSelectionComplete && !!selectedVariant));

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setAddingToCart(true);
      setCartMsg(null);
      if (hasVariants && (!isSelectionComplete || !selectedVariant)) {
        setCartMsg({ type: 'error', text: 'Vui lòng chọn đầy đủ thuộc tính biến thể' });
        return;
      }
      await addToCart(product.id, qty, selectedVariant?.id);
      setCartMsg({ type: 'success', text: 'Đã thêm vào giỏ hàng!' });
      setTimeout(() => setCartMsg(null), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể thêm vào giỏ hàng';
      setCartMsg({ type: 'error', text: msg });
      setTimeout(() => setCartMsg(null), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setAddingToCart(true);
      if (hasVariants && (!isSelectionComplete || !selectedVariant)) {
        setCartMsg({ type: 'error', text: 'Vui lòng chọn đầy đủ thuộc tính biến thể' });
        return;
      }
      await addToCart(product.id, qty, selectedVariant?.id);
      navigate('/checkout');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể thêm vào giỏ hàng';
      setCartMsg({ type: 'error', text: msg });
      setTimeout(() => setCartMsg(null), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

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
          <div className="relative h-80 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center mb-4 border border-slate-100">
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

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-slate-200 text-slate-700 hover:bg-white shadow-sm flex items-center justify-center"
                  aria-label="Ảnh trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-slate-200 text-slate-700 hover:bg-white shadow-sm flex items-center justify-center"
                  aria-label="Ảnh tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={showPrevThumbs}
                disabled={!canShowPrevThumbs}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Lùi danh sách ảnh"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1 min-w-0 overflow-hidden">
                <div className="flex gap-2 flex-nowrap">
                  {visibleThumbs.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setLastManualImageInteractionAt(Date.now());
                        setActiveMedia(m);
                      }}
                      className={`w-16 h-16 shrink-0 border-2 rounded-xl overflow-hidden transition-colors ${
                        activeMedia?.id === m.id
                          ? 'border-indigo-500 shadow-sm'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      <img src={resolveUrl(m.mediaUrl)} alt="" className="object-cover w-full h-full" />
                    </button>
                  ))}
                </div>

                {canShowNextThumbs && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-linear-to-l from-white to-transparent" />
                )}
              </div>

              <button
                type="button"
                onClick={showNextThumbs}
                disabled={!canShowNextThumbs}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Tiến danh sách ảnh"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {images.length > THUMBNAIL_WINDOW_SIZE && (
            <p className="text-xs text-slate-500 mt-1">
              Hiển thị {thumbStartIndex + 1}-{Math.min(thumbStartIndex + THUMBNAIL_WINDOW_SIZE, images.length)} / {images.length} ảnh
            </p>
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
            <p className="text-3xl font-extrabold text-[#e60012]">
              {Number(currentPrice).toLocaleString('vi-VN')}₫
            </p>
          </div>

          {hasVariants && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {Object.entries(optionMap).map(([optionKey, values]) => (
                <div key={optionKey}>
                  <p className="text-sm font-medium text-slate-700 mb-2">{optionLabels[optionKey]}</p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value) => {
                      const active = selectedOptions[optionKey] === value;
                      const available = isOptionAvailable(optionKey, value);
                      return (
                        <button
                          key={`${optionKey}-${value}`}
                          type="button"
                          onClick={() => handleOptionSelect(optionKey, value)}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${!available
                            ? 'border-slate-200 text-slate-400 bg-slate-100 opacity-60'
                            : active
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                              : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {hasVariants && !selectedVariant && (
                <p className="text-xs text-rose-500">Tổ hợp lựa chọn hiện tại chưa có hàng.</p>
              )}

              {hasVariants && !isSelectionComplete && (
                <p className="text-xs text-amber-600">Vui lòng chọn đủ tất cả thuộc tính để tiếp tục mua hàng.</p>
              )}
            </div>
          )}

          {/* Stock & category */}
          <div className="flex flex-wrap items-center gap-3">
            {isDiscontinued ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <XCircle className="w-4 h-4" />
                Ngưng bán
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-rose-500'}`}>
                {inStock ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {inStock ? `Còn hàng (${currentStock})` : 'Hết hàng'}
              </div>
            )}
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
            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
              {product.description}
            </p>
          )}

          <div className="mt-auto pt-4 space-y-3">
            {/* Quantity selector */}
            {canAddToCart && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Số lượng:</span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 text-sm font-semibold text-slate-800 min-w-10 text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(currentStock, q + 1))}
                    className="px-3 py-2 hover:bg-slate-100 transition-colors text-slate-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Cart feedback */}
            {cartMsg && (
              <div
                className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-medium ${
                  cartMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {cartMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                {cartMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart || addingToCart}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                {addingToCart ? 'Đang thêm...' : isDiscontinued ? 'Ngưng bán' : canAddToCart ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!canAddToCart || addingToCart}
                className="flex-1 flex items-center justify-center gap-2 bg-[#e60012] text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Mua ngay
              </button>
            </div>
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
                          <td className="py-2.5 px-4 text-slate-800 whitespace-pre-line">{item.value}</td>
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
