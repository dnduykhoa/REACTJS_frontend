import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { productApi, brandApi, categoryApi, authApi } from '../../api/j2ee';
import { useAuth } from '../../context/AuthContext';
import { Package, Building2, Tag, Users, Plus, ArrowRight, BadgePercent, Ticket, BellRing, ShoppingBag, MessageCircleQuestion } from 'lucide-react';

interface Stats {
  products: number;
  brands: number;
  categories: number;
  users: number;
}

export default function AdminDashboard() {
  const { isAdmin, isManager, isStaff } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState<Stats>({ products: 0, brands: 0, categories: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  const basePath = (() => {
    const matched = location.pathname.match(/^\/(admin|manager|staff)/);
    if (matched) return `/${matched[1]}`;
    if (isAdmin) return '/admin';
    if (isManager) return '/manager';
    if (isStaff) return '/staff';
    return '/admin';
  })();

  useEffect(() => {
    const requests = [
      productApi.getAll(),
      brandApi.getAll(),
      categoryApi.getAll(),
      authApi.getAllUsers(),
    ];

    // Staff don't need brand/category data, but we fetch for consistency
    Promise.allSettled(requests).then(([p, b, c, u]) => {
      setStats({
        products: p.status === 'fulfilled' ? (p.value.data.data?.length ?? 0) : 0,
        brands:   b.status === 'fulfilled' ? (b.value.data.data?.length ?? 0) : 0,
        categories: c.status === 'fulfilled' ? (c.value.data.data?.length ?? 0) : 0,
        users:    u.status === 'fulfilled' ? (u.value.data.data?.length ?? 0) : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  // Role-based stat cards
  const allCards = [
    { label: 'Sản phẩm', value: stats.products, to: `${basePath}/products`, icon: Package, bg: 'bg-indigo-50', iconColor: 'text-indigo-600', border: 'border-indigo-100', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { label: 'Thương hiệu', value: stats.brands, to: `${basePath}/brands`, icon: Building2, bg: 'bg-violet-50', iconColor: 'text-violet-600', border: 'border-violet-100', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Danh mục', value: stats.categories, to: `${basePath}/categories`, icon: Tag, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Người dùng', value: stats.users, to: `${basePath}/users`, icon: Users, bg: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  ];

  const currentRoles = [
    ...(isAdmin ? ['ADMIN'] : []),
    ...(isManager ? ['MANAGER'] : []),
    ...(isStaff ? ['STAFF'] : []),
  ];

  const cards = allCards.filter((card) => card.roles.some((role) => currentRoles.includes(role)));

  const allQuickLinks = [
    { to: `${basePath}/products/new`, label: 'Thêm sản phẩm mới', icon: Plus, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/products`, label: 'Quản lý sản phẩm', icon: Package, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/orders`, label: 'Quản lý đơn hàng', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/preorders`, label: 'Quản lý chờ hàng', icon: BellRing, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/product-questions`, label: 'Quản lý hỏi đáp', icon: MessageCircleQuestion, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/users`, label: 'Quản lý người dùng', icon: Users, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { to: `${basePath}/categories`, label: 'Quản lý danh mục', icon: Tag, roles: ['ADMIN', 'MANAGER'] },
    { to: `${basePath}/brands`, label: 'Quản lý thương hiệu', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
    { to: `${basePath}/attribute-groups`, label: 'Nhóm thuộc tính', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { to: `${basePath}/attribute-definitions`, label: 'Định nghĩa thuộc tính', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { to: `${basePath}/sale-programs`, label: 'Quản lý sale programs', icon: BadgePercent, roles: ['ADMIN', 'MANAGER'] },
    { to: `${basePath}/vouchers`, label: 'Quản lý vouchers', icon: Ticket, roles: ['ADMIN', 'MANAGER'] },
  ];

  const quickLinks = allQuickLinks.filter((link) => link.roles.some((role) => currentRoles.includes(role)));

  // Get role badge info
  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin', color: 'bg-red-100 text-red-800' };
    if (isManager) return { label: 'Manager', color: 'bg-blue-100 text-blue-800' };
    if (isStaff) return { label: 'Staff', color: 'bg-green-100 text-green-800' };
    return null;
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tổng quan hệ thống</p>
        </div>
        {roleBadge && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        )}
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
