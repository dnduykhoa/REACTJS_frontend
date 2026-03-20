import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, HardDrive, Loader2, RefreshCcw, Save, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  getApiErrorMessage,
  pcBuilderApi,
  type PcBuilderOption,
  type PcBuilderOptionsData,
  type PcBuilderSelection,
  type PcBuilderSlot,
  type PcBuilderSlotKey,
  type PcBuilderSummaryData,
  type PcBuilderWarning,
} from '../api/j2ee';

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

const cacheKeyFor = (slot: PcBuilderSlotKey, selection: PcBuilderSelection) =>
  `${slot}|${SLOT_ORDER.map((slotKey) => selection[SLOT_TO_ID_KEY[slotKey]] ?? 'x').join('-')}`;

const severityClasses: Record<PcBuilderWarning['severity'], string> = {
  INFO: 'bg-sky-50 border-sky-200 text-sky-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-900',
  ERROR: 'bg-rose-50 border-rose-200 text-rose-800',
};

export default function PcBuilderPage() {
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoadingSummary(true);
      setSummaryError('');

      pcBuilderApi
        .getSummary(selection)
        .then((res) => setSummary(res.data.data))
        .catch((err) => {
          setSummaryError(getApiErrorMessage(err, 'Không tải được tổng quan cấu hình.'));
          setSummary(null);
        })
        .finally(() => setLoadingSummary(false));
    }, 220);

    return () => window.clearTimeout(timer);
  }, [selection]);

  useEffect(() => {
    const key = cacheKeyFor(activeSlot, selection);
    if (optionsCache[key]) {
      setOptionsError('');
      return;
    }

    setLoadingOptions(true);
    setOptionsError('');

    pcBuilderApi
      .getOptions(activeSlot, selection)
      .then((res) => {
        const data = res.data.data;
        setOptionsCache((prev) => ({ ...prev, [key]: data }));
      })
      .catch((err) => {
        setOptionsError(getApiErrorMessage(err, 'Không tải được danh sách lựa chọn.'));
      })
      .finally(() => setLoadingOptions(false));
  }, [activeSlot, selection, optionsCache]);

  const currentOptionsData = useMemo(
    () => optionsCache[cacheKeyFor(activeSlot, selection)] || null,
    [activeSlot, optionsCache, selection]
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

  const hasBlockingError = useMemo(
    () => Boolean(summary?.warnings?.some((warning) => warning.severity === 'ERROR')),
    [summary]
  );

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

    setLocalMsg('');
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
    setLocalMsg('Đã reset cấu hình.');
  };

  const selectionForSlot = (slot: PcBuilderSlotKey) => selection[SLOT_TO_ID_KEY[slot]];

  const warningText = (warning: PcBuilderWarning) => WARNING_CODE_MESSAGES[warning.code] || warning.message;

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
                          <p className="text-xs text-slate-500 mt-1">
                            {chosenId ? chosenName || `Đã chọn #${chosenId}` : 'Chưa chọn linh kiện'}
                          </p>
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
                  disabled={hasBlockingError}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {hasBlockingError ? 'Không thể tiếp tục khi còn ERROR' : 'Build hợp lệ để tiếp tục'}
                </button>
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
                      return (
                        <tr key={option.productId} className="border-t border-slate-100">
                          <td className="px-3 py-3">
                            <p className="font-medium text-slate-800">{option.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {(option.brandName || 'N/A')} • {(option.categoryName || 'N/A')}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(option.price)}</td>
                          <td className="px-3 py-3 text-slate-600">{option.stockQuantity}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(option.keySpecs || {}).slice(0, 4).map(([key, value]) => (
                                <span key={key} className="text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-1">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button
                              onClick={() => applySelection(activeSlot, isSelected ? null : option.productId)}
                              className={`inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                                isSelected
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isSelected ? 'Đã chọn' : 'Chọn'}
                            </button>
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
    </div>
  );
}