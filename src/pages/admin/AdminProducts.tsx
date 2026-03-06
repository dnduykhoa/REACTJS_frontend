import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/j2ee';
import type { Product } from '../../api/j2ee/types';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';

function getPrimaryImage(product: Product) {
  const m = product.media?.find((m) => m.isPrimary) || product.media?.[0];
  if (!m) return null;
  return m.mediaUrl.startsWith('http') ? m.mediaUrl : `${BASE_URL}/uploads/${m.mediaUrl}`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    productApi.getAll().then((r) => setProducts(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) { load(); return; }
    setLoading(true);
    productApi.search(search).then((r) => setProducts(r.data.data)).finally(() => setLoading(false));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    setDeleting(id);
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (product: Product) => {
    try {
      const res = await productApi.toggleActive(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? res.data.data : p)));
    } catch {
      alert('Thao tác thất bại');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-800">Quản lý sản phẩm</h2>
        <Link
          to="/admin/products/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Thêm sản phẩm
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-gray-100 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
          Tìm
        </button>
        <button type="button" onClick={load} className="px-4 py-2 text-sm text-gray-500 hover:text-blue-600">
          Xóa lọc
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left w-14">Ảnh</th>
                <th className="px-4 py-3 text-left">Tên sản phẩm</th>
                <th className="px-4 py-3 text-left">Danh mục</th>
                <th className="px-4 py-3 text-left">Thương hiệu</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-4 py-3 text-center">Kho</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Không có sản phẩm
                  </td>
                </tr>
              )}
              {products.map((p, idx) => {
                const img = getPrimaryImage(p);
                return (
                  <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2">
                      {img ? (
                        <img src={img} alt="" className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300">
                          📷
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 max-w-xs">
                      <span className="line-clamp-1">{p.name}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.category?.name || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{p.brand?.name || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-blue-600">
                      {Number(p.price).toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-4 py-2 text-center">{p.stockQuantity}</td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleToggle(p)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.isActive ? 'Hiển thị' : 'Ẩn'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}
                          className="text-red-500 hover:underline text-xs disabled:opacity-50"
                        >
                          Xóa
                        </button>
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
