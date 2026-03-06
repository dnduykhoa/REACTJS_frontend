import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState(searchParams.get('name') || '');

  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : null;
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : null;

  // Load filters once
  useEffect(() => {
    Promise.all([brandApi.getActive(), categoryApi.getRoot()]).then(([b, c]) => {
      setBrands(b.data.data);
      setCategories(c.data.data);
    });
  }, []);

  // Load products based on filters
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

    req
      .then((res) => setProducts(res.data.data))
      .finally(() => setLoading(false));
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      {/* Sidebar filter */}
      <aside className="w-52 shrink-0 space-y-5">
        <div>
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">Danh mục</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setFilter('categoryId', null)}
                className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${!categoryId ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                Tất cả
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => setFilter('categoryId', String(cat.id))}
                  className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${categoryId === cat.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">Thương hiệu</h3>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setFilter('brandId', null)}
                className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${!brandId ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
              >
                Tất cả
              </button>
            </li>
            {brands.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setFilter('brandId', String(b.id))}
                  className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${brandId === b.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Products grid */}
      <div className="flex-1">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-5">
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Tìm
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-sm py-10 text-center">Không tìm thấy sản phẩm nào.</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">{products.length} sản phẩm</p>
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
