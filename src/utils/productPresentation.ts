import type { Product, ProductStatus, ProductVariant } from '../api/j2ee/types';

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function buildDisplayKey(product: Product): string {
  const name = normalizeText(product.name);
  const categoryId = product.category?.id ?? 0;
  const brandId = product.brand?.id ?? 0;
  const price = Number(product.price || 0);
  return `${name}|${categoryId}|${brandId}|${price}`;
}

function productScore(product: Product): number {
  const variantCount = product.variants?.length || 0;
  const mediaCount = product.media?.length || 0;
  return variantCount * 100 + mediaCount;
}

function resolveProductStatus(product: Product): ProductStatus {
  return product.status ?? (product.isActive ? (product.stockQuantity > 0 ? 'ACTIVE' : 'OUT_OF_STOCK') : 'INACTIVE');
}

function isVariantAvailable(variant: ProductVariant): boolean {
  return Boolean(variant.isActive) && Number(variant.stockQuantity || 0) > 0;
}

function pickNearestAvailableVariant(product: Product): ProductVariant | null {
  const variants = (product.variants || [])
    .slice()
    .sort((a, b) => {
      const orderDiff = Number(a.displayOrder || 0) - Number(b.displayOrder || 0);
      if (orderDiff !== 0) return orderDiff;
      return a.id - b.id;
    });

  return variants.find(isVariantAvailable) || null;
}

function toDisplayProduct(product: Product): Product {
  if (resolveProductStatus(product) === 'ACTIVE') return product;

  const fallbackVariant = pickNearestAvailableVariant(product);
  if (!fallbackVariant) return product;

  return {
    ...product,
    name: fallbackVariant.sku?.trim() || product.name,
    price: fallbackVariant.price,
    stockQuantity: fallbackVariant.stockQuantity,
    media: fallbackVariant.media?.length ? fallbackVariant.media : product.media,
    isActive: true,
    status: 'ACTIVE',
  };
}

export function dedupeDisplayProducts(products: Product[]): Product[] {
  if (!products || products.length <= 1) return products;

  const byKey = new Map<string, Product>();
  for (const product of products) {
    const key = buildDisplayKey(product);
    const current = byKey.get(key);
    if (!current || productScore(product) > productScore(current)) {
      byKey.set(key, product);
    }
  }

  return Array.from(byKey.values()).map(toDisplayProduct);
}
