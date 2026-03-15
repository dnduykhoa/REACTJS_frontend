import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';

const PRICE_RANGES: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Dưới 500k', min: null, max: 500000 },
  { label: '500k – 1tr', min: 500000, max: 1000000 },
  { label: '1tr – 5tr', min: 1000000, max: 5000000 },
  { label: '5tr – 10tr', min: 5000000, max: 10000000 },
  { label: 'Trên 10tr', min: 10000000, max: null },
];

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [rootCategories, setRootCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState(searchParams.get('name') || '');

  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : null;
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null;
  const subIds = searchParams.getAll('subId').map(Number).filter(Boolean);
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  // Load root categories một lần khi mount
  useEffect(() => {
    categoryApi.getRoot().then((r) => setRootCategories(r.data.data));
  }, []);

  // Load brands theo danh mục đang chọn (hoặc tất cả nếu không chọn)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!categoryId) {
        const r = await brandApi.getActive();
        if (!cancelled) setBrands(r.data.data);
        return;
      }

      // Lấy danh mục con rồi fetch sản phẩm trong toàn bộ cây (cha + con)
      const childRes = await categoryApi.getChildren(categoryId);
      const allIds = [categoryId, ...childRes.data.data.map((c: Category) => c.id)];
      const prodRes = await productApi.filter({ categoryIds: allIds });

      // Trích xuất brand duy nhất có trong các sản phẩm đó
      const seen = new Set<number>();
      const uniqueBrands: Brand[] = [];
      for (const p of prodRes.data.data) {
        if (p.brand && !seen.has(p.brand.id)) {
          seen.add(p.brand.id);
          uniqueBrands.push(p.brand);
        }
      }
      if (!cancelled) setBrands(uniqueBrands);
    };

    run();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Load sản phẩm khi bất kỳ filter nào thay đổi
  useEffect(() => {
    setLoading(true);
    const name = searchParams.get('name') || '';
    const minP = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
    const maxP = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

    const run = async () => {
      let categoryIdsToFilter: number[] | undefined;

      if (subIds.length > 0) {
        // Đã chọn danh mục con cụ thể
        categoryIdsToFilter = subIds;
      } else if (categoryId) {
        // Chọn danh mục cha → lấy cha + tất cả con
        const childRes = await categoryApi.getChildren(categoryId);
        const children: Category[] = childRes.data.data;
        setChildCategories(children);
        categoryIdsToFilter = [categoryId, ...children.map((c) => c.id)];
      } else {
        setChildCategories([]);
      }

      const res = await productApi.filter({
        categoryIds: categoryIdsToFilter,
        brandIds: brandId ? [brandId] : undefined,
        minPrice: minP,
        maxPrice: maxP,
        name: name || undefined,
      });
      setProducts(res.data.data);
    };

    run().finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchName.trim()) {
      p.set('name', searchName.trim());
    } else {
      p.delete('name');
    }
    setSearchParams(p);
  };

  const selectPriceRange = (min: number | null, max: number | null) => {
    const p = new URLSearchParams(searchParams);
    if (min !== null) p.set('minPrice', String(min));
    else p.delete('minPrice');
    if (max !== null) p.set('maxPrice', String(max));
    else p.delete('maxPrice');
    setSearchParams(p);
  };

  // Chọn danh mục cha: reset brand + subId, giữ lại giá
  const selectRootCategory = (id: number | null) => {
    if (id === null) {
      setSearchName('');
      setSearchParams({});
    } else {
      const p = new URLSearchParams({ categoryId: String(id) });
      if (minPrice) p.set('minPrice', String(minPrice));
      if (maxPrice) p.set('maxPrice', String(maxPrice));
      setSearchParams(p);
    }
  };

  // Chọn/bỏ chọn danh mục con (multi-select), giữ brand + giá
  const toggleSubCategory = (id: number) => {
    if (!categoryId) return;
    const next = subIds.includes(id) ? subIds.filter((s) => s !== id) : [...subIds, id];
    const p = new URLSearchParams({ categoryId: String(categoryId) });
    next.forEach((s) => p.append('subId', String(s)));
    if (brandId) p.set('brandId', String(brandId));
    if (minPrice) p.set('minPrice', String(minPrice));
    if (maxPrice) p.set('maxPrice', String(maxPrice));
    setSearchParams(p);
  };

  // Chọn brand: giữ lại category + giá
  const selectBrand = (id: number | null) => {
    const p = new URLSearchParams(searchParams);
    if (id === null) {
      p.delete('brandId');
    } else {
      p.set('brandId', String(id));
    }
    setSearchParams(p);
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchParams({});
  };

  const hasFilter =
    brandId || categoryId || subIds.length > 0 || searchParams.get('name') || minPrice || maxPrice;

  const activePriceRange = PRICE_RANGES.find(r => r.min === minPrice && r.max === maxPrice) ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-7">
      {/* ── Sidebar: chỉ danh mục ── */}
      <aside className="w-44 shrink-0 space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <SlidersHorizontal className="w-4 h-4" /> Danh mục
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
            >
              <X className="w-3 h-3" /> Xóa lọc
            </button>
          )}
        </div>

        {/* Danh mục cha */}
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => selectRootCategory(null)}
              className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                !categoryId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
          </li>
          {rootCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => selectRootCategory(cat.id)}
                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  categoryId === cat.id
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
              {/* Danh mục con nằm ngay dưới danh mục cha được chọn */}
              {categoryId === cat.id && childCategories.length > 0 && (
                <ul className="mt-0.5 ml-3 space-y-0.5 border-l-2 border-indigo-100 pl-2">
                  {childCategories.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => toggleSubCategory(child.id)}
                        className={`text-sm w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                          subIds.includes(child.id)
                            ? 'text-indigo-700 font-semibold'
                            : 'text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            subIds.includes(child.id)
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {subIds.includes(child.id) && (
                            <Check className="w-2 h-2 text-white" strokeWidth={3} />
                          )}
                        </span>
                        {child.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* ── Nội dung chính ── */}
      <div className="flex-1 min-w-0">
        {/* Thanh tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Tìm
          </button>
        </form>

        {/* ── Hàng lọc ngang: Thương hiệu + Tầm giá ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
          {/* Brand chips */}
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Thương hiệu:
            </span>
            <button
              onClick={() => selectBrand(null)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !brandId
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
              }`}
            >
              Tất cả
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => selectBrand(b.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  brandId === b.id
                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Price range chips */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Giá:</span>
            <button
              onClick={() => { selectPriceRange(null, null); }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                !activePriceRange
                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
              }`}
            >
              Tất cả
            </button>
            {PRICE_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => selectPriceRange(r.min, r.max)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  activePriceRange?.label === r.label
                    ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 bg-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm mb-2">Không tìm thấy sản phẩm nào.</p>
            <button onClick={clearFilters} className="text-indigo-600 text-sm hover:underline">
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4 font-medium">{products.length} sản phẩm</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
