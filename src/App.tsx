import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';

// Public pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBrands from './pages/admin/AdminBrands';
import AdminAttributeGroups from './pages/admin/AdminAttributeGroups';
import AdminAttributeDefinitions from './pages/admin/AdminAttributeDefinitions';
import AdminCategoryAttributes from './pages/admin/AdminCategoryAttributes';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCarousel from './pages/admin/AdminCarousel';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/profile/:id" element={<ProfilePage />} />
            <Route path="/profile/:id/change-password" element={<ChangePasswordPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attribute-groups" element={<AdminAttributeGroups />} />
            <Route path="attribute-definitions" element={<AdminAttributeDefinitions />} />
            <Route path="category-attributes" element={<AdminCategoryAttributes />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="carousel" element={<AdminCarousel />} />
          </Route>
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
