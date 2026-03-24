import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Cpu, Eye, HardDrive, Loader2, RefreshCcw, Save, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import {
  getApiErrorMessage,
  pcBuilderApi,
  productApi,
  type PcBuilderAvailableVariant,
  type PcBuilderOption,
  type PcBuilderOptionsData,
  type PcBuilderOptionsRequest,
  type PcBuilderSelection,
  type PcBuilderSelectionPayload,
  type PcBuilderSlot,
  type PcBuilderSlotKey,
  type PcBuilderSummaryData,
  type PcBuilderWarning,
  type Product,
} from '../api/j2ee';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getProductDetailPath } from '../utils/productSlug';

const SLOT_ORDER: PcBuilderSlotKey[] = [
  'cpu',
  'mainboard',
  'ram',
  'gpu',
  'storage',
  'psu',
  'case',
  'cooling',
];

const FALLBACK_SLOT_LABELS: Record<PcBuilderSlotKey, string> = {
  cpu: 'CPU',
  mainboard: 'Mainboard',
  ram: 'RAM',
  gpu: 'GPU',
  storage: 'Storage',
  psu: 'PSU',
  case: 'Case',
  cooling: 'Cooling',
};

const WARNING_CODE_MESSAGES: Record<string, string> = {
  CPU_MAINBOARD_SOCKET_MISMATCH: 'CPU và Mainboard không cùng socket.',
  MAINBOARD_RAM_TYPE_MISMATCH: 'Loại RAM không tương thích với Mainboard.',
  PSU_INSUFFICIENT_POWER: 'Công suất PSU chưa đủ cho cấu hình hiện tại.',
  CASE_MAINBOARD_FORM_FACTOR_MISMATCH: 'Case không hỗ trợ form factor của Mainboard.',
  CASE_GPU_LENGTH_MISMATCH: 'Chiều dài VGA có thể vượt giới hạn của Case.',
  INCOMPLETE_BUILD: 'Cấu hình chưa đầy đủ tất cả linh kiện cần thiết.',
  RAM_QUANTITY_EXCEEDS_MAINBOARD_SLOTS: 'So luong RAM vuot qua gioi han slot cua mainboard.',
  RAM_VARIANT_OUT_OF_STOCK: 'Bien the RAM da chon khong du ton kho.',
  RAM_MIXED_SPEC_WARNING: 'Cac thanh RAM co thong so khong dong nhat.',
  VARIANT_NOT_FOUND: 'Bien the da chon khong ton tai.',
  VARIANT_INACTIVE: 'Bien the da chon khong con hoat dong.',
  VARIANT_OUT_OF_STOCK: 'Bien the da chon da het hang.',
};

const STORAGE_KEY = 'pc_builder_selection_v1';

const EMPTY_SELECTION: PcBuilderSelection = {
  cpuId: null,
  mainboardId: null,
  ramId: null,
  gpuId: null,
  storageId: null,
  psuId: null,
  caseId: null,
  coolingId: null,
};

const DEFAULT_SLOT_QUANTITIES: Record<PcBuilderSlotKey, number> = {
  cpu: 1,
  mainboard: 1,
  ram: 1,
  gpu: 1,
  storage: 1,
  psu: 1,
  case: 1,
  cooling: 1,
};

type SelectionIdKey = keyof PcBuilderSelection;

const SLOT_TO_ID_KEY: Record<PcBuilderSlotKey, SelectionIdKey> = {
  cpu: 'cpuId',
  mainboard: 'mainboardId',
  ram: 'ramId',
  gpu: 'gpuId',
  storage: 'storageId',
  psu: 'psuId',
  case: 'caseId',
  cooling: 'coolingId',
};

const formatCurrency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}₫`;
const formatWatt = (value: number) => `${Number(value || 0)}W`;

const normalizeSlotKey = (raw?: string): PcBuilderSlotKey | null => {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'mainboard' || key === 'main') return 'mainboard';
  if (SLOT_ORDER.includes(key as PcBuilderSlotKey)) return key as PcBuilderSlotKey;
  return null;
};

const parseSelectionFromStorage = (raw: string | null): PcBuilderSelection | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<SelectionIdKey, unknown>>;
    const next: PcBuilderSelection = { ...EMPTY_SELECTION };

    (Object.keys(EMPTY_SELECTION) as SelectionIdKey[]).forEach((key) => {
      const value = parsed[key];
      next[key] = typeof value === 'number' && Number.isFinite(value) ? value : null;
    });

    return next;
  } catch {
    return null;
  }
};

const severityClasses: Record<PcBuilderWarning['severity'], string> = {
  INFO: 'bg-sky-50 border-sky-200 text-sky-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-900',
  ERROR: 'bg-rose-50 border-rose-200 text-rose-800',
};

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

const SLOT_SPEC_PRIORITY: Record<PcBuilderSlotKey, string[]> = {
  cpu: ['socket', 'core_count', 'thread_count', 'base_clock', 'boost_clock', 'watt'],
  mainboard: ['socket', 'ram_type', 'form_factor', 'chipset'],
  ram: ['ram_type', 'capacity', 'speed', 'watt'],
  gpu: ['vram', 'gpu_length', 'watt', 'boost_clock'],
  storage: ['storage_type', 'capacity', 'interface', 'read_speed', 'write_speed'],
  psu: ['watt', 'efficiency', 'form_factor'],
  case: ['form_factor', 'max_gpu_length'],
  cooling: ['cooling_type', 'socket_support', 'fan_size'],
};

type OptionTone = 'ok' | 'warning' | 'muted' | 'selected';

const optionToneClass: Record<OptionTone, string> = {
  ok: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  muted: 'bg-slate-100 border-slate-200 text-slate-600',
  selected: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const resolveUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
};

const getProductImage = (product?: Product | null) => {
  if (!product) return '';
  const primary = (product.media || []).find((item) => item.mediaType === 'IMAGE' && item.isPrimary);
  const fallback = (product.media || []).find((item) => item.mediaType === 'IMAGE');
  return resolveUrl(primary?.mediaUrl || fallback?.mediaUrl || '');
};

const isTruthySpecValue = (value: string | number | boolean | null | undefined) => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const normalizeSpecKey = (raw: string) => raw.trim().toLowerCase();

const findSpecValueByCandidates = (
  keySpecs: Record<string, string | number | boolean | null>,
  candidates: string[]
) => {
  const entries = Object.entries(keySpecs || {});
  for (const candidate of candidates) {
    const candidateKey = normalizeSpecKey(candidate);
    const found = entries.find(([key, value]) => normalizeSpecKey(key) === candidateKey && isTruthySpecValue(value));
    if (found) return found[1];
  }
  return null;
};

const toNumber = (value: string | number | boolean | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toReadableSpecLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const topSpecsFromOption = (option: PcBuilderOption, slot: PcBuilderSlotKey, limit = 4) => {
  const entries = Object.entries(option.keySpecs || {});
  const priority = SLOT_SPEC_PRIORITY[slot] || [];
  const selected: Array<{ key: string; value: string | number | boolean | null }> = [];

  for (const key of priority) {
    if (selected.length >= limit) break;
    const found = entries.find(([entryKey, value]) => normalizeSpecKey(entryKey) === normalizeSpecKey(key) && isTruthySpecValue(value));
    if (found && !selected.some((item) => normalizeSpecKey(item.key) === normalizeSpecKey(found[0]))) {
      selected.push({ key: found[0], value: found[1] });
    }
  }

  for (const [key, value] of entries) {
    if (selected.length >= limit) break;
    if (!isTruthySpecValue(value)) continue;
    if (selected.some((item) => normalizeSpecKey(item.key) === normalizeSpecKey(key))) continue;
    selected.push({ key, value });
  }

  return selected;
};

const topSpecsFromProduct = (product: Product | null | undefined, limit = 6) => {
  if (!product) return [];
  const ordered = [...(product.specifications || [])].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return ordered
    .map((spec) => {
      const label = spec.attributeDefinition?.name || spec.specKey || 'Spec';
      const valueRaw = spec.specValue || (spec.valueNumber != null ? String(spec.valueNumber) : '');
      if (!valueRaw) return null;
      const unit = spec.attributeDefinition?.unit ? ` ${spec.attributeDefinition.unit}` : '';
      return { label, value: `${valueRaw}${unit}` };
    })
    .filter((item): item is { label: string; value: string } => Boolean(item))
    .slice(0, limit);
};

const formatVariantPrice = (price: number, fallbackPrice: number) =>
  Number.isFinite(price) && price > 0 ? price : fallbackPrice;

const getOptionStatus = (
  option: PcBuilderOption,
  slot: PcBuilderSlotKey,
  isSelected: boolean,
  optionsData: PcBuilderOptionsData | null
) => {
  if (option.compatibility) {
    if (option.compatibility.status === 'INCOMPATIBLE') {
      return {
        tone: 'muted' as OptionTone,
        label: 'Khong phu hop',
        reason: option.compatibility.reasons?.[0] || 'Khong dat dieu kien tuong thich.',
      };
    }

    if (option.compatibility.status === 'WARNING') {
      return {
        tone: 'warning' as OptionTone,
        label: 'Can luu y',
        reason: option.compatibility.reasons?.[0] || 'Can kiem tra them truoc khi chon.',
      };
    }
  }

  if (isSelected) {
    return { tone: 'selected' as OptionTone, label: 'Đã chọn', reason: 'Linh kiện đang được chọn cho slot này.' };
  }

  if (option.stockQuantity <= 0) {
    return { tone: 'muted' as OptionTone, label: 'Hết hàng', reason: 'Sản phẩm hiện không còn tồn kho.' };
  }

  if (slot === 'psu') {
    const wattValue = findSpecValueByCandidates(option.keySpecs || {}, ['watt', 'power', 'psu_watt']);
    const watt = toNumber(wattValue);
    if (watt != null && optionsData?.recommendedPsuWatt && watt < optionsData.recommendedPsuWatt) {
      return {
        tone: 'warning' as OptionTone,
        label: 'Cần lưu ý',
        reason: `PSU ${watt}W thấp hơn mức khuyến nghị ${optionsData.recommendedPsuWatt}W.`,
      };
    }
  }

  return { tone: 'ok' as OptionTone, label: 'Tương thích', reason: 'Đạt bộ lọc tương thích hiện tại.' };
};

export default function PcBuilderPage() {
  const navigate = useNavigate();
  const { user, canAccessAdmin } = useAuth();
  const { addToCart, clearCart } = useCart();
  const [slots, setSlots] = useState<PcBuilderSlot[]>([]);
  const [selection, setSelection] = useState<PcBuilderSelection>(EMPTY_SELECTION);
  const [summary, setSummary] = useState<PcBuilderSummaryData | null>(null);
  const [activeSlot, setActiveSlot] = useState<PcBuilderSlotKey>('cpu');
  const [optionsCache, setOptionsCache] = useState<Record<string, PcBuilderOptionsData>>({});
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [localMsg, setLocalMsg] = useState('');
  const [continueMsg, setContinueMsg] = useState('');
  const [continuing, setContinuing] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState<number | null>(null);
  const [productDetailCache, setProductDetailCache] = useState<Record<number, Product>>({});
  const [loadingProductDetailId, setLoadingProductDetailId] = useState<number | null>(null);
  const [productDetailError, setProductDetailError] = useState('');
  const [slotQuantities, setSlotQuantities] = useState<Record<PcBuilderSlotKey, number>>(DEFAULT_SLOT_QUANTITIES);
  const [selectedVariantBySlot, setSelectedVariantBySlot] = useState<
    Partial<Record<PcBuilderSlotKey, { variantId: number | null; label: string; price: number }>>
  >({});
  const [variantPicker, setVariantPicker] = useState<{
    slot: PcBuilderSlotKey;
    option: PcBuilderOption;
    variants: PcBuilderAvailableVariant[];
  } | null>(null);

  useEffect(() => {
    const cached = parseSelectionFromStorage(localStorage.getItem(STORAGE_KEY));
    if (cached) {
      setSelection(cached);
    }
  }, []);

  useEffect(() => {
    setLoadingSlots(true);
    setSlotsError('');

    pcBuilderApi
      .getSlots()
      .then((res) => {
        const apiSlots = res.data.data || [];
        const ordered = SLOT_ORDER.map((key) => {
          const found = apiSlots.find((slot) => slot.key === key);
          return found || { key, label: FALLBACK_SLOT_LABELS[key], productCount: 0 };
        });
        setSlots(ordered);
      })
      .catch((err) => {
        setSlotsError(getApiErrorMessage(err, 'Không tải được danh sách linh kiện.'));
      })
      .finally(() => setLoadingSlots(false));
  }, []);

  const builderSelectionPayload = useMemo<PcBuilderSelectionPayload>(() => {
    const makeItem = (slot: Exclude<PcBuilderSlotKey, 'ram'>) => {
      const productId = selection[SLOT_TO_ID_KEY[slot]];
      if (!productId) return null;
      return {
        productId,
        variantId: selectedVariantBySlot[slot]?.variantId ?? null,
        quantity: slotQuantities[slot] || 1,
      };
    };

    const ramSelections = selection.ramId
      ? [
          {
            productId: selection.ramId,
            variantId: selectedVariantBySlot.ram?.variantId ?? null,
            quantity: slotQuantities.ram || 1,
          },
        ]
      : [];

    return {
      cpu: makeItem('cpu'),
      mainboard: makeItem('mainboard'),
      gpu: makeItem('gpu'),
      storage: makeItem('storage'),
      psu: makeItem('psu'),
      case: makeItem('case'),
      cooling: makeItem('cooling'),
      ramSelections,
    };
  }, [selection, selectedVariantBySlot, slotQuantities]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadingSummary(true);
      setSummaryError('');

      pcBuilderApi
        .getSummary(builderSelectionPayload)
        .then((res) => setSummary(res.data.data))
        .catch((err) => {
          setSummaryError(getApiErrorMessage(err, 'Không tải được tổng quan cấu hình.'));
          setSummary(null);
        })
        .finally(() => setLoadingSummary(false));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [builderSelectionPayload]);

  useEffect(() => {
    const request: PcBuilderOptionsRequest = { slot: activeSlot, selection: builderSelectionPayload };
    const key = `${activeSlot}|${JSON.stringify(request.selection)}`;
    if (optionsCache[key]) {
      setOptionsError('');
      return;
    }

    setLoadingOptions(true);
    setOptionsError('');

    pcBuilderApi
      .getOptions(request)
      .then((res) => {
        const data = res.data.data;
        setOptionsCache((prev) => ({ ...prev, [key]: data }));
      })
      .catch((err) => {
        setOptionsError(getApiErrorMessage(err, 'Không tải được danh sách lựa chọn.'));
      })
      .finally(() => setLoadingOptions(false));
  }, [activeSlot, builderSelectionPayload, optionsCache]);

  const currentOptionsData = useMemo(
    () => optionsCache[`${activeSlot}|${JSON.stringify(builderSelectionPayload)}`] || null,
    [activeSlot, builderSelectionPayload, optionsCache]
  );

  const selectedPartNameMap = useMemo(() => {
    const map: Partial<Record<PcBuilderSlotKey, string>> = {};
    for (const part of summary?.selectedParts || []) {
      const slot = normalizeSlotKey(part.slotKey || part.slot);
      if (!slot) continue;
      map[slot] = part.name;
    }
    return map;
  }, [summary]);

  const selectedPartMap = useMemo(() => {
    const map: Partial<Record<PcBuilderSlotKey, { productId: number; name: string; price: number }>> = {};
    for (const part of summary?.selectedParts || []) {
      const slot = normalizeSlotKey(part.slotKey || part.slot);
      if (!slot) continue;
      map[slot] = { productId: part.productId, name: part.name, price: part.price };
    }
    return map;
  }, [summary]);

  const selectedProductIds = useMemo(() => {
    return Array.from(new Set((summary?.selectedParts || []).map((part) => part.productId).filter((id) => Number.isFinite(id))));
  }, [summary]);

  const hasBlockingError = useMemo(
    () => Boolean(!summary?.compatible && summary?.warnings?.some((warning) => warning.severity === 'ERROR')),
    [summary]
  );

  const blockingWarnings = useMemo(
    () => (summary?.warnings || []).filter((warning) => warning.severity === 'ERROR'),
    [summary]
  );

  const continueDisabledReason = useMemo(() => {
    if (continuing) return 'Đang xử lý cấu hình để chuyển sang checkout...';
    if (loadingSummary) return 'Đang cập nhật summary, vui lòng chờ giây lát.';
    if (!summary) return 'Chưa có summary để xác nhận cấu hình.';
    if (hasBlockingError) return 'Cấu hình vẫn còn cảnh báo ERROR từ backend.';
    return null;
  }, [continuing, hasBlockingError, loadingSummary, summary]);

  const continueDisabled = Boolean(continueDisabledReason);

  useEffect(() => {
    const missingIds = selectedProductIds.filter((id) => !productDetailCache[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;

    Promise.all(
      missingIds.map(async (productId) => {
        try {
          const res = await productApi.getById(productId);
          return res.data.data;
        } catch {
          return null;
        }
      })
    ).then((products) => {
      if (cancelled) return;
      const next: Record<number, Product> = {};
      for (const item of products) {
        if (item) next[item.id] = item;
      }
      if (Object.keys(next).length > 0) {
        setProductDetailCache((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [productDetailCache, selectedProductIds]);

  const loadProductDetail = async (productId: number) => {
    if (productDetailCache[productId]) {
      return productDetailCache[productId];
    }

    try {
      setLoadingProductDetailId(productId);
      setProductDetailError('');
      const res = await productApi.getById(productId);
      const data = res.data.data;
      if (!data) {
        throw new Error('Thiếu dữ liệu sản phẩm.');
      }
      setProductDetailCache((prev) => ({ ...prev, [data.id]: data }));
      return data;
    } catch (err) {
      setProductDetailError(getApiErrorMessage(err, 'Không tải được chi tiết sản phẩm.'));
      return null;
    } finally {
      setLoadingProductDetailId((prev) => (prev === productId ? null : prev));
    }
  };

  const openQuickView = (productId: number) => {
    setQuickViewProductId(productId);
    void loadProductDetail(productId);
  };

  const closeQuickView = () => {
    setQuickViewProductId(null);
    setProductDetailError('');
  };

  const quickViewProduct = quickViewProductId != null ? productDetailCache[quickViewProductId] || null : null;

  const applySelection = (slot: PcBuilderSlotKey, productId: number | null) => {
    setSelection((prev) => {
      const next: PcBuilderSelection = { ...prev, [SLOT_TO_ID_KEY[slot]]: productId };

      if (slot === 'cpu') {
        next.mainboardId = null;
        next.ramId = null;
      }

      if (slot === 'mainboard') {
        next.ramId = null;
      }

      return next;
    });

    setSelectedVariantBySlot((prev) => {
      const next = { ...prev };
      if (productId == null) {
        delete next[slot];
      }

      if (slot === 'cpu') {
        delete next.mainboard;
        delete next.ram;
      }

      if (slot === 'mainboard') {
        delete next.ram;
      }

      return next;
    });

    setSlotQuantities((prev) => {
      const next = { ...prev };
      if (productId == null) {
        next[slot] = 1;
      }

      if (slot === 'cpu') {
        next.mainboard = 1;
        next.ram = 1;
      }

      if (slot === 'mainboard') {
        next.ram = 1;
      }

      return next;
    });

    setLocalMsg('');
    setContinueMsg('');
  };

  const handleChooseOption = (slot: PcBuilderSlotKey, option: PcBuilderOption, isSelected: boolean) => {
    if (isSelected) {
      applySelection(slot, null);
      return;
    }

    const variants = option.availableVariants || [];
    if (!option.hasVariants || variants.length === 0) {
      applySelection(slot, option.productId);
      setSelectedVariantBySlot((prev) => {
        const next = { ...prev };
        delete next[slot];
        return next;
      });
      return;
    }

    setVariantPicker({ slot, option, variants });
  };

  const saveLocalBuild = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    setLocalMsg('Đã lưu cấu hình vào trình duyệt.');
  };

  const loadLocalBuild = () => {
    const parsed = parseSelectionFromStorage(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      setLocalMsg('Chưa có cấu hình đã lưu để tải lại.');
      return;
    }

    setSelection(parsed);
    setLocalMsg('Đã tải lại cấu hình từ trình duyệt.');
  };

  const resetBuild = () => {
    setSelection(EMPTY_SELECTION);
    setSlotQuantities(DEFAULT_SLOT_QUANTITIES);
    setSelectedVariantBySlot({});
    setLocalMsg('Đã reset cấu hình.');
    setContinueMsg('');
    closeQuickView();
    setVariantPicker(null);
  };

  const selectionForSlot = (slot: PcBuilderSlotKey) => selection[SLOT_TO_ID_KEY[slot]];

  const warningText = (warning: PcBuilderWarning) => WARNING_CODE_MESSAGES[warning.code] || warning.message;

  const handleContinue = async () => {
    if (continueDisabled) {
      setContinueMsg(continueDisabledReason || 'Chưa thể tiếp tục ở thời điểm hiện tại.');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (canAccessAdmin) {
      setContinueMsg('Tài khoản quản trị không hỗ trợ checkout theo flow khách hàng. Vui lòng đăng nhập bằng tài khoản USER.');
      return;
    }

    try {
      setContinuing(true);
      setContinueMsg('Đang thêm cấu hình vào giỏ hàng...');

      const previewRes = await pcBuilderApi.getCheckoutPreview(builderSelectionPayload);
      const previewItems = previewRes.data.data || [];
      if (previewItems.length === 0) {
        setContinueMsg('Không tìm thấy linh kiện đã chọn để đưa vào giỏ hàng.');
        return;
      }

      await clearCart();
      for (const item of previewItems) {
        await addToCart(item.productId, item.quantity, item.variantId ?? undefined);
      }

      setContinueMsg('Đã thêm build vào giỏ hàng. Đang chuyển sang trang checkout...');
      navigate('/checkout');
    } catch (err) {
      setContinueMsg(getApiErrorMessage(err, 'Không thể chuyển build sang giỏ hàng. Vui lòng thử lại.'));
    } finally {
      setContinuing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-indigo-600 font-semibold">PC Builder System</p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Build PC theo tương thích realtime</h1>
            <p className="text-sm text-slate-600 mt-2">
              Chọn linh kiện theo từng slot, hệ thống sẽ tự lọc phần còn lại và cảnh báo xung đột.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveLocalBuild}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Lưu build
            </button>
            <button
              onClick={loadLocalBuild}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> Tải build
            </button>
            <button
              onClick={resetBuild}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        {localMsg && <p className="mt-3 text-sm text-emerald-700">{localMsg}</p>}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Các slot linh kiện</h2>
            </div>

            {loadingSlots && (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang tải slots...
              </div>
            )}

            {slotsError && (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{slotsError}</p>
            )}

            {!loadingSlots && !slotsError && (
              <div className="space-y-2">
                {slots.map((slot, index) => {
                  const chosenId = selectionForSlot(slot.key);
                  const chosenName = selectedPartNameMap[slot.key];
                  const selectedPart = selectedPartMap[slot.key];
                  const selectedProduct = selectedPart ? productDetailCache[selectedPart.productId] : null;
                  const imageUrl = getProductImage(selectedProduct);
                  const selectedSpecs = topSpecsFromProduct(selectedProduct, 3);
                  const isActive = activeSlot === slot.key;

                  return (
                    <button
                      key={slot.key}
                      onClick={() => setActiveSlot(slot.key)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                        isActive
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">Bước {index + 1}</p>
                          <p className="text-sm font-semibold text-slate-800">{slot.label || FALLBACK_SLOT_LABELS[slot.key]}</p>
                          <p className="text-xs text-slate-500 mt-1">{chosenId ? chosenName || `Đã chọn #${chosenId}` : 'Chưa chọn linh kiện'}</p>
                          {selectedPart && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="w-11 h-11 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                  {imageUrl ? (
                                    <img src={imageUrl} alt={selectedPart.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No img</div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{selectedPart.name}</p>
                                  <p className="text-[11px] text-slate-600 mt-0.5">{formatCurrency(selectedPart.price)}</p>
                                </div>
                              </div>
                              {selectedSpecs.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {selectedSpecs.map((spec) => (
                                    <span key={`${slot.key}-${spec.label}`} className="text-[10px] bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                                      {spec.label}: {spec.value}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openQuickView(selectedPart.productId);
                                  }}
                                  className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  Xem nhanh
                                </button>
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(getProductDetailPath({ id: selectedPart.productId, name: selectedPart.name }));
                                  }}
                                  className="text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  Chi tiết
                                </button>
                              </div>
                              {selectedVariantBySlot[slot.key] && (
                                <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1">
                                  Biến thể: {selectedVariantBySlot[slot.key]?.label}
                                </p>
                              )}
                              {slot.key === 'ram' && selectedPart && (
                                <p className="text-[11px] text-slate-600">
                                  Số lượng RAM: <span className="font-semibold">{slotQuantities.ram}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-1">
                          {slot.productCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Tổng quan build</h3>

            {loadingSummary ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Đang cập nhật summary...
              </div>
            ) : summaryError ? (
              <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{summaryError}</p>
            ) : summary ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <p className="text-xs text-slate-500">Tổng giá</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(summary.totalPrice)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <p className="text-xs text-slate-500">Điện tiêu thụ</p>
                    <p className="font-semibold text-slate-900">{formatWatt(summary.estimatedPower)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 col-span-2">
                    <p className="text-xs text-slate-500">PSU đề xuất</p>
                    <p className="font-semibold text-slate-900">{formatWatt(summary.recommendedPsuWatt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium">
                  {summary.compatible ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Cấu hình đang tương thích</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-700">Cần xử lý cảnh báo tương thích</span>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {(summary.warnings || []).length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có cảnh báo.</p>
                  ) : (
                    summary.warnings.map((warning) => (
                      <div
                        key={`${warning.code}-${warning.message}`}
                        className={`rounded-lg border px-3 py-2 text-sm ${severityClasses[warning.severity]}`}
                      >
                        <p className="font-semibold">{warning.severity}</p>
                        <p>{warningText(warning)}</p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  disabled={continueDisabled}
                  onClick={handleContinue}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {continuing ? 'Đang xử lý...' : continueDisabled ? 'Chưa thể tiếp tục' : 'Tiếp tục sang checkout'}
                </button>
                {continueDisabledReason && (
                  <p className="text-xs text-slate-500">{continueDisabledReason}</p>
                )}
                {continueMsg && (
                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">{continueMsg}</p>
                )}
                {hasBlockingError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    <p className="font-semibold mb-1">Lý do đang bị chặn:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {blockingWarnings.map((warning) => (
                        <li key={`${warning.code}-block`}>{warningText(warning)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Chưa có dữ liệu summary.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Slot đang chọn</p>
              <h2 className="text-lg font-semibold text-slate-900">
                {slots.find((slot) => slot.key === activeSlot)?.label || FALLBACK_SLOT_LABELS[activeSlot]}
              </h2>
            </div>
            {selectionForSlot(activeSlot) && (
              <button
                onClick={() => applySelection(activeSlot, null)}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Bỏ chọn slot này
              </button>
            )}
          </div>

          {activeSlot === 'ram' && selectionForSlot('ram') && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">RAM quantity</p>
                <p className="text-sm font-medium text-slate-800">Số thanh RAM cho cấu hình</p>
              </div>
              <div className="inline-flex items-center gap-2">
                <button
                  onClick={() => setSlotQuantities((prev) => ({ ...prev, ram: Math.max(1, prev.ram - 1) }))}
                  className="w-8 h-8 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-semibold text-slate-800">{slotQuantities.ram}</span>
                <button
                  onClick={() => setSlotQuantities((prev) => ({ ...prev, ram: Math.min(4, prev.ram + 1) }))}
                  className="w-8 h-8 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <HardDrive className="w-4 h-4" />
              <span>
                Estimated Power: <strong>{formatWatt(currentOptionsData?.estimatedPower || 0)}</strong>
              </span>
              <span className="text-slate-400">|</span>
              <span>
                Recommended PSU: <strong>{formatWatt(currentOptionsData?.recommendedPsuWatt || 0)}</strong>
              </span>
            </div>
            {(currentOptionsData?.appliedFilters && Object.keys(currentOptionsData.appliedFilters).length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(currentOptionsData.appliedFilters).map(([key, value]) => (
                  <span key={key} className="text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600">
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {loadingOptions ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-10">
              <Loader2 className="w-4 h-4 animate-spin" /> Đang tải options...
            </div>
          ) : optionsError ? (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>{optionsError}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">Sản phẩm</th>
                    <th className="text-left px-3 py-2 font-semibold">Giá</th>
                    <th className="text-left px-3 py-2 font-semibold">Kho</th>
                    <th className="text-left px-3 py-2 font-semibold">Specs</th>
                    <th className="text-right px-3 py-2 font-semibold">Chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentOptionsData?.options || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Không có sản phẩm phù hợp với điều kiện hiện tại.
                      </td>
                    </tr>
                  ) : (
                    (currentOptionsData?.options || []).map((option: PcBuilderOption) => {
                      const isSelected = selectionForSlot(activeSlot) === option.productId;
                      const optionStatus = getOptionStatus(option, activeSlot, isSelected, currentOptionsData);
                      const topSpecs = topSpecsFromOption(option, activeSlot, 4);
                      return (
                        <tr key={option.productId} className="border-t border-slate-100">
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-800">{option.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {(option.brandName || 'N/A')} • {(option.categoryName || 'N/A')}
                            </p>
                            <div className="mt-1.5">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${optionToneClass[optionStatus.tone]}`}>
                                {optionStatus.label}
                              </span>
                              <p className="text-[11px] text-slate-500 mt-1">{optionStatus.reason}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(option.price)}</td>
                          <td className="px-3 py-3 text-slate-600">{option.stockQuantity}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {topSpecs.map(({ key, value }) => (
                                <span key={key} className="text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-1">
                                  {toReadableSpecLabel(key)}: {String(value)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex flex-col items-stretch gap-2 w-[118px]">
                              <button
                                onClick={() => openQuickView(option.productId)}
                                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> Xem nhanh
                              </button>
                              <button
                                onClick={() => {
                                  handleChooseOption(activeSlot, option, isSelected);
                                }}
                                className={`inline-flex h-9 w-full items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {isSelected ? 'Đã chọn' : 'Chọn'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {quickViewProductId != null && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/45" onClick={closeQuickView} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:top-6 sm:bottom-6 sm:w-[32rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Quick View</p>
                <p className="text-sm font-semibold text-slate-900">Chi tiết linh kiện</p>
              </div>
              <button
                onClick={closeQuickView}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Đóng xem nhanh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingProductDetailId === quickViewProductId && !quickViewProduct ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải chi tiết sản phẩm...
                </div>
              ) : productDetailError && !quickViewProduct ? (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{productDetailError}</p>
              ) : quickViewProduct ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    {getProductImage(quickViewProduct) ? (
                      <img src={getProductImage(quickViewProduct)} alt={quickViewProduct.name} className="w-full h-52 object-cover" />
                    ) : (
                      <div className="w-full h-52 flex items-center justify-center text-sm text-slate-400">Khong co hinh anh</div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{quickViewProduct.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {(quickViewProduct.brand?.name || 'N/A')} • {(quickViewProduct.category?.name || 'N/A')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-slate-200 p-3 bg-white">
                      <p className="text-xs text-slate-500">Giá</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(quickViewProduct.price)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3 bg-white">
                      <p className="text-xs text-slate-500">Tồn kho</p>
                      <p className="font-semibold text-slate-900">{quickViewProduct.stockQuantity}</p>
                    </div>
                  </div>

                  {quickViewProduct.description && (
                    <div className="rounded-lg border border-slate-200 p-3 bg-white">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.08em]">Mô tả</p>
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{quickViewProduct.description}</p>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.08em] mb-2">Thông số chính</p>
                    {topSpecsFromProduct(quickViewProduct, 12).length === 0 ? (
                      <p className="text-sm text-slate-500">Chưa có thông số chi tiết.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {topSpecsFromProduct(quickViewProduct, 12).map((spec) => (
                          <div key={`${quickViewProduct.id}-${spec.label}`} className="flex items-start justify-between gap-3 text-sm">
                            <span className="text-slate-500">{spec.label}</span>
                            <span className="text-slate-800 text-right">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {quickViewProduct && (
              <div className="border-t border-slate-200 p-4 flex flex-wrap justify-end gap-2 bg-white">
                <button
                  onClick={() => {
                    const slotForQuickView = activeSlot;
                    applySelection(slotForQuickView, quickViewProduct.id);
                    closeQuickView();
                  }}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Chọn linh kiện này
                </button>
                <button
                  onClick={() => navigate(getProductDetailPath({ id: quickViewProduct.id, name: quickViewProduct.name }))}
                  className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Xem trang chi tiết
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {variantPicker && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setVariantPicker(null)} />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[44rem] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Variant picker</p>
                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{variantPicker.option.name}</p>
              </div>
              <button
                onClick={() => setVariantPicker(null)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Đóng chọn biến thể"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2">
              {variantPicker.variants.length === 0 ? (
                <p className="text-sm text-slate-500">Sản phẩm này chưa có biến thể khả dụng.</p>
              ) : (
                variantPicker.variants.map((variant) => {
                  const label = variant.label || (variant.variantId == null ? 'San pham mac dinh' : `Variant #${variant.variantId}`);
                  const displayPrice = formatVariantPrice(variant.price, variantPicker.option.price);
                  return (
                    <button
                      key={`${variantPicker.option.productId}-${variant.variantId == null ? 'parent' : variant.variantId}`}
                      onClick={() => {
                        setSelectedVariantBySlot((prev) => ({
                          ...prev,
                          [variantPicker.slot]: {
                            variantId: variant.variantId,
                            label,
                            price: displayPrice,
                          },
                        }));
                        applySelection(variantPicker.slot, variantPicker.option.productId);
                        setVariantPicker(null);
                      }}
                      className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Giá: {formatCurrency(displayPrice)} • Kho: {variant.stockQuantity}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}