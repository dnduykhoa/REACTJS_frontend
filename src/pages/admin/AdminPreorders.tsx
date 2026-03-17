import { useEffect, useMemo, useState } from 'react';
import { preorderApi } from '../../api/j2ee';
import type { PreorderRequestResponse, PreorderRequestStatus } from '../../api/j2ee/types';
import { AlertCircle, BellRing, Clock3, Mail, PackageSearch, Search, UserRound } from 'lucide-react';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<PreorderRequestStatus, { label: string; cls: string }> = {
  WAITING: { label: 'Đang chờ', cls: 'bg-amber-100 text-amber-700' },
  NOTIFIED: { label: 'Đã báo hàng', cls: 'bg-emerald-100 text-emerald-700' },
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPreorders() {
  const [items, setItems] = useState<PreorderRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    setError('');
    preorderApi
      .getAllAdmin()
      .then((res) => setItems(res.data.data))
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(
          status === 403
            ? 'Bạn không có quyền truy cập danh sách chờ hàng.'
            : 'Không thể tải danh sách chờ hàng.'
        );
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      item.productName.toLowerCase().includes(keyword) ||
      item.customerName.toLowerCase().includes(keyword) ||
      item.phone.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword) ||
      (item.variantName || '').toLowerCase().includes(keyword)
    );
  }, [items, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const waitingCount = items.filter((item) => item.status === 'WAITING').length;
  const notifiedCount = items.filter((item) => item.status === 'NOTIFIED').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách chờ hàng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi khách đã đăng ký chờ sản phẩm hoặc biến thể chưa có hàng.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock3 className="h-4 w-4" />
            <span className="text-sm font-semibold">Đang chờ</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{waitingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <BellRing className="h-4 w-4" />
            <span className="text-sm font-semibold">Đã báo hàng</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{notifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <PackageSearch className="h-4 w-4" />
            <span className="text-sm font-semibold">Tổng yêu cầu</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm sản phẩm, khách hàng, email, số điện thoại..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Khách hàng</th>
                <th className="px-4 py-3 text-left font-semibold">Sản phẩm</th>
                <th className="px-4 py-3 text-left font-semibold">Số lượng</th>
                <th className="px-4 py-3 text-left font-semibold">Trạng thái</th>
                <th className="px-4 py-3 text-left font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Đang tải danh sách chờ hàng...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    Chưa có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 font-semibold text-slate-800">
                          <UserRound className="h-4 w-4 text-slate-400" />
                          {item.customerName}
                        </p>
                        <p className="text-slate-500">{item.phone}</p>
                        <p className="flex items-center gap-2 text-slate-500">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {item.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">{item.productName}</p>
                      {item.variantName && <p className="mt-1 text-slate-500">{item.variantName}</p>}
                      {item.queuePosition && item.status === 'WAITING' && (
                        <p className="mt-2 text-xs font-medium text-amber-700">Thứ tự chờ: {item.queuePosition}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">{item.desiredQuantity}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[item.status].cls}`}>
                        {STATUS_CONFIG[item.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      <p>Tạo: {formatDateTime(item.createdAt)}</p>
                      <p className="mt-1">Báo hàng: {formatDateTime(item.notifiedAt)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filtered.length > PAGE_SIZE && (
        <Pagination
          page={page}
          pageCount={Math.ceil(filtered.length / PAGE_SIZE)}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      )}
    </div>
  );
}