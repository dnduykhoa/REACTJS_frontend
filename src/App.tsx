import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import MainLayout from './components/MainLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import WebNotificationCenter from './components/WebNotificationCenter';

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
import AdminOrders from './pages/admin/AdminOrders';
import AdminPreorders from './pages/admin/AdminPreorders';
import AdminSalePrograms from './pages/admin/AdminSalePrograms';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminProductQuestions from './pages/admin/AdminProductQuestions';
import AdminReviews from './pages/admin/AdminReviews';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
        <WebNotificationCenter />
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
            <Route path="/cart" element={<ProtectedRoute customersOnly><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute customersOnly><CheckoutPage /></ProtectedRoute>} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Admin routes - /admin for Admin role */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="products/:id/variants/:variantId/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attribute-groups" element={<AdminAttributeGroups />} />
            <Route path="attribute-definitions" element={<AdminAttributeDefinitions />} />
            <Route path="category-attributes" element={<AdminCategoryAttributes />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="product-questions" element={<AdminProductQuestions />} />
            <Route path="carousel" element={<AdminCarousel />} />
            <Route path="sale-programs" element={<AdminSalePrograms />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="preorders" element={<AdminPreorders />} />
          </Route>

          {/* Manager routes - /manager for Manager role */}
          <Route path="/manager" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="products/:id/variants/:variantId/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attribute-groups" element={<AdminAttributeGroups />} />
            <Route path="attribute-definitions" element={<AdminAttributeDefinitions />} />
            <Route path="category-attributes" element={<AdminCategoryAttributes />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="product-questions" element={<AdminProductQuestions />} />
            <Route path="carousel" element={<AdminCarousel />} />
            <Route path="sale-programs" element={<AdminSalePrograms />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="preorders" element={<AdminPreorders />} />
          </Route>

          {/* Staff routes - /staff for Staff role */}
          <Route path="/staff" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="products/:id/variants/:variantId/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="attribute-groups" element={<AdminAttributeGroups />} />
            <Route path="attribute-definitions" element={<AdminAttributeDefinitions />} />
            <Route path="category-attributes" element={<AdminCategoryAttributes />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="product-questions" element={<AdminProductQuestions />} />
            <Route path="carousel" element={<AdminCarousel />} />
            <Route path="sale-programs" element={<AdminSalePrograms />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="preorders" element={<AdminPreorders />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>
        </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
