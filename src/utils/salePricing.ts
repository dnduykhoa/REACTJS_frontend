import type { DiscountType, SaleProgram } from '../api/j2ee/types';

type CanonicalDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

function normalizeDiscountType(type: DiscountType | string): CanonicalDiscountType {
  const value = String(type || '').toUpperCase();
  if (value === 'FIXED' || value === 'FIXED_AMOUNT' || value === 'AMOUNT') {
    return 'FIXED_AMOUNT';
  }
  return 'PERCENTAGE';
}

function isInActiveRange(sale: SaleProgram, now: Date) {
  const start = new Date(sale.startDate).getTime();
  const end = new Date(sale.endDate).getTime();
  const nowMs = now.getTime();
  return nowMs >= start && nowMs <= end;
}

export function getBestSaleForProduct(
  productId: number,
  unitPrice: number,
  sales: SaleProgram[],
  options?: {
    paymentMethod?: 'CASH' | 'VNPAY' | 'MOMO';
    orderAmount?: number;
    quantity?: number;
  }
): { sale: SaleProgram | null; discountPerUnit: number } {
  const now = new Date();
  let bestSale: SaleProgram | null = null;
  let bestDiscount = 0;

  for (const sale of sales || []) {
    if (!sale?.isActive) continue;
    if (!isInActiveRange(sale, now)) continue;
    if (!sale.productIds?.includes(productId)) continue;

    const conditions = sale.conditions || [];
    const isConditionMatched = conditions.every((condition) => {
      const type = condition.conditionType;
      const value = String(condition.conditionValue || '').trim();

      if (type === 'PAYMENT_METHOD') {
        return !!options?.paymentMethod && options.paymentMethod === value.toUpperCase();
      }
      if (type === 'MIN_ORDER_AMOUNT') {
        const minAmount = Number(value || 0);
        return (options?.orderAmount ?? 0) >= minAmount;
      }
      if (type === 'MIN_QUANTITY') {
        const minQty = Number(value || 0);
        return (options?.quantity ?? 0) >= minQty;
      }
      return true;
    });

    if (!isConditionMatched) continue;

    const discountType = normalizeDiscountType(sale.discountType);
    let discount =
      discountType === 'PERCENTAGE'
        ? (unitPrice * Number(sale.discountValue || 0)) / 100
        : Number(sale.discountValue || 0);

    if (sale.maxDiscountAmount != null) {
      discount = Math.min(discount, Number(sale.maxDiscountAmount));
    }

    discount = Math.max(0, Math.min(discount, unitPrice));

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestSale = sale;
    }
  }

  return { sale: bestSale, discountPerUnit: bestDiscount };
}

export function getSalePricing(
  unitPrice: number,
  quantity: number,
  discountPerUnit: number
): {
  originalSubtotal: number;
  discountSubtotal: number;
  finalSubtotal: number;
} {
  const originalSubtotal = unitPrice * quantity;
  const discountSubtotal = Math.min(Math.max(discountPerUnit, 0), unitPrice) * quantity;
  const finalSubtotal = Math.max(originalSubtotal - discountSubtotal, 0);

  return {
    originalSubtotal,
    discountSubtotal,
    finalSubtotal,
  };
}
