import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { preorderApi, productApi, productQuestionApi, productVariantApi } from '../api/j2ee';
import type { Product, ProductMedia, ProductQuestionResponse, ProductStatus, ProductVariant } from '../api/j2ee/types';
import { Package, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Tag, Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { buildProductSlug, extractProductIdFromSlug } from '../utils/productSlug';
import { validateVietnamesePhone } from '../utils/phoneUtils';

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

function getVariantComparableValue(value: ProductVariant['values'][number]) {
  if (value.attrValue != null && value.attrValue.trim() !== '') return value.attrValue.trim();
  if (value.valueNumber != null) return String(value.valueNumber);
  return '';
}

function formatBooleanValue(value: string) {
  if (value === 'true') return 'Có';
  if (value === 'false') return 'Không';
  return value;
}

function formatVariantOptionValue(
  rawValue: string,
  dataType?: ProductVariant['values'][number]['attributeDefinition'] extends infer T
    ? T extends { dataType: infer D }
      ? D
      : never
    : never,
  unit?: string | null
) {
  if (dataType === 'BOOLEAN') {
    return formatBooleanValue(rawValue);
  }
  if (dataType === 'NUMBER') {
    return unit ? `${rawValue}${unit}` : rawValue;
  }
  return rawValue;
}

function formatSpecDisplayValue(
  rawValue: string,
  dataType?: ProductVariant['values'][number]['attributeDefinition'] extends infer T
    ? T extends { dataType: infer D }
      ? D
      : never
    : never,
  unit?: string | null
) {
  if (!rawValue) return '';
  if (dataType === 'BOOLEAN') {
    return formatBooleanValue(rawValue);
  }
  if (dataType === 'NUMBER') {
    return unit ? `${rawValue} ${unit}` : rawValue;
  }
  return rawValue;
}

function resolveProductStatus(product: Product): ProductStatus {
  return product.status ?? (product.isActive ? (product.stockQuantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK') : 'INACTIVE');
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const displayVariantId: number | null = (location.state as { displayVariantId?: number | null } | null)?.displayVariantId ?? null;
  const { user, canAccessAdmin } = useAuth();
  const isBackofficeUser = canAccessAdmin; // Admin, Manager, or Staff
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<ProductMedia | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [submittingPreorder, setSubmittingPreorder] = useState(false);
  const [cartMsg, setCartMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preorderForm, setPreorderForm] = useState({
    customerName: '',
    phone: '',
    email: '',
    desiredQuantity: '1',
  });
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [questions, setQuestions] = useState<ProductQuestionResponse[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
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

  const parentGalleryImages = useMemo(
    () => [...(product?.media || [])].filter((m) => m.mediaType === 'IMAGE').sort(mediaSort),
    [product]
  );

  const selectedVariantImages = useMemo(
    () => [...(selectedVariant?.media || [])].filter((m) => m.mediaType === 'IMAGE').sort(mediaSort),
    [selectedVariant]
  );

  const filteredGalleryImages = useMemo(() => {
    if (!selectedVariant) {
      return parentGalleryImages;
    }

    return selectedVariantImages.length > 0 ? selectedVariantImages : parentGalleryImages;
  }, [selectedVariant, selectedVariantImages, parentGalleryImages]);

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
      productQuestionApi.getByProduct(productId).catch(() => null),
    ])
      .then(([res, variantRes, questionRes]) => {
        const p = res.data.data as Product;
        setProduct(p);
        setQuestions(questionRes?.data?.data || []);

        const canonicalSlug = buildProductSlug(p);
        if (slug !== canonicalSlug) {
          navigate(`/products/${canonicalSlug}`, { replace: true });
        }

        const primary = p.media?.find((m) => m.isPrimary) || p.media?.[0] || null;
        setActiveMedia(primary);

        const variantList = variantRes?.data?.data || [];
        setVariants(variantList);
        setSelectedVariant(null);

        if (variantList.length > 0) {
          if (displayVariantId != null) {
            // Came from a variant-substituted card → select that specific variant
            const targetVariant =
              variantList.find((v: ProductVariant) => v.id === displayVariantId) ||
              variantList.find((v: ProductVariant) => v.isActive && (v.stockQuantity ?? 0) > 0) ||
              variantList[0];
            const autoOptions: Record<string, string> = {};
            for (const value of targetVariant.values || []) {
              const key = value.attrKey;
              const val = getVariantComparableValue(value);
              if (key && val) autoOptions[key] = val;
            }
            setSelectedOptions(Object.keys(autoOptions).length > 0 ? autoOptions : {});
          } else {
            // Came from a parent-showing card → try to match parent's specs to variant dimensions
            const keyByLower = new Map<string, string>();
            for (const v of variantList) {
              for (const val of (v.values || [])) {
                if (!val.attrKey) continue;
                const normalized = val.attrKey.trim().toLowerCase();
                if (!keyByLower.has(normalized)) keyByLower.set(normalized, val.attrKey);
                const defKey = val.attributeDefinition?.attrKey?.trim().toLowerCase();
                if (defKey && !keyByLower.has(defKey)) keyByLower.set(defKey, val.attrKey);
              }
            }
            const parentOptions: Record<string, string> = {};
            for (const spec of (p.specifications || [])) {
              const rawValue = spec.specValue?.trim() || (spec.valueNumber != null ? String(spec.valueNumber) : '');
              if (!rawValue) continue;
              const candidateKeys = [
                spec.attributeDefinition?.attrKey?.trim().toLowerCase(),
                spec.specKey?.trim().toLowerCase(),
              ].filter(Boolean) as string[];
              for (const candidateKey of candidateKeys) {
                const originalKey = keyByLower.get(candidateKey);
                if (originalKey) {
                  parentOptions[originalKey] = rawValue;
                  break;
                }
              }
            }
            setSelectedOptions(parentOptions);
          }
        } else {
          setSelectedOptions({});
        }
      })
      .catch(() => setError('Không tìm thấy sản phẩm'))
      .finally(() => setLoading(false));
  }, [slug, navigate, displayVariantId]);

  const reloadQuestions = async (productId: number) => {
    try {
      setLoadingQuestions(true);
      const response = await productQuestionApi.getByProduct(productId);
      setQuestions(response.data.data || []);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!product) return;

    const content = questionInput.trim();
    if (!content) {
      setQuestionError('Vui lòng nhập nội dung câu hỏi');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    setQuestionError('');
    setSubmittingQuestion(true);
    try {
      await productQuestionApi.create(product.id, { question: content });
      setQuestionInput('');
      await reloadQuestions(product.id);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setQuestionError(message || 'Không thể gửi câu hỏi');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  useEffect(() => {
    if (!location.hash) return;
    const elementId = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [location.hash, questions.length]);

  useEffect(() => {
    setPreorderForm((prev) => ({
      customerName: prev.customerName || user?.fullName || user?.username || '',
      phone: prev.phone || user?.phone || '',
      email: prev.email || user?.email || '',
      desiredQuantity: prev.desiredQuantity || '1',
    }));
  }, [user]);

  useEffect(() => {
    if (variants.length === 0) return;

    const hasActiveSelections = Object.values(selectedOptions).some((value) => Boolean(value));
    if (!hasActiveSelections) {
      setSelectedVariant(null);
      return;
    }

    const next = variants.find((variant) =>
      Object.entries(selectedOptions).every(([key, value]) =>
        variant.values.some((variantValue) => variantValue.attrKey === key && getVariantComparableValue(variantValue) === value)
      )
    ) || null;

    setSelectedVariant(next);
  }, [variants, selectedOptions]);

  useEffect(() => {
    if (!product) return;

    setActiveMedia((current) => {
      const imagePool = filteredGalleryImages;
      if (imagePool.length === 0) {
        return null;
      }

      // When no variant is selected (parent specs shown), ensure we display a parent image.
      // If the current image belongs to a variant (not in product.media), reset to parent primary.
      if (!selectedVariant && current) {
        const isParentImage = (product.media || []).some((m) => m.id === current.id);
        if (!isParentImage) {
          const parentImages = [...(product.media || [])]
            .filter((m) => m.mediaType === 'IMAGE')
            .sort(mediaSort);
          const parentPrimary = parentImages.find((m) => m.isPrimary) || parentImages[0];
          if (parentPrimary && imagePool.some((m) => m.id === parentPrimary.id)) {
            return parentPrimary;
          }
          return imagePool.find((m) => m.isPrimary) || imagePool[0];
        }
      }

      if (current && imagePool.some((media) => media.id === current.id)) {
        return current;
      }

      const variantPrimary = selectedVariantImages.find((media) => media.isPrimary);
      if (variantPrimary && imagePool.some((media) => media.id === variantPrimary.id)) {
        return variantPrimary;
      }

      return imagePool.find((media) => media.isPrimary) || imagePool[0];
    });
  }, [selectedVariant?.id, selectedVariantImages, filteredGalleryImages, product]);

  useEffect(() => {
    setThumbStartIndex(0);
  }, [filteredGalleryImages.length, selectedVariant?.id]);

  const images = filteredGalleryImages;
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

  const variantOverrideByDefId = new Map<number, string>();
  const variantOverrideByAttrKey = new Map<string, string>();
  for (const value of selectedVariant?.values || []) {
    const normalizedValue = getVariantComparableValue(value);
    if (!normalizedValue) continue;
    const defId = value.attributeDefinition?.id;
    if (defId != null) {
      variantOverrideByDefId.set(defId, normalizedValue);
    }
    const attrKey = value.attrKey?.trim().toLowerCase();
    if (attrKey) {
      variantOverrideByAttrKey.set(attrKey, normalizedValue);
    }
    const defAttrKey = value.attributeDefinition?.attrKey?.trim().toLowerCase();
    if (defAttrKey) {
      variantOverrideByAttrKey.set(defAttrKey, normalizedValue);
    }
  }

  const optionLabels: Record<string, string> = {};
  const optionMap: Record<string, string[]> = {};
  const optionDisplayMap: Record<string, Record<string, string>> = {};
  const optionDisplayMapLower: Record<string, Record<string, string>> = {};
  const variantOptionDefIdToKeyLower = new Map<number, string>();
  const optionKeyByLower: Record<string, string> = {};
  for (const variant of variants) {
    for (const value of variant.values || []) {
      const key = value.attrKey;
      const normalizedKey = key?.trim().toLowerCase();
      const optionValue = getVariantComparableValue(value);
      if (!key || !optionValue) continue;
      if (!optionMap[key]) optionMap[key] = [];
      if (!optionMap[key].includes(optionValue)) {
        optionMap[key].push(optionValue);
      }
      if (!optionDisplayMap[key]) optionDisplayMap[key] = {};
      optionDisplayMap[key][optionValue] = formatVariantOptionValue(
        optionValue,
        value.attributeDefinition?.dataType,
        value.attributeDefinition?.unit
      );
      if (!optionLabels[key]) {
        optionLabels[key] = value.attributeDefinition?.name || key;
      }

      if (normalizedKey) {
        if (!optionDisplayMapLower[normalizedKey]) optionDisplayMapLower[normalizedKey] = {};
        optionDisplayMapLower[normalizedKey][optionValue] = optionDisplayMap[key][optionValue];
        if (!optionKeyByLower[normalizedKey]) {
          optionKeyByLower[normalizedKey] = key;
        }
      }

      const defId = value.attributeDefinition?.id;
      if (defId != null && normalizedKey) {
        variantOptionDefIdToKeyLower.set(defId, normalizedKey);
      }

      const defAttrKey = value.attributeDefinition?.attrKey?.trim().toLowerCase();
      if (defAttrKey) {
        if (!optionDisplayMapLower[defAttrKey]) optionDisplayMapLower[defAttrKey] = {};
        optionDisplayMapLower[defAttrKey][optionValue] = optionDisplayMap[key][optionValue];
        if (!optionKeyByLower[defAttrKey]) {
          optionKeyByLower[defAttrKey] = key;
        }
        if (defId != null && !variantOptionDefIdToKeyLower.has(defId)) {
          variantOptionDefIdToKeyLower.set(defId, defAttrKey);
        }
      }
    }
  }

  const parentOptionValues: Record<string, string> = {};
  for (const spec of specs) {
    const rawParentValue = spec.specValue != null && spec.specValue.trim() !== ''
      ? spec.specValue.trim()
      : spec.valueNumber != null
        ? String(spec.valueNumber)
        : '';
    if (!rawParentValue) continue;

    const byDefId = spec.attributeDefinition?.id != null
      ? variantOptionDefIdToKeyLower.get(spec.attributeDefinition.id)
      : undefined;
    const byAttrKey = spec.attributeDefinition?.attrKey?.trim().toLowerCase() || undefined;
    const bySpecKey = spec.specKey?.trim().toLowerCase() || undefined;

    const normalizedOptionKey = byDefId || byAttrKey || bySpecKey;
    if (!normalizedOptionKey) continue;

    const optionKey = optionKeyByLower[normalizedOptionKey];
    if (!optionKey) continue;

    if (!optionMap[optionKey]) optionMap[optionKey] = [];
    if (!optionMap[optionKey].includes(rawParentValue)) {
      optionMap[optionKey].push(rawParentValue);
    }

    if (!optionDisplayMap[optionKey]) optionDisplayMap[optionKey] = {};
    optionDisplayMap[optionKey][rawParentValue] = formatVariantOptionValue(
      rawParentValue,
      spec.attributeDefinition?.dataType,
      spec.attributeDefinition?.unit
    );

    if (!optionDisplayMapLower[normalizedOptionKey]) optionDisplayMapLower[normalizedOptionKey] = {};
    optionDisplayMapLower[normalizedOptionKey][rawParentValue] = optionDisplayMap[optionKey][rawParentValue];
    parentOptionValues[optionKey] = rawParentValue;
  }

  const selectedOptionsByKeyLower = new Map<string, string>();
  for (const [selectedKey, selectedValue] of Object.entries(selectedOptions)) {
    const normalizedSelectedKey = selectedKey.trim().toLowerCase();
    if (!normalizedSelectedKey || !selectedValue) continue;
    selectedOptionsByKeyLower.set(normalizedSelectedKey, selectedValue);
  }
  const hasVariants = variants.length > 0;
  const requiredOptionKeys = Object.keys(optionMap);
  const isSelectionComplete = !hasVariants || requiredOptionKeys.every((key) => Boolean(selectedOptions[key]));

  const variantHasOption = (variant: ProductVariant, key: string, value: string) =>
    (variant.values || []).some(
      (variantValue) => variantValue.attrKey === key && getVariantComparableValue(variantValue) === value
    );

  const productStatus = resolveProductStatus(product);
  const parentPurchasable = (productStatus === 'ACTIVE' || productStatus === 'NEW_ARRIVAL') && (product.stockQuantity ?? 0) > 0;
  const parentPreorderable = productStatus === 'OUT_OF_STOCK';
  const parentPurchasableOrPreorderable = parentPurchasable || parentPreorderable;

  const parentMatchesSelection = (selection: Record<string, string>) => {
    if (!parentPurchasableOrPreorderable) return false;
    const entries = Object.entries(selection).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return true;
    return entries.every(([key, value]) => parentOptionValues[key] === value);
  };

  const isOptionAvailable = (optionKey: string, optionValue: string) => {
    const candidateSelection: Record<string, string> = {};
    for (const [selectedKey, selectedValue] of Object.entries(selectedOptions)) {
      if (!selectedValue || selectedKey === optionKey) continue;
      candidateSelection[selectedKey] = selectedValue;
    }
    candidateSelection[optionKey] = optionValue;

    const hasVariantMatch = variants.some((variant) => {
      if (!variantHasOption(variant, optionKey, optionValue)) return false;
      for (const [selectedKey, selectedValue] of Object.entries(selectedOptions)) {
        if (!selectedValue || selectedKey === optionKey) continue;
        if (!variantHasOption(variant, selectedKey, selectedValue)) return false;
      }
      return true;
    });

    return hasVariantMatch || parentMatchesSelection(candidateSelection);
  };

  const isSelectionValid = (selection: Record<string, string>) => {
    const entries = Object.entries(selection).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return true;
    const hasVariantMatch = variants.some((variant) =>
      entries.every(([key, value]) => variantHasOption(variant, key, value))
    );
    return hasVariantMatch || parentMatchesSelection(selection);
  };

  const handleOptionSelect = (optionKey: string, optionValue: string) => {
    setSelectedOptions((prev) => {
      const next = { ...prev, [optionKey]: optionValue };
      if (isSelectionValid(next)) return next;

      const fallback: Record<string, string> = { [optionKey]: optionValue };
      return fallback;
    });
  };

  const specRows: Array<{
    group: string;
    key: string;
    baseValue: string;
    attrDefId?: number;
    attrKey?: string;
    dataType?: ProductVariant['values'][number]['attributeDefinition'] extends infer T
      ? T extends { dataType: infer D }
        ? D
        : never
      : never;
    unit?: string | null;
  }> = [];

  const existingDefIds = new Set<number>();
  const existingAttrKeys = new Set<string>();

  for (const spec of specs) {
    const group = spec.attributeDefinition?.attributeGroup?.name || 'Thông số khác';
    const key = spec.attributeDefinition?.name || spec.specKey || '';
    const dataType = spec.attributeDefinition?.dataType;
    const unit = spec.attributeDefinition?.unit;
    const attrDefId = spec.attributeDefinition?.id;
    const attrKey = spec.attributeDefinition?.attrKey?.trim().toLowerCase() || spec.specKey?.trim().toLowerCase() || undefined;
    const baseValue =
      spec.specValue ||
      (spec.valueNumber != null
        ? formatSpecDisplayValue(String(spec.valueNumber), dataType, unit)
        : '');

    if (attrDefId != null) existingDefIds.add(attrDefId);
    if (attrKey) existingAttrKeys.add(attrKey);

    specRows.push({
      group,
      key,
      baseValue,
      attrDefId,
      attrKey,
      dataType,
      unit,
    });
  }

  for (const variant of variants) {
    for (const variantValue of variant.values || []) {
      const defId = variantValue.attributeDefinition?.id;
      const fallbackAttrKey = variantValue.attributeDefinition?.attrKey?.trim().toLowerCase() || variantValue.attrKey?.trim().toLowerCase() || '';
      if (defId != null && existingDefIds.has(defId)) continue;
      if (defId == null && fallbackAttrKey && existingAttrKeys.has(fallbackAttrKey)) continue;

      const key = variantValue.attributeDefinition?.name || variantValue.attrKey || '';
      if (!key) continue;

      const rawValue = getVariantComparableValue(variantValue);
      const dataType = variantValue.attributeDefinition?.dataType;
      const unit = variantValue.attributeDefinition?.unit;
      const baseValue = formatSpecDisplayValue(rawValue, dataType, unit);

      if (defId != null) existingDefIds.add(defId);
      if (fallbackAttrKey) existingAttrKeys.add(fallbackAttrKey);

      specRows.push({
        group: variantValue.attributeDefinition?.attributeGroup?.name || 'Thông số khác',
        key,
        baseValue,
        attrDefId: defId,
        attrKey: fallbackAttrKey || undefined,
        dataType,
        unit,
      });
    }
  }

  const grouped: Record<string, { key: string; value: string }[]> = {};
  for (const row of specRows) {
    const rowVariantOptionKey = row.attrDefId != null
      ? variantOptionDefIdToKeyLower.get(row.attrDefId)
      : undefined;
    const normalizedRowAttrKey = row.attrKey?.trim().toLowerCase();
    const variantDimensionKey = normalizedRowAttrKey || rowVariantOptionKey;
    const isVariantDimension = Boolean(variantDimensionKey && optionDisplayMapLower[variantDimensionKey]);

    if (isVariantDimension && variantDimensionKey) {
      const selectedOptionRawValue = selectedOptionsByKeyLower.get(variantDimensionKey);
      const value = selectedOptionRawValue
        ? optionDisplayMapLower[variantDimensionKey]?.[selectedOptionRawValue] ||
          formatSpecDisplayValue(selectedOptionRawValue, row.dataType, row.unit)
        : '-';

      if (!grouped[row.group]) grouped[row.group] = [];
      grouped[row.group].push({ key: row.key, value });
      continue;
    }

    let overrideValue = '';
    if (row.attrDefId != null) {
      overrideValue = variantOverrideByDefId.get(row.attrDefId) || '';
    }
    if (!overrideValue && row.attrKey) {
      overrideValue = variantOverrideByAttrKey.get(row.attrKey) || '';
    }

    const value = overrideValue
      ? formatSpecDisplayValue(overrideValue, row.dataType, row.unit)
      : row.baseValue;

    if (!grouped[row.group]) grouped[row.group] = [];
    grouped[row.group].push({ key: row.key, value });
  }

  const displayProductName = selectedVariant?.sku?.trim() ? selectedVariant.sku : product.name;
  const currentPrice = selectedVariant?.price ?? product.price;
  const isParentMatchingSelection = isSelectionComplete && parentMatchesSelection(selectedOptions);
  const selectedVariantStatus: ProductStatus | null = selectedVariant
    ? (!selectedVariant.isActive
      ? 'INACTIVE'
      : selectedVariant.stockQuantity > 0
        ? 'ACTIVE'
        : 'OUT_OF_STOCK')
    : null;
  const canUseParent = !hasVariants || (isSelectionComplete && !selectedVariant && isParentMatchingSelection);
  const effectiveStatus: ProductStatus | null = selectedVariantStatus ?? (canUseParent ? productStatus : null);
  const effectivePreorderable = effectiveStatus === 'OUT_OF_STOCK';
  const effectivePurchasable = effectiveStatus === 'ACTIVE' || effectiveStatus === 'NEW_ARRIVAL';
  const canAddToCart = Boolean(effectiveStatus && effectivePurchasable);
  const canBuyNow = canAddToCart;
  const canPreorder = Boolean(effectivePreorderable);
  const currentStock = selectedVariant
    ? (selectedVariant.stockQuantity ?? 0)
    : canUseParent
      ? (product.stockQuantity ?? 0)
      : 0;
  const inStock = effectivePurchasable;

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      setAddingToCart(true);
      setCartMsg(null);
      if (hasVariants && !isSelectionComplete) {
        setCartMsg({ type: 'error', text: 'Vui lòng chọn phân loại sản phẩm' });
        return;
      }
      if (hasVariants && !selectedVariant && !isParentMatchingSelection) {
        setCartMsg({ type: 'error', text: 'Sản phẩm hiện không khả dụng' });
        return;
      }
      if (hasVariants && selectedVariant && !selectedVariant.isActive) {
        setCartMsg({ type: 'error', text: 'Sản phẩm đã ngừng kinh doanh' });
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

  const handleBuyNow = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (hasVariants && !isSelectionComplete) {
      setCartMsg({ type: 'error', text: 'Vui lòng chọn phân loại sản phẩm' });
      return;
    }
    if (hasVariants && !selectedVariant && !isParentMatchingSelection) {
      setCartMsg({ type: 'error', text: 'Sản phẩm hiện không khả dụng' });
      return;
    }
    if (hasVariants && selectedVariant && !selectedVariant.isActive) {
      setCartMsg({ type: 'error', text: 'Sản phẩm đã ngừng kinh doanh' });
      return;
    }
    if (!canBuyNow) {
      setCartMsg({ type: 'error', text: 'Sản phẩm này hiện chưa thể mua ngay' });
      return;
    }
    // Không thêm vào giỏ hàng, truyền thẳng sang checkout qua router state
    navigate('/checkout', {
      state: {
        buyNow: {
          productId: product.id,
          variantId: selectedVariant?.id,
          qty,
          productName: displayProductName,
          unitPrice: currentPrice,
          media: product.media,
        },
      },
    });
  };

  const handlePreorderSubmit = async () => {
    if (!product || !canPreorder) return;

    if (hasVariants && !isSelectionComplete) {
      setCartMsg({ type: 'error', text: 'Vui lòng chọn phân loại sản phẩm' });
      return;
    }

    if (hasVariants && !selectedVariant && !isParentMatchingSelection) {
      setCartMsg({ type: 'error', text: 'Vui lòng chọn đúng phân loại cần chờ hàng' });
      return;
    }

    const customerName = preorderForm.customerName.trim();
    const phone = preorderForm.phone.trim();
    const email = preorderForm.email.trim();
    const desiredQuantity = Math.max(1, Number(preorderForm.desiredQuantity || '1'));

    if (!customerName) {
      setCartMsg({ type: 'error', text: 'Vui lòng nhập họ tên' });
      return;
    }

    const phoneError = validateVietnamesePhone(phone);
    if (phoneError) {
      setCartMsg({ type: 'error', text: phoneError });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCartMsg({ type: 'error', text: 'Email không hợp lệ' });
      return;
    }

    try {
      setSubmittingPreorder(true);
      setCartMsg(null);
      await preorderApi.create({
        productId: product.id,
        variantId: selectedVariant?.id,
        customerName,
        phone,
        email,
        desiredQuantity,
      });
      setCartMsg({ type: 'success', text: 'Đăng ký chờ hàng thành công. Hệ thống sẽ gửi email khi hàng về.' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể gửi yêu cầu chờ hàng';
      setCartMsg({ type: 'error', text: msg });
    } finally {
      setSubmittingPreorder(false);
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
        <span className="text-slate-700 font-medium truncate max-w-xs">{displayProductName}</span>
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
          <h1 className="text-2xl font-extrabold text-slate-800 leading-snug">{displayProductName}</h1>

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
                          {optionDisplayMap[optionKey]?.[value] || formatBooleanValue(value)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* {hasVariants && isSelectionComplete && !selectedVariant && (
                <p className="text-xs text-rose-500">Hiện tại chưa có hàng.</p>
              )} */}

              {hasVariants && !isSelectionComplete && (
                <p className="text-xs text-slate-500">Vui lòng chọn phân loại sản phẩm.</p>
              )}
            </div>
          )}

          {/* Stock & category */}
          <div className="flex flex-wrap items-center gap-3">
            {hasVariants && !isSelectionComplete ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <XCircle className="w-4 h-4" />
                Vui lòng chọn phân loại sản phẩm.
              </div>
            ) : !effectiveStatus ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-rose-500">
                <XCircle className="w-4 h-4" />
                Sản phẩm hiện không khả dụng.
              </div>
            ) : effectiveStatus === 'INACTIVE' ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                <XCircle className="w-4 h-4" />
                Ngừng kinh doanh
              </div>
            ) : effectiveStatus === 'OUT_OF_STOCK' ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700">
                <XCircle className="w-4 h-4" />
                Sản phẩm sắp về hàng. Bạn có thể đăng ký chờ để nhận thông báo khi hàng về.
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-amber-600'}`}>
                {inStock ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {inStock ? `Còn hàng (${currentStock})` : effectiveStatus === 'NEW_ARRIVAL' ? 'Hàng mới về' : 'Hàng sắp về'}
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
            {canAddToCart && !effectivePreorderable && (
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

            {canPreorder && (
              <div className="rounded-2xl border border-orange-200 bg-linear-to-br from-orange-50 via-white to-amber-50 p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-orange-700">Đăng ký chờ hàng</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Điền thông tin bên dưới. Khi hàng về, hệ thống sẽ email cho các khách đã đăng ký theo thứ tự chờ.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Họ và tên</span>
                    <input
                      type="text"
                      value={preorderForm.customerName}
                      onChange={(e) => setPreorderForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      placeholder="Nhập họ tên"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">Số điện thoại</span>
                    <input
                      type="tel"
                      value={preorderForm.phone}
                      onChange={(e) => setPreorderForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      placeholder="0912345678"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-slate-600">Email</span>
                    <input
                      type="email"
                      value={preorderForm.email}
                      onChange={(e) => setPreorderForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="block sm:max-w-45">
                    <span className="text-xs font-medium text-slate-600">Số lượng mong muốn</span>
                    <input
                      type="number"
                      min={1}
                      value={preorderForm.desiredQuantity}
                      onChange={(e) => setPreorderForm((prev) => ({ ...prev, desiredQuantity: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Add to cart & Buy now buttons - Hidden for backoffice users */}
            {!isBackofficeUser && (
              <div className="flex gap-3">
                <button
                  onClick={canPreorder ? handlePreorderSubmit : handleAddToCart}
                  disabled={canPreorder ? submittingPreorder : (!canAddToCart || addingToCart)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm ${
                    canPreorder
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {canPreorder
                    ? (submittingPreorder ? 'Đang gửi yêu cầu...' : 'Đặt trước')
                    : addingToCart
                      ? 'Đang thêm...'
                      : canAddToCart
                        ? 'Thêm vào giỏ hàng'
                        : hasVariants
                          ? 'Thêm vào giỏ hàng'
                          : effectiveStatus === 'INACTIVE'
                            ? 'Ngừng kinh doanh'
                            : effectiveStatus === 'NEW_ARRIVAL'
                              ? 'Hàng mới về'
                              : 'Hàng sắp về'}
                </button>
                {canBuyNow && (
                  <button
                    onClick={handleBuyNow}
                    disabled={!canBuyNow || addingToCart}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#e60012] text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    <Zap className="w-4 h-4" />
                    Mua ngay
                  </button>
                )}
              </div>
            )}
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mt-6" id="product-qna">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">Hỏi đáp về sản phẩm</h2>
          {loadingQuestions && <span className="text-xs text-slate-400">Đang tải...</span>}
        </div>

        {!isBackofficeUser && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <textarea
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              placeholder={user ? 'Nhập câu hỏi của bạn về sản phẩm...' : 'Đăng nhập để đặt câu hỏi về sản phẩm...'}
              className="w-full min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {questionError && <p className="text-sm text-rose-600">{questionError}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitQuestion}
                disabled={submittingQuestion}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingQuestion ? 'Đang gửi...' : 'Gửi câu hỏi'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có câu hỏi nào cho sản phẩm này.</p>
          ) : (
            questions.map((item) => {
              const isOwnQuestion = user?.userId === item.customerId;
              return (
                <div
                  key={item.id}
                  id={`qna-${item.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 scroll-mt-24"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">{item.customerName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(item.askedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">{item.question}</p>

                  {item.answered ? (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                      <p className="text-xs font-semibold text-emerald-700">
                        Staff phản hồi{item.answeredByName ? ` (${item.answeredByName})` : ''}
                      </p>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{item.answer}</p>
                    </div>
                  ) : (
                    isOwnQuestion && (
                      <p className="mt-3 text-xs font-medium text-amber-700">Câu hỏi của bạn đang chờ staff phản hồi.</p>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
