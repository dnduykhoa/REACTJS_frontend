import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi, brandApi, categoryApi, authApi } from '../../api/j2ee';
import { Package, Building2, Tag, Users, Plus, ArrowRight } from 'lucide-react';

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
    Promise.allSettled([
      productApi.getAll(),
      brandApi.getAll(),
      categoryApi.getAll(),
      authApi.getAllUsers(),
    ]).then(([p, b, c, u]) => {
      setStats({
        products: p.status === 'fulfilled' ? (p.value.data.data?.length ?? 0) : 0,
        brands:   b.status === 'fulfilled' ? (b.value.data.data?.length ?? 0) : 0,
        categories: c.status === 'fulfilled' ? (c.value.data.data?.length ?? 0) : 0,
        users:    u.status === 'fulfilled' ? (u.value.data.data?.length ?? 0) : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Sản phẩm', value: stats.products, to: '/admin/products', icon: Package, bg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100' },
    { label: 'Thương hiệu', value: stats.brands, to: '/admin/brands', icon: Building2, bg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'border-violet-100' },
    { label: 'Danh mục', value: stats.categories, to: '/admin/categories', icon: Tag, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100' },
    { label: 'Người dùng', value: stats.users, to: '/admin/users', icon: Users, bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100' },
  ];

  const quickLinks = [
    { to: '/admin/products/new', label: 'Thêm sản phẩm mới', icon: Plus },
    { to: '/admin/categories', label: 'Quản lý danh mục', icon: Tag },
    { to: '/admin/brands', label: 'Quản lý thương hiệu', icon: Building2 },
    { to: '/admin/attribute-groups', label: 'Nhóm thuộc tính', icon: Package },
    { to: '/admin/attribute-definitions', label: 'Định nghĩa thuộc tính', icon: Package },
    { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Tổng quan hệ thống</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.to}
                to={card.to}
                className={`bg-white rounded-2xl border ${card.border} p-5 hover:shadow-md transition-shadow group`}
              >
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 group-hover:text-indigo-600 transition-colors">
                  {card.label}
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Truy cập nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                <Icon size={15} className="shrink-0 text-slate-400" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
