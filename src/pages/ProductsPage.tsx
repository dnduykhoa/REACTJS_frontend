import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, X, Check } from 'lucide-react';

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
  // Nhiều danh mục con có thể được chọn cùng lúc
  const subIds = searchParams.getAll('subId').map(Number).filter(Boolean);

  // Load root categories và brands 1 lần
  useEffect(() => {
    Promise.all([brandApi.getActive(), categoryApi.getRoot()]).then(([b, c]) => {
      setBrands(b.data.data);
      setRootCategories(c.data.data);
    });
  }, []);

  // Load danh mục con khi chọn danh mục cha
  useEffect(() => {
    if (categoryId) {
      categoryApi.getChildren(categoryId).then((r) => setChildCategories(r.data.data));
    } else {
      setChildCategories([]);
    }
  }, [categoryId]);

  // Load sản phẩm theo bộ lọc
  useEffect(() => {
    setLoading(true);
    const name = searchParams.get('name') || '';
    let req: Promise<{ data: { data: Product[] } }>;

    if (name) {
      req = productApi.search(name);
    } else if (subIds.length > 0) {
      // Đã chọn 1 hoặc nhiều danh mục con
      req = productApi.getByCategories(subIds);
    } else if (categoryId) {
      // Chỉ chọn danh mục cha → lấy cả cha lẫn tất cả con
      req = productApi.getByCategoryTree(categoryId);
    } else if (brandId) {
      req = productApi.getByBrand(brandId);
    } else {
      req = productApi.getAll();
    }

    req.then((res) => setProducts(res.data.data)).finally(() => setLoading(false));
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (searchName.trim()) params.name = searchName.trim();
    setSearchParams(params);
  };

  // Chọn danh mục cha: xóa subId cũ
  const selectRootCategory = (id: number | null) => {
    if (id === null) {
      setSearchName('');
      setSearchParams({});
    } else {
      setSearchParams({ categoryId: String(id) });
    }
  };

  // Chọn/bỏ chọn danh mục con (multi-select)
  const toggleSubCategory = (id: number) => {
    if (!categoryId) return;
    const next = subIds.includes(id)
      ? subIds.filter((s) => s !== id)
      : [...subIds, id];
    const p = new URLSearchParams({ categoryId: String(categoryId) });
    next.forEach((s) => p.append('subId', String(s)));
    setSearchParams(p);
  };

  const setFilter = (key: string, value: string | null) => {
    const params: Record<string, string> = {};
    if (value) params[key] = value;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchName('');
    setSearchParams({});
  };

  const hasFilter = brandId || categoryId || subIds.length > 0 || searchParams.get('name');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-7">
      {/* ── Sidebar ── */}
      <aside className="w-52 shrink-0 space-y-6">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <SlidersHorizontal className="w-4 h-4" /> Bộ lọc
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
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Danh mục</h3>
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
                            {subIds.includes(child.id) && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
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
        </div>

        {/* Thương hiệu */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Thương hiệu</h3>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => setFilter('brandId', null)}
                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !brandId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả
              </button>
            </li>
            {brands.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setFilter('brandId', String(b.id))}
                  className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    brandId === b.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Lưới sản phẩm ── */}
      <div className="flex-1 min-w-0">
        {/* Thanh tìm kiếm */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
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

        {loading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm mb-2">Không tìm thấy sản phẩm nào.</p>
            <button onClick={clearFilters} className="text-indigo-600 text-sm hover:underline">Xóa bộ lọc</button>
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
