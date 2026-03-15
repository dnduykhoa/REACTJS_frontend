import type { Product } from '../api/j2ee/types';

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

  return Array.from(byKey.values());
}
