import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, blocks backoffice users (Admin/Manager/Staff) */
  customersOnly?: boolean;
  /** If true, blocks non-backoffice users */
  backofficeOnly?: boolean;
}

/**
 * Route protection wrapper for role-based access control
 *
 * @param customersOnly - If true, only regular customers can access (blocks backoffice)
 * @param backofficeOnly - If true, only Admin/Manager/Staff can access
 * @param children - Component to render if access is allowed
 *
 * If access is denied, redirects to appropriate page:
 * - Backoffice user accessing customer page → redirects to their panel
 * - Customer accessing backoffice page → redirects to home
 */
export default function ProtectedRoute({ children, customersOnly = false, backofficeOnly = false }: ProtectedRouteProps) {
  const { user, canAccessAdmin } = useAuth();

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block backoffice users from customer-only routes (cart, checkout)
  if (customersOnly && canAccessAdmin) {
    // Redirect to their admin/manager/staff panel
    return <Navigate to="/admin" replace />;
  }

  // Block customers from backoffice-only routes
  if (backofficeOnly && !canAccessAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
