import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const navLinks = [
  { to: '/admin', label: 'Dashboard', exact: true },
  { to: '/admin/products', label: 'Sản phẩm' },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/brands', label: 'Thương hiệu' },
  { to: '/admin/attribute-groups', label: 'Nhóm thuộc tính' },
  { to: '/admin/attribute-definitions', label: 'Thuộc tính' },
  { to: '/admin/category-attributes', label: 'Thuộc tính danh mục' },
  { to: '/admin/users', label: 'Người dùng' },
];

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
    }
  }, [user, isAdmin, navigate]);

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-gray-700">
          <Link to="/" className="text-lg font-bold text-blue-400">🖥️ TechStore</Link>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${isActive ? 'bg-blue-700 text-white' : 'text-gray-300'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-400">
          <p className="truncate">{user.username}</p>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="mt-1 text-red-400 hover:text-red-300"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-gray-700 font-semibold">Quản trị hệ thống</h1>
          <span className="text-sm text-gray-500">Xin chào, {user.fullName || user.username}</span>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
