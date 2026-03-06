import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, X } from 'lucide-react';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState(searchParams.get('name') || '');

  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : null;
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null;

  useEffect(() => {
    Promise.all([brandApi.getActive(), categoryApi.getRoot()]).then(([b, c]) => {
      setBrands(b.data.data);
      setCategories(c.data.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const name = searchParams.get('name') || '';
    let req: Promise<{ data: { data: Product[] } }>;

    if (name) {
      req = productApi.search(name);
    } else if (categoryId) {
      req = productApi.getByCategory(categoryId);
    } else if (brandId) {
      req = productApi.getByBrand(brandId);
    } else {
      req = productApi.getActive();
    }

    req.then((res) => setProducts(res.data.data)).finally(() => setLoading(false));
  }, [searchParams, categoryId, brandId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (searchName.trim()) params.name = searchName.trim();
    setSearchParams(params);
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

  const hasFilter = brandId || categoryId || searchParams.get('name');

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

        {/* Categories */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Danh mục</h3>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => setFilter('categoryId', null)}
                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !categoryId
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => setFilter('categoryId', String(cat.id))}
                  className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    categoryId === cat.id
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Brands */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Thương hiệu</h3>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => setFilter('brandId', null)}
                className={`text-sm w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  !brandId
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
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

      {/* ── Products grid ── */}
      <div className="flex-1 min-w-0">
        {/* Search bar */}
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
            <p className="text-xs text-slate-400 mb-4 font-medium">
              {products.length} sản phẩm
            </p>
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
