// ─── Common ──────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

// ─── Auth / User ─────────────────────────────────────────────────────────────
export interface LoginRequest {
  emailOrPhone: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  userId: number;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  birthDate: string | null; // ISO date "YYYY-MM-DD"
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  fullName?: string;
  phone?: string;
  birthDate?: string; // "YYYY-MM-DD"
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorResponse {
  message: string;
  requiresTwoFactor: boolean;
  emailOrPhone: string;
}

export interface Verify2FARequest {
  emailOrPhone: string;
  code: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  birthDate: string | null;
  provider: string;
  twoFactorEnabled: boolean;
  roles: string[];
}
// ─── Carousel ─────────────────────────────────────────────────────────────────
export interface CarouselSlide {
  id: number;
  image: string;
  mediaType: 'IMAGE' | 'VIDEO';
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  displayOrder: number;
  intervalMs: number;
  isActive: boolean;
}

export interface CarouselSlideRequest {
  image?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  badge?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  displayOrder?: number;
  intervalMs?: number;
  isActive?: boolean;
}
// ─── Brand ───────────────────────────────────────────────────────────────────
export interface Brand {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  parent: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequest {
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  parentId?: number | null;
}

// ─── Attribute Group ─────────────────────────────────────────────────────────
export interface AttributeGroup {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

// ─── Attribute Definition ─────────────────────────────────────────────────────
export type DataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST';

export interface AttributeDefinition {
  id: number;
  name: string;
  attrKey: string;
  dataType: DataType;
  unit: string | null;
  isFilterable: boolean;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  attributeGroup: AttributeGroup | null;
}

export interface AttributeDefinitionRequest {
  name: string;
  attrKey: string;
  dataType: DataType;
  unit?: string;
  isFilterable?: boolean;
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  groupId?: number;
}

// ─── Category Attribute ───────────────────────────────────────────────────────
export interface CategoryAttribute {
  id: number;
  category: Category;
  attributeDefinition: AttributeDefinition;
  isRequired: boolean;
  displayOrder: number;
}

// ─── Product Media ────────────────────────────────────────────────────────────
export interface ProductMedia {
  id: number;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
}

// ─── Product Specification ────────────────────────────────────────────────────
export interface ProductSpecification {
  id: number;
  attributeDefinition: AttributeDefinition | null;
  specKey: string | null;
  specValue: string | null;
  valueNumber: number | null;
  displayOrder: number;
}

// ─── Product ──────────────────────────────────────────────────────────────────
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  category: Category | null;
  brand: Brand | null;
  media: ProductMedia[];
  specifications: ProductSpecification[];
  isActive: boolean;
  status?: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface OrderRequest {
  fullName: string;
  phone: string;
  email?: string;
  shippingAddress: string;
  note?: string;
  paymentMethod: PaymentMethod;
  items: OrderItemRequest[];
}

export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderResponse {
  id: number;
  orderCode: string;
  userId: number;
  fullName: string;
  phone: string;
  email: string | null;
  shippingAddress: string;
  note: string | null;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  vnpayUrl?: string | null;
  momoUrl?: string | null;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItemRequest {
  productId: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  inStock: boolean;
  availableStock: number;
}

export interface CartResponse {
  id: number;
  userId: number;
  items: CartItemResponse[];
  totalItems: number;
  totalAmount: number;
}
