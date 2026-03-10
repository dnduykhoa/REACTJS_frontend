import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, brandApi, categoryApi } from '../api/j2ee';
import type { Product, Brand, Category } from '../api/j2ee/types';
import ProductCard from '../components/ProductCard';
import { ArrowRight, Zap, Shield, Truck } from 'lucide-react';

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productApi.getAll(),
      brandApi.getActive(),
      categoryApi.getRoot(),
    ]).then(([p, b, c]) => {
      setProducts(p.data.data.slice(0, 8));
      setBrands(b.data.data);
      setCategories(c.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/image.png')" }}
        />
        {/* Overlay để text dễ đọc */}
        <div className="absolute inset-0 bg-indigo-950/55" />

        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <span className="inline-block bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
            Công nghệ hàng đầu
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Thiết bị công nghệ<br className="hidden md:block" /> chính hãng, giá tốt
          </h1>
          <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
            Laptop, điện thoại và phụ kiện từ các thương hiệu uy tín — giao hàng nhanh toàn quốc.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-3.5 rounded-full hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Mua ngay <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {[
            { icon: Truck, title: 'Giao hàng toàn quốc', desc: 'Nhanh chóng & đáng tin cậy' },
            { icon: Shield, title: 'Hàng chính hãng', desc: 'Bảo hành đầy đủ từ nhà sản xuất' },
            { icon: Zap, title: 'Hỗ trợ 24/7', desc: 'Tư vấn miễn phí mọi lúc' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3 px-6 py-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-slate-800">Danh mục sản phẩm</h2>
              <Link to="/products" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?categoryId=${cat.id}`}
                  className="bg-white border border-slate-100 rounded-xl py-4 px-3 text-center text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Brands ── */}
        {brands.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-5">Thương hiệu</h2>
            <div className="flex flex-wrap gap-2.5">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/products?brandId=${brand.id}`}
                  className="bg-white border border-slate-200 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm transition-all"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Featured products ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-slate-800">Sản phẩm nổi bật</h2>
            <Link to="/products" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Chưa có sản phẩm nào.</div>
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
