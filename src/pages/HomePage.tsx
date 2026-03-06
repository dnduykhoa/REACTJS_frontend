import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productApi.getActive(),
      brandApi.getActive(),
      categoryApi.getRoot(),
    ]).then(([p, b, c]) => {
      setProducts(p.data.data.slice(0, 8));
      setBrands(b.data.data);
      setCategories(c.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Hero - full bleed */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-500 py-24 px-4 text-white text-center">
        <h1 className="text-4xl font-bold mb-3">Công nghệ đỉnh cao</h1>
        <p className="text-blue-100 mb-8 text-lg">Laptop, điện thoại, phụ kiện chính hãng — giá tốt nhất</p>
        <Link
          to="/products"
          className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-full hover:bg-blue-50 transition-colors inline-block"
        >
          Mua ngay
        </Link>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Danh mục sản phẩm</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?categoryId=${cat.id}`}
                className="bg-white border border-gray-200 rounded-xl py-3 px-2 text-center text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Brands */}
      {brands.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Thương hiệu</h2>
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/products?brandId=${brand.id}`}
                className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Sản phẩm nổi bật</h2>
          <Link to="/products" className="text-sm text-blue-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="text-gray-500 text-sm">Chưa có sản phẩm nào.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
