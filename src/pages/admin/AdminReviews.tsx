import React, { useEffect, useState, useCallback } from 'react';
import { getApiErrorMessage, reviewApi } from '../../api/j2ee';
import type { ReviewResponse } from '../../api/j2ee/types';
import { Star, Search, Trash2, MessageSquare, X, AlertTriangle, Eye, EyeOff, Reply, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [deletingId, setDeletingId]       = useState<number | null>(null);
  const [confirmId, setConfirmId]         = useState<number | null>(null);
  const [togglingId, setTogglingId]       = useState<number | null>(null);
  const [replyingId, setReplyingId]       = useState<number | null>(null);
  const [replyText, setReplyText]         = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess]   = useState<number | null>(null);
  const [replyFilter, setReplyFilter]     = useState<'all' | 'pending' | 'replied'>('all');
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  const toggleComment = (id: number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const DEFAULT_REPLIES = [
    'Cảm ơn bạn đã tin tưởng và đánh giá sản phẩm! Chúng tôi rất vui khi sản phẩm đáp ứng được kỳ vọng của bạn.',
    'Cảm ơn bạn đã dành thời gian chia sẻ trải nghiệm. Phản hồi của bạn giúp TechStore không ngừng cải thiện!',
    'Chúng tôi rất tiếc về trải nghiệm chưa tốt của bạn. Vui lòng liên hệ hotline để được hỗ trợ giải quyết sớm nhất.',
    'Chúc bạn trải nghiệm thật vui vẻ với sản phẩm! Hẹn gặp lại bạn tại TechStore.',
  ];

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

  const handleOpenReply = (review: ReviewResponse) => {
    setReplyingId(review.id);
    setReplyText(review.reply ?? '');
    setReplySuccess(null);
  };

  const handleSubmitReply = async (id: number) => {
    setSubmittingReply(true);
    try {
      const res = await reviewApi.adminReplyReview(id, replyText.trim());
      const updated = res.data.data;
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setReplySuccess(id);
      setTimeout(() => {
        setReplyingId(null);
        setReplySuccess(null);
      }, 1200);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Gửi phản hồi thất bại.'));
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (replyFilter === 'pending') return !r.reply;
    if (replyFilter === 'replied') return !!r.reply;
    return true;
  });
  const pendingCount = reviews.filter((r) => !r.reply).length;
  const repliedCount = reviews.filter((r) => !!r.reply).length;

  const totalPages = Math.ceil(filteredReviews.length / PAGE_SIZE);
  const paged = filteredReviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const visibleCount = reviews.filter((r) => !r.hidden).length;
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
              {pendingCount > 0 && (
                <span className="ml-2 text-rose-500 font-medium">
                  · {pendingCount} chưa phản hồi
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
      <div className="flex flex-col gap-3">
        {/* Reply filter tabs */}
        <div className="flex gap-2">
          {([
            { key: 'all',     label: 'Tất cả',         count: reviews.length },
            { key: 'pending', label: 'Chưa phản hồi',  count: pendingCount },
            { key: 'replied', label: 'Đã phản hồi',    count: repliedCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => { setReplyFilter(key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                replyFilter === key
                  ? key === 'pending'
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : key === 'replied'
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-slate-700 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                replyFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
            </button>
          ))}
        </div>

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
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3">Phản hồi</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paged.map((review, idx) => {
                  const isHidden = review.hidden;
                  return (
                    <React.Fragment key={review.id}>
                    <tr
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
                      <td className="px-3 py-3.5 max-w-[260px]">
                        {isHidden && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-medium mb-1">
                            <EyeOff className="w-3 h-3" />
                            Đang ẩn
                          </span>
                        )}
                        {review.comment ? (() => {
                          const isLong = review.comment.length > 80;
                          const isExpanded = expandedComments.has(review.id);
                          return (
                            <div>
                              <p className={`text-xs leading-relaxed ${isHidden ? 'text-slate-400' : 'text-slate-600'} ${isLong && !isExpanded ? 'line-clamp-2' : ''}`}>
                                {review.comment}
                              </p>
                              {isLong && (
                                <button
                                  onClick={() => toggleComment(review.id)}
                                  className="flex items-center gap-0.5 mt-1 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium"
                                >
                                  {isExpanded ? <><ChevronUp className="w-3 h-3" /> Thu gọn</> : <><ChevronDown className="w-3 h-3" /> Xem thêm</>}
                                </button>
                              )}
                            </div>
                          );
                        })() : (
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
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
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
                      {/* Reply button */}
                      <td className="px-3 py-3.5 text-center">
                        {review.reply ? (
                          <button
                            onClick={() => replyingId === review.id ? setReplyingId(null) : handleOpenReply(review)}
                            title="Xem / sửa phản hồi"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors whitespace-nowrap"
                          >
                            <Reply className="w-3 h-3" />
                            Đã phản hồi
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReply(review)}
                            title="Trả lời đánh giá"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-400 border border-dashed border-slate-300 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                          >
                            <Reply className="w-3 h-3" />
                            Phản hồi
                          </button>
                        )}
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
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Xóa đánh giá"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Reply expanded row */}
                    {replyingId === review.id && (
                      <tr className="bg-indigo-50/30 border-t border-b border-indigo-100">
                        <td colSpan={9} className="px-6 py-5">
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                                <Reply className="w-4 h-4" />
                                {review.reply ? 'Sửa phản hồi' : 'Viết phản hồi'}
                                <span className="text-slate-400 font-normal">·</span>
                                <span className="text-xs font-normal text-slate-500">{review.productName} — {review.username}</span>
                              </p>
                              <button onClick={() => setReplyingId(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Template chips */}
                            <div>
                              <p className="text-xs text-slate-400 mb-2 font-medium">Mẫu câu nhanh:</p>
                              <div className="flex flex-wrap gap-2">
                                {DEFAULT_REPLIES.map((t, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setReplyText(t)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors max-w-[320px] truncate ${
                                      replyText === t
                                        ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-semibold'
                                        : 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400'
                                    }`}
                                    title={t}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {/* Textarea */}
                            <textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={review.reply ? 'Sửa nội dung phản hồi... (để trống để xóa phản hồi)' : 'Nhập phản hồi của TechStore...'}
                              className="w-full px-3 py-2.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white resize-none leading-relaxed"
                            />
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSubmitReply(review.id)}
                                disabled={submittingReply}
                                className={`flex items-center gap-1.5 px-5 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors ${
                                  !replyText.trim() && review.reply
                                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                {replySuccess === review.id ? (
                                  <><CheckCircle2 className="w-4 h-4" /> Đã lưu!</>
                                ) : submittingReply ? (
                                  <><div className="w-3.5 h-3.5 border border-indigo-300 border-t-white rounded-full animate-spin" /> Đang gửi...</>
                                ) : !replyText.trim() && review.reply ? (
                                  <><Trash2 className="w-4 h-4" /> Xóa phản hồi</>
                                ) : (
                                  <><Reply className="w-4 h-4" /> Gửi phản hồi</>
                                )}
                              </button>
                              <button
                                onClick={() => setReplyingId(null)}
                                className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                              >
                                Đóng
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-slate-100">
                <Pagination
                  page={page}
                  total={totalPages}
                  onChange={setPage}
                  pageCount={totalPages}
                  pageSize={PAGE_SIZE}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
