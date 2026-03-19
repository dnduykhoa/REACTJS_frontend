// ─── Common ──────────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  message: string;
  data: T;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

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

// ─── Product Variant ─────────────────────────────────────────────────────────
export interface ProductVariantValue {
  id: number;
  attributeDefinition: AttributeDefinition | null;
  attrKey: string;
  attrValue: string | null;
  valueNumber: number | null;
  displayOrder: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  price: number;
  stockQuantity: number;
  soldCount?: number;
  isActive: boolean;
  displayOrder: number;
  values: ProductVariantValue[];
  media?: ProductMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantValueRequest {
  attrDefId?: number;
  attrKey?: string;
  attrValue?: string;
  valueNumber?: number;
  displayOrder?: number;
}

export interface ProductVariantRequest {
  sku: string;
  price: number;
  stockQuantity?: number;
  isActive?: boolean;
  displayOrder?: number;
  values: ProductVariantValueRequest[];
}

// ─── Product ──────────────────────────────────────────────────────────────────
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'NEW_ARRIVAL';

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  soldCount?: number;
  category: Category | null;
  brand: Brand | null;
  media: ProductMedia[];
  specifications: ProductSpecification[];
  variants?: ProductVariant[];
  isActive: boolean;
  status?: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type PreorderRequestStatus = 'WAITING' | 'NOTIFIED';

export interface PreorderRegistrationRequest {
  productId: number;
  variantId?: number;
  customerName: string;
  phone: string;
  email: string;
  desiredQuantity: number;
}

export interface PreorderRequestResponse {
  id: number;
  productId: number;
  productName: string;
  variantId: number | null;
  variantName: string | null;
  customerName: string;
  phone: string;
  email: string;
  desiredQuantity: number;
  status: PreorderRequestStatus;
  queuePosition: number | null;
  createdAt: string;
  notifiedAt: string | null;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'VNPAY' | 'MOMO';

export interface OrderItemRequest {
  productId: number;
  variantId?: number;
  quantity: number;
}

export interface OrderRequest {
  fullName: string;
  phone: string;
  email?: string;
  shippingAddress: string;
  note?: string;
  paymentMethod: PaymentMethod;
  voucherCode?: string;
  items: OrderItemRequest[];
}

export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  productImageUrl: string | null;
  variantId: number | null;
  variantName?: string | null;
  variantDisplayName?: string | null;
  variantSku: string | null;
  imageUrl?: string | null;
  displayImageUrl?: string | null;
  variantOptions: string[] | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  reviewed?: boolean; // true nếu user đã đánh giá item này
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
  originalAmount: number;
  saleDiscount: number;
  voucherDiscount: number;
  appliedVoucherCode?: string | null;
  totalAmount: number;
  items: OrderItemResponse[];
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  vnpayUrl?: string | null;
  momoUrl?: string | null;
  paymentDeadline?: string | null;
}

// ─── Sale Program ────────────────────────────────────────────────────────────
export type SaleConditionType = 'PAYMENT_METHOD' | 'MIN_ORDER_AMOUNT' | 'MIN_QUANTITY';

export interface SaleProgramConditionRequest {
  conditionType: SaleConditionType;
  conditionValue: string;
  description?: string;
}

export interface SaleProgramCondition {
  id: number;
  conditionType: SaleConditionType;
  conditionValue: string;
  description: string | null;
}

export interface SaleProgramRequest {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  productIds?: number[];
  conditions?: SaleProgramConditionRequest[];
}

export interface SaleProgram {
  id: number;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  productIds: number[];
  conditions: SaleProgramCondition[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Voucher ────────────────────────────────────────────────────────────────
export type VoucherType = 'SINGLE_USE' | 'MULTI_USE';

export interface VoucherRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  voucherType: VoucherType;
  maxUsageCount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface Voucher {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  voucherType: VoucherType;
  maxUsageCount: number | null;
  usageCount?: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoucherValidateRequest {
  code: string;
  orderAmount?: number;
}

export interface VoucherValidateResponse {
  code?: string;
  valid?: boolean;
  discountAmount?: number;
  finalAmount?: number;
  message?: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItemRequest {
  productId: number;
  variantId?: number;
  quantity: number;
}

export interface CartItemResponse {
  id: number;
  product: Product;
  variantId: number | null;
  variantName?: string | null;
  variantDisplayName?: string | null;
  variantSku: string | null;
  imageUrl?: string | null;
  displayImageUrl?: string | null;
  variantImageUrl: string | null;
  variantOptions: string[] | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  inStock: boolean;
  availableStock: number;
  preorder: boolean;
}

export interface CartResponse {
  id: number;
  userId: number;
  items: CartItemResponse[];
  totalItems: number;
  totalAmount: number;
}

// ─── Product Q&A ─────────────────────────────────────────────────────────────
export interface ProductQuestionCreateRequest {
  question: string;
}

export interface ProductQuestionAnswerRequest {
  answer: string;
}

export interface ProductQuestionResponse {
  id: number;
  productId: number;
  productName: string;
  customerId: number;
  customerName: string;
  question: string;
  answer: string | null;
  answered: boolean;
  askedAt: string;
  answeredAt: string | null;
  answeredById: number | null;
  answeredByName: string | null;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType = 'PRODUCT_QA_REPLY';

export interface UserNotificationResponse {
  id: number;
  type: NotificationType;
  title: string;
  content: string;
  referenceUrl: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

// ─── Product Review ───────────────────────────────────────────────────────────
export interface ReviewRequest {
  orderItemId: number;
  rating: number; // 1-5
  comment?: string;
}

export interface ReviewResponse {
  id: number;
  userId: number;
  username: string;
  productId: number;
  productName: string;
  variantId: number | null;
  orderItemId: number;
  rating: number;
  comment: string | null;
  imageUrls: string[];
  hidden: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
}
