export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function buildProductSlug(product: { id: number; name: string }): string {
  const base = slugifyProductName(product.name) || 'product';
  return `${base}-${product.id}`;
}

export function getProductDetailPath(product: { id: number; name: string }): string {
  return `/products/${buildProductSlug(product)}`;
}

export function extractProductIdFromSlug(slug?: string): number | null {
  if (!slug) return null;
  if (/^\d+$/.test(slug)) return Number(slug);
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}