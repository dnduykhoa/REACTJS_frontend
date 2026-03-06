import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, brandApi, categoryApi, authApi } from '../../api/j2ee';

interface Stats {
  products: number;
  brands: number;
  categories: number;
  users: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, brands: 0, categories: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productApi.getAll(),
      brandApi.getAll(),
      categoryApi.getAll(),
      authApi.getAllUsers(),
    ]).then(([p, b, c, u]) => {
      setStats({
        products: p.data.data.length,
        brands: b.data.data.length,
        categories: c.data.data.length,
        users: u.data.data.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Sản phẩm', value: stats.products, to: '/admin/products', color: 'bg-blue-500' },
    { label: 'Thương hiệu', value: stats.brands, to: '/admin/brands', color: 'bg-purple-500' },
    { label: 'Danh mục', value: stats.categories, to: '/admin/categories', color: 'bg-green-500' },
    { label: 'Người dùng', value: stats.users, to: '/admin/users', color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className={`${card.color} text-white rounded-xl p-5 hover:opacity-90 transition-opacity`}
            >
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm mt-1 opacity-90">{card.label}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Truy cập nhanh</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { to: '/admin/products/new', label: '+ Thêm sản phẩm' },
            { to: '/admin/categories', label: 'Quản lý danh mục' },
            { to: '/admin/brands', label: 'Quản lý thương hiệu' },
            { to: '/admin/attribute-groups', label: 'Nhóm thuộc tính' },
            { to: '/admin/attribute-definitions', label: 'Thuộc tính' },
            { to: '/admin/users', label: 'Quản lý người dùng' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
