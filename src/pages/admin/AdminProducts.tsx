import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/j2ee';
import type { Product, ProductStatus } from '../../api/j2ee/types';
import { Package, Plus, Search, Pencil, Trash2, RotateCcw, PackageX } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

type StatusTab = 'all' | 'active' | 'inactive' | 'out_of_stock';

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang bán' },
  { key: 'inactive', label: 'Ngưng bán' },
  { key: 'out_of_stock', label: 'Hết hàng' },
];

function getPrimaryImage(product: Product) {
  const m = product.media?.find((m) => m.isPrimary) || product.media?.[0];
  if (!m) return null;
  const url = m.mediaUrl;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url}`;
}

function getProductStatus(p: Product): ProductStatus {
  return p.status ?? (p.isActive ? 'ACTIVE' : 'INACTIVE');
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const cfg: Record<ProductStatus, { cls: string; label: string }> = {
    ACTIVE: { cls: 'bg-emerald-100 text-emerald-700', label: 'Đang bán' },
    INACTIVE: { cls: 'bg-slate-100 text-slate-500', label: 'Ngưng bán' },
    OUT_OF_STOCK: { cls: 'bg-amber-100 text-amber-700', label: 'Hết hàng' },
  };
  const { cls, label } = cfg[status];
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [actionId, setActionId] = useState<number | null>(null);

  const loadProducts = (t: StatusTab) => {
    setLoading(true);
    const req =
      t === 'active' ? productApi.getActive() :
      t === 'inactive' ? productApi.getInactive() :
      t === 'out_of_stock' ? productApi.getOutOfStock() :
      productApi.getAll();
    req.then((r) => setProducts(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(tab); }, [tab]);

  const handleTabChange = (t: StatusTab) => {
    setSearch('');
    setTab(t);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) { loadProducts(tab); return; }
    setLoading(true);
    productApi.search(search).then((r) => setProducts(r.data.data)).finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ngưng bán sản phẩm này? Sản phẩm sẽ chuyển sang trạng thái Ngưng bán.')) return;
    setActionId(id);
    try {
      await productApi.delete(id);
      loadProducts(tab);
    } catch {
      alert('Thao tác thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleRestore = async (id: number) => {
    setActionId(id);
    try {
      const res = await productApi.restore(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data.data : p)));
    } catch {
      alert('Khôi phục thất bại');
    } finally {
      setActionId(null);
    }
  };

  const handleOutOfStock = async (id: number) => {
    if (!confirm('Đánh dấu sản phẩm này là hết hàng?')) return;
    setActionId(id);
    try {
      const res = await productApi.outOfStock(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data.data : p)));
    } catch {
      alert('Thao tác thất bại');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sản phẩm</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} sản phẩm</p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Thêm sản phẩm
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên sản phẩm..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">Tìm</button>
        <button type="button" onClick={() => loadProducts(tab)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 border border-slate-200 transition">Xóa lọc</button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-14">Ảnh</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tên sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Thương hiệu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Giá</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Kho</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Package size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">Không có sản phẩm</p>
                  </td>
                </tr>
              )}
              {products.map((p, idx) => {
                const img = getPrimaryImage(p);
                const status = getProductStatus(p);
                const busy = actionId === p.id;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {img ? (
                        <img src={img} alt="" className="w-10 h-10 object-cover rounded-xl" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Package size={16} className="text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="line-clamp-1 font-medium text-slate-800">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{p.brand?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                      {Number(p.price).toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{p.stockQuantity}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={14} />
                        </Link>

                        {/* Hết hàng — chỉ khi đang bán */}
                        {status === 'ACTIVE' && (
                          <button
                            onClick={() => handleOutOfStock(p.id)}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                            title="Đánh dấu hết hàng"
                          >
                            <PackageX size={14} />
                          </button>
                        )}

                        {/* Khôi phục — khi ngưng bán hoặc hết hàng */}
                        {(status === 'INACTIVE' || status === 'OUT_OF_STOCK') && (
                          <button
                            onClick={() => handleRestore(p.id)}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            title="Khôi phục (Đang bán)"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}

                        {/* Ngưng bán — khi đang bán hoặc hết hàng (không áp dụng cho sản phẩm đã ngưng) */}
                        {status !== 'INACTIVE' && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                            title="Ngưng bán"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
