import { useEffect, useState, useCallback } from 'react';
import { getApiErrorMessage, reviewApi } from '../../api/j2ee';
import type { ReviewResponse } from '../../api/j2ee/types';
import { Star, Search, Trash2, MessageSquare, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 12;

const RATING_TABS = [
  { key: 0, label: 'Tất cả' },
  { key: 5, label: '5 sao'  },
  { key: 4, label: '4 sao'  },
  { key: 3, label: '3 sao'  },
  { key: 2, label: '2 sao'  },
  { key: 1, label: '1 sao'  },
];

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function StarDisplay({ rating, dim }: { rating: number; dim?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${dim ? 'fill-slate-300 text-slate-300' : s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
        />
      ))}
      <span className={`ml-1 text-xs font-semibold ${dim ? 'text-slate-400' : 'text-slate-600'}`}>{rating}</span>
    </div>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews]           = useState<ReviewResponse[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [keyword, setKeyword]           = useState('');
  const [inputValue, setInputValue]     = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page, setPage]                 = useState(1);
  const [deletingId, setDeletingId]     = useState<number | null>(null);
  const [confirmId, setConfirmId]       = useState<number | null>(null);
  const [togglingId, setTogglingId]     = useState<number | null>(null);

  const fetchReviews = useCallback(() => {
    setLoading(true);
    setError('');
    reviewApi.adminGetAllReviews({
      keyword: keyword || undefined,
      rating:  ratingFilter || undefined,
    })
      .then((res) => setReviews(res.data.data ?? []))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Không thể tải danh sách đánh giá.')))
      .finally(() => setLoading(false));
  }, [keyword, ratingFilter]);

  useEffect(() => {
    setPage(1);
    fetchReviews();
  }, [fetchReviews]);

  const handleSearch = () => setKeyword(inputValue.trim());

  const handleToggleHidden = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await reviewApi.adminToggleHidden(id);
      const updated = res.data.data;
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Thao tác thất bại.'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await reviewApi.adminDeleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setConfirmId(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Xóa đánh giá thất bại.'));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const paged = reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const visibleCount = reviews.filter((r) => !r.hidden).length;
  const hiddenCount  = reviews.filter((r) => r.hidden).length;
  const avg = visibleCount
    ? (reviews.filter((r) => !r.hidden).reduce((s, r) => s + r.rating, 0) / visibleCount).toFixed(1)
    : '—';
  const countByRating = [5, 4, 3, 2, 1].map((r) => ({
    r,
    count: reviews.filter((rv) => rv.rating === r && !rv.hidden).length,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quản lý đánh giá</h1>
          {!loading && (
            <p className="text-sm text-slate-500 mt-0.5">
              {reviews.length} đánh giá
              {hiddenCount > 0 && (
                <span className="ml-2 text-slate-400">
                  · <span className="text-amber-600">{hiddenCount} đang ẩn</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {!loading && reviews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="col-span-2 sm:col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-2xl font-bold text-slate-800">{avg}</span>
            </div>
            <p className="text-xs text-slate-500">Trung bình</p>
          </div>
          {countByRating.map(({ r, count }) => (
            <div
              key={r}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col items-center justify-center cursor-pointer hover:border-amber-300 transition-colors"
              onClick={() => { setRatingFilter(ratingFilter === r ? 0 : r); setPage(1); }}
            >
              <div className="flex items-center gap-0.5 mb-1">
                {Array.from({ length: r }, (_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-lg font-bold text-slate-800">{count}</span>
              <p className="text-[11px] text-slate-400">hiển thị</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc khách hàng..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white"
            />
          </div>
          {inputValue && (
            <button
              onClick={() => { setInputValue(''); setKeyword(''); }}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shrink-0"
          >
            Tìm
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
          {RATING_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setRatingFilter(key); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                ratingFilter === key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {key > 0 ? (
                <span className="flex items-center gap-1">
                  <Star className={`w-3 h-3 ${ratingFilter === key ? 'fill-amber-400 text-amber-400' : 'fill-slate-400 text-slate-400'}`} />
                  {key}
                </span>
              ) : label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 text-slate-200" />
            <p className="text-sm">Không có đánh giá nào</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 w-6">#</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3">Sản phẩm</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3">Khách hàng</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3">Đánh giá</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3">Nhận xét</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3">Ngày</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3">Ẩn/Hiện</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paged.map((review, idx) => {
                  const isHidden = review.hidden;
                  return (
                    <tr
                      key={review.id}
                      className={`transition-colors group ${isHidden ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-3 py-3.5 max-w-[180px]">
                        <p className={`font-medium truncate ${isHidden ? 'text-slate-400' : 'text-slate-700'}`} title={review.productName}>
                          {review.productName}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className={`whitespace-nowrap ${isHidden ? 'text-slate-400' : 'text-slate-600'}`}>
                          {review.username}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <StarDisplay rating={review.rating} dim={isHidden} />
                      </td>
                      <td className="px-3 py-3.5 max-w-[240px]">
                        {isHidden && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium mb-1">
                            <EyeOff className="w-3 h-3" />
                            Đang ẩn
                          </span>
                        )}
                        {review.comment ? (
                          <p className={`text-xs line-clamp-2 leading-relaxed ${isHidden ? 'text-slate-400' : 'text-slate-600'}`} title={review.comment}>
                            {review.comment}
                          </p>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Không có nhận xét</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {fmtDate(review.createdAt)}
                      </td>
                      {/* Toggle hidden button */}
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleHidden(review.id)}
                          disabled={togglingId === review.id}
                          title={isHidden ? 'Hiện đánh giá này' : 'Ẩn đánh giá này'}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            isHidden
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {togglingId === review.id ? (
                            <div className="w-4 h-4 border border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                          ) : isHidden ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      {/* Delete button */}
                      <td className="px-3 py-3.5 text-center">
                        {confirmId === review.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDelete(review.id)}
                              disabled={deletingId === review.id}
                              className="text-[11px] px-2 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 font-medium"
                            >
                              {deletingId === review.id ? '...' : 'Xác nhận'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
                            >
                              Huỷ
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(review.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa đánh giá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
