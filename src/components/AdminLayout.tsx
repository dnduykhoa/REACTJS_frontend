import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Tag,
  Building2,
  Layers,
  Sliders,
  Link2,
  Users,
  LogOut,
  Monitor,
  Image,
  ShoppingBag,
  BellRing,
  Ticket,
  BadgePercent,
  MessageCircleQuestion,
} from 'lucide-react';

type AdminNavLink = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles: string[];
};

const navLinkTemplates: Omit<AdminNavLink, 'to'>[] = [
  { label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Sản phẩm', icon: Package, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Đơn hàng', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Chờ hàng', icon: BellRing, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Hỏi đáp SP', icon: MessageCircleQuestion, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Người dùng', icon: Users, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  { label: 'Danh mục', icon: Tag, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Thương hiệu', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Nhóm thuộc tính', icon: Layers, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Thuộc tính', icon: Sliders, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Thuộc tính DM', icon: Link2, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Carousel', icon: Image, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Sale Programs', icon: BadgePercent, roles: ['ADMIN', 'MANAGER'] },
  { label: 'Vouchers', icon: Ticket, roles: ['ADMIN', 'MANAGER'] },
];

const routePaths = [
  '',  // Dashboard
  'products',
  'orders',
  'preorders',
  'product-questions',
  'users',
  'categories',
  'brands',
  'attribute-groups',
  'attribute-definitions',
  'category-attributes',
  'carousel',
  'sale-programs',
  'vouchers',
];

const routeRules = [
  // /admin, /manager, /staff base paths
  { pattern: /^\/(?:admin|manager|staff)$/, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  // Products, orders, preorders, users accessible to all backoffice roles
  { pattern: /^\/(?:admin|manager|staff)\/(products|orders|preorders|product-questions|users)(\/.*)?$/, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  // Management features only for Admin/Manager
  {
    pattern: /^\/(?:admin|manager|staff)\/(categories|brands|attribute-groups|attribute-definitions|category-attributes|carousel|sale-programs|vouchers)(\/.*)?$/,
    roles: ['ADMIN', 'MANAGER'],
  },
] as const;

// Helper to get the current base path
function getBasePath(pathname: string): string {
  const match = pathname.match(/^\/(admin|manager|staff)/);
  return match ? `/${match[1]}` : '/admin';
}

export default function AdminLayout() {
  const { user, isAdmin, isManager, isStaff, canAccessAdmin, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the current base path
  const currentBasePath = getBasePath(location.pathname);

  // Get the correct base path for this user's role
  const getCorrectBasePath = () => {
    if (isAdmin) return '/admin';
    if (isManager) return '/manager';
    if (isStaff) return '/staff';
    return '/admin';
  };

  const correctBasePath = getCorrectBasePath();

  const canAccessPath = (pathname: string) => {
    const matchedRule = routeRules.find((rule) => rule.pattern.test(pathname));
    if (!matchedRule) {
      return isAdmin || isManager;
    }
    return matchedRule.roles.some((role) => hasRole(role));
  };

  useEffect(() => {
    if (!user || !canAccessAdmin) {
      navigate('/login');
      return;
    }
    // Redirect to correct base path if wrong one is used
    if (currentBasePath !== correctBasePath) {
      navigate(correctBasePath);
      return;
    }
    if (!canAccessPath(location.pathname)) {
      navigate(correctBasePath);
    }
  }, [user, canAccessAdmin, location.pathname, navigate, correctBasePath, currentBasePath]);

  if (!user || !canAccessAdmin || !canAccessPath(location.pathname)) return null;

  const initials = (user.fullName || user.username).slice(0, 2).toUpperCase();

  const currentRoles = [
    ...(isAdmin ? ['ADMIN'] : []),
    ...(isManager ? ['MANAGER'] : []),
    ...(isStaff ? ['STAFF'] : []),
  ];

  // Generate navLinks with the correct base path
  const navLinks: AdminNavLink[] = navLinkTemplates.map((template, index) => ({
    ...template,
    to: routePaths[index] ? `${correctBasePath}/${routePaths[index]}` : correctBasePath,
  }));

  const visibleNavLinks = navLinks.filter((item) => item.roles.some((role) => currentRoles.includes(role)));

  // Get panel title based on role
  const getPanelTitle = () => {
    if (isAdmin) return 'Admin Panel';
    if (isManager) return 'Manager Panel';
    if (isStaff) return 'Staff Dashboard';
    return 'Admin Panel';
  };

  const panelTitle = getPanelTitle();

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 shadow-2xl h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">TechStore</p>
              <p className="text-slate-400 text-xs">{panelTitle}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
          {visibleNavLinks.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.fullName || user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-6 h-14 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
          <h1 className="text-slate-700 font-semibold text-sm">Quản trị hệ thống</h1>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="text-sm text-slate-500">
              Xin chào, <span className="text-slate-700 font-medium">{user.fullName || user.username}</span>
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
