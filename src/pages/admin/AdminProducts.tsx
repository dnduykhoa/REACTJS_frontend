import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, productVariantApi, categoryApi } from '../../api/j2ee';
import type { Product, ProductStatus, ProductVariant, ProductVariantRequest, Category } from '../../api/j2ee/types';
import { ChevronDown, ChevronRight, Package, Plus, Search, Pencil, Trash2, RotateCcw, PackageX } from 'lucide-react';
import Pagination from '../../components/Pagination';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';
const PAGE_SIZE = 15;

type StatusTab = 'all' | 'active' | 'inactive' | 'out_of_stock';

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'inactive', label: 'Ngưng bán' },
  { key: 'out_of_stock', label: 'Hết hàng' },
];

function matchesTab(status: ProductStatus, tab: StatusTab) {
  if (tab === 'all') return true;
  if (tab === 'active') return status === 'ACTIVE';
  if (tab === 'inactive') return status === 'INACTIVE';
  return status === 'OUT_OF_STOCK';
}

function resolveUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function getPrimaryImage(product: Product) {
  const media = product.media?.find((item) => item.isPrimary) || product.media?.[0];
  return media ? resolveUrl(media.mediaUrl) : null;
}

function getVariantImage(product: Product, variant: ProductVariant) {
  const media = variant.media?.find((item) => item.isPrimary) || variant.media?.[0] || product.media?.find((item) => item.isPrimary) || product.media?.[0];
  return media ? resolveUrl(media.mediaUrl) : null;
}

function getProductStatus(product: Product): ProductStatus {
  return product.status ?? (product.isActive ? 'ACTIVE' : 'INACTIVE');
}

function getVariantStatus(variant: ProductVariant): ProductStatus {
  if (!variant.isActive) return 'INACTIVE';
  if (variant.stockQuantity <= 0) return 'OUT_OF_STOCK';
  return 'ACTIVE';
}

function buildVariantDetail(variant: ProductVariant) {
  const parts = (variant.values || [])
    .map((value) => {
      const label = value.attributeDefinition?.name || value.attrKey;
      const content = value.attrValue ?? (value.valueNumber != null ? String(value.valueNumber) : '');
      return label && content ? `${label}: ${content}` : null;
    })
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(' • ') : 'Không có thuộc tính biến thể';
}

function buildVariantUpdatePayload(
  variant: ProductVariant,
  patch: Partial<Pick<ProductVariant, 'price' | 'stockQuantity' | 'isActive' | 'displayOrder' | 'sku'>>
): ProductVariantRequest {
  return {
    sku: patch.sku ?? variant.sku,
    price: patch.price ?? variant.price,
    stockQuantity: patch.stockQuantity ?? variant.stockQuantity,
    isActive: patch.isActive ?? variant.isActive,
    displayOrder: patch.displayOrder ?? variant.displayOrder,
    values: (variant.values || []).map((value) => ({
      attrDefId: value.attributeDefinition?.id,
      attrKey: value.attrKey,
      attrValue: value.attrValue ?? undefined,
      valueNumber: value.valueNumber ?? undefined,
      displayOrder: value.displayOrder,
    })),
  };
}

// Trả về set tất cả ID danh mục con/cháu của selectedId (bao gồm chính nó)
// Dùng flat list + BFS để xử lý đúng mọi số cấp độ
function getDescendantCategoryIds(categories: Category[], selectedId: number): Set<number> {
  const parentIdMap = new Map<number, number | null>(
    categories.map((cat) => [cat.id, cat.parent?.id ?? null])
  );
  const result = new Set<number>([selectedId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [id, parentId] of parentIdMap) {
      if (!result.has(id) && parentId != null && result.has(parentId)) {
        result.add(id);
        changed = true;
      }
    }
  }
  return result;
}

// Trả về danh sách option đã sắp xếp theo cây (cha → con) với thông tin depth để thụt lề
function buildCategoryOptions(categories: Category[]): { id: number; label: string }[] {
  const parentIdMap = new Map<number, number | null>(
    categories.map((cat) => [cat.id, cat.parent?.id ?? null])
  );
  const childrenMap = new Map<number | null, Category[]>();
  for (const cat of categories) {
    const pid = cat.parent?.id ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(cat);
  }
  // Sắp xếp theo displayOrder trong mỗi nhóm
  for (const group of childrenMap.values()) {
    group.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const result: { id: number; label: string }[] = [];
  function walk(parentId: number | null, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    for (const cat of children) {
      const prefix = depth === 0 ? '' : '—'.repeat(depth) + ' ';
      result.push({ id: cat.id, label: `${prefix}${cat.name}` });
      if (childrenMap.has(cat.id)) walk(cat.id, depth + 1);
    }
  }
  // Bắt đầu từ root (parent === null), sau đó thêm các category mồ côi nếu có
  walk(null, 0);
  const addedIds = new Set(result.map((r) => r.id));
  for (const [id] of parentIdMap) {
    if (!addedIds.has(id)) {
      const cat = categories.find((c) => c.id === id)!;
      result.push({ id, label: cat.name });
    }
  }
  return result;
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const cfg: Record<ProductStatus, { cls: string; label: string }> = {
    ACTIVE: { cls: 'bg-emerald-100 text-emerald-700', label: 'Đang bán' },
    INACTIVE: { cls: 'bg-slate-100 text-slate-500', label: 'Ngưng bán' },
    OUT_OF_STOCK: { cls: 'bg-amber-100 text-amber-700', label: 'Hết hàng' },
  };
  const { cls, label } = cfg[status];
  return <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${cls}`}>{label}</span>;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsByProduct, setVariantsByProduct] = useState<Record<number, ProductVariant[]>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | 'all'>('all');

  const hydrateVariants = async (items: Product[]) => {
    const variantEntries = await Promise.all(
      items.map(async (product) => {
        try {
          const res = await productVariantApi.getByProduct(product.id);
          return [product.id, res.data.data] as const;
        } catch {
          return [product.id, []] as const;
        }
      })
    );

    setVariantsByProduct(Object.fromEntries(variantEntries) as Record<number, ProductVariant[]>);
    setExpandedRows(
      Object.fromEntries(
        variantEntries
          .filter(([, variants]) => variants.length > 0)
          .map(([productId]) => [productId, true])
      )
    );
  };

  const loadProducts = async (query = '') => {
    setLoading(true);
    setPage(1);
    const request = query.trim() ? productApi.search(query.trim()) : productApi.getAll();

    try {
      const productRes = await request;
      const items = productRes.data.data;
      setProducts(items);
      await hydrateVariants(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(search);
  }, [tab]);

  useEffect(() => {
    categoryApi.getAll().then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  const visibleVariantsByProduct = useMemo(() => {
    return Object.fromEntries(
      products.map((product) => {
        const variants = variantsByProduct[product.id] || [];
        const visibleVariants = variants.filter((variant) => matchesTab(getVariantStatus(variant), tab));
        return [product.id, tab === 'all' ? variants : visibleVariants];
      })
    ) as Record<number, ProductVariant[]>;
  }, [products, tab, variantsByProduct]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (tab !== 'all') {
      result = result.filter((product) => {
        const productMatches = matchesTab(getProductStatus(product), tab);
        const variantMatches = (visibleVariantsByProduct[product.id] || []).length > 0;
        return productMatches || variantMatches;
      });
    }
    if (categoryId !== 'all') {
      const catSet = getDescendantCategoryIds(categories, categoryId as number);
      result = result.filter((p) => p.category?.id != null && catSet.has(p.category.id));
    }
    return result;
  }, [products, tab, visibleVariantsByProduct, categoryId, categories]);

  const totalVariantCount = useMemo(
    () => Object.values(visibleVariantsByProduct).reduce((sum, variants) => sum + variants.length, 0),
    [visibleVariantsByProduct]
  );

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  const handleTabChange = (nextTab: StatusTab) => {
    setSearch('');
    setTab(nextTab);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryId(value === 'all' ? 'all' : Number(value));
    setPage(1);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadProducts(search);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ngưng bán sản phẩm này? Sản phẩm sẽ chuyển sang trạng thái Ngưng bán.')) return;
    setActionId(`product-${id}`);
    try {
      await productApi.delete(id);
      await loadProducts(search);
    } catch {
      alert('Thao tác thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleRestore = async (id: number) => {
    setActionId(`product-${id}`);
    try {
      await productApi.restore(id);
      await loadProducts(search);
    } catch {
      alert('Khôi phục thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleOutOfStock = async (id: number) => {
    if (!confirm('Đánh dấu sản phẩm này là hết hàng?')) return;
    setActionId(`product-${id}`);
    try {
      await productApi.outOfStock(id);
      await loadProducts(search);
    } catch {
      alert('Thao tác thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleVariantUpdate = async (
    productId: number,
    variant: ProductVariant,
    patch: Partial<Pick<ProductVariant, 'price' | 'stockQuantity' | 'isActive' | 'displayOrder' | 'sku'>>
  ) => {
    setActionId(`variant-${variant.id}`);
    try {
      await productVariantApi.update(productId, variant.id, buildVariantUpdatePayload(variant, patch));
      await loadProducts(search);
    } catch {
      alert('Thao tác với biến thể thất bại');
    } finally {
      setActionId(null);
    }
  };

  const toggleExpanded = (productId: number) => {
    setExpandedRows((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filteredProducts.length} sản phẩm • {totalVariantCount} biến thể</p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm sản phẩm
        </Link>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => handleTabChange(item.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === item.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition min-w-[160px]"
        >
          <option value="all">Tất cả danh mục</option>
          {categoryOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Tìm</button>
        <button type="button" onClick={() => { setSearch(''); setCategoryId('all'); loadProducts(''); }} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 border border-slate-200 transition">Xóa lọc</button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">Ảnh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên / Biến thể</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thương hiệu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Kho</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Không có sản phẩm</p>
                  </td>
                </tr>
              )}

              {pagedProducts.map((product, index) => {
                const img = getPrimaryImage(product);
                const status = getProductStatus(product);
                const variants = visibleVariantsByProduct[product.id] || [];
                const productMatchesCurrentTab = matchesTab(status, tab);
                const busy = actionId === `product-${product.id}`;
                const expanded = expandedRows[product.id];

                return (
                  <Fragment key={product.id}>
                    {productMatchesCurrentTab && (
                      <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors align-top">
                        <td className="px-4 py-3 text-slate-400 tabular-nums">{(page - 1) * PAGE_SIZE + index + 1}</td>
                        <td className="px-4 py-3">
                          {img ? (
                            <img src={img} alt="" className="w-10 h-10 object-cover rounded-xl" />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                              <Package size={16} className="text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <div className="flex items-start gap-2">
                            {variants.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(product.id)}
                                className="mt-0.5 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                aria-label={expanded ? 'Thu gọn biến thể' : 'Mở rộng biến thể'}
                              >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <span className="w-6" />
                            )}
                            <div className="min-w-0">
                              <span className="line-clamp-1 font-medium text-slate-800 block">{product.name}</span>
                              {variants.length > 0 && <span className="text-xs text-slate-400 mt-0.5 block">{variants.length} biến thể</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{product.category?.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{product.brand?.name || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-indigo-600">{Number(product.price).toLocaleString('vi-VN')}₫</td>
                        <td className="px-4 py-3 text-center text-slate-600">{product.stockQuantity}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Chỉnh sửa sản phẩm"
                            >
                              <Pencil size={14} />
                            </Link>
                            {status === 'ACTIVE' && (
                              <button
                                onClick={() => handleOutOfStock(product.id)}
                                disabled={busy}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                title="Đánh dấu hết hàng"
                              >
                                <PackageX size={14} />
                              </button>
                            )}
                            {(status === 'INACTIVE' || status === 'OUT_OF_STOCK') && (
                              <button
                                onClick={() => handleRestore(product.id)}
                                disabled={busy}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                title="Khôi phục (Đang bán)"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            {status !== 'INACTIVE' && (
                              <button
                                onClick={() => handleDelete(product.id)}
                                disabled={busy}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                title="Ngưng bán"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {(productMatchesCurrentTab ? expanded : true) && variants.map((variant) => {
                      const variantImg = getVariantImage(product, variant);
                      const variantStatus = getVariantStatus(variant);
                      const variantBusy = actionId === `variant-${variant.id}`;
                      return (
                        <tr key={`${product.id}-${variant.id}`} className="border-t border-slate-100 bg-slate-50/60 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-300">{productMatchesCurrentTab ? '↳' : (page - 1) * PAGE_SIZE + index + 1}</td>
                          <td className="px-4 py-3">
                            {variantImg ? (
                              <img src={variantImg} alt="" className="w-10 h-10 object-cover rounded-xl border border-slate-200" />
                            ) : (
                              <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center">
                                <Package size={16} className="text-slate-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-sm">
                            <div className={productMatchesCurrentTab ? 'pl-8' : ''}>
                              <span className="line-clamp-1 font-medium text-slate-800 block">{product.name} • {variant.sku}</span>
                              <span className="text-xs text-slate-400 block mt-0.5">{buildVariantDetail(variant)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{product.category?.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{product.brand?.name || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-indigo-600">{Number(variant.price).toLocaleString('vi-VN')}₫</td>
                          <td className="px-4 py-3 text-center text-slate-600">{variant.stockQuantity}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={variantStatus} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                to={`/admin/products/${product.id}/variants/${variant.id}/edit`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Chỉnh sửa biến thể"
                              >
                                <Pencil size={14} />
                              </Link>
                              {variantStatus === 'ACTIVE' && (
                                <button
                                  onClick={() => {
                                    if (!confirm('Đánh dấu biến thể này là hết hàng?')) return;
                                    handleVariantUpdate(product.id, variant, { stockQuantity: 0, isActive: true });
                                  }}
                                  disabled={variantBusy}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                  title="Đánh dấu biến thể hết hàng"
                                >
                                  <PackageX size={14} />
                                </button>
                              )}
                              {(variantStatus === 'INACTIVE' || variantStatus === 'OUT_OF_STOCK') && (
                                <button
                                  onClick={() => handleVariantUpdate(product.id, variant, { isActive: true, stockQuantity: Math.max(variant.stockQuantity, 1) })}
                                  disabled={variantBusy}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                                  title="Khôi phục biến thể"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              {variantStatus !== 'INACTIVE' && (
                                <button
                                  onClick={() => {
                                    if (!confirm('Ngưng bán biến thể này?')) return;
                                    handleVariantUpdate(product.id, variant, { isActive: false });
                                  }}
                                  disabled={variantBusy}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                                  title="Ngưng bán biến thể"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} pageCount={Math.ceil(filteredProducts.length / PAGE_SIZE)} total={filteredProducts.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
