import { useRef, useState } from 'react';
import { Star, X, ImagePlus } from 'lucide-react';
import { reviewApi } from '../api/j2ee';
import { getApiErrorMessage } from '../api/j2ee';

interface ReviewModalProps {
  orderItemId: number;
  productName: string;
  productImageUrl?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';
const MAX_IMAGES = 5;
const MAX_SIZE_MB = 2;

export default function ReviewModal({
  orderItemId,
  productName,
  productImageUrl,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedImage = productImageUrl
    ? productImageUrl.startsWith('http')
      ? productImageUrl
      : `${BASE_URL}${productImageUrl}`
    : null;

  const STAR_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    const valid: File[] = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" không phải file ảnh.`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" vượt quá ${MAX_SIZE_MB}MB.`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length) {
      setImages((prev) => [...prev, ...valid]);
      setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
      if (!error) setError('');
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await reviewApi.submitReview({
        orderItemId,
        rating,
        comment: comment.trim() || undefined,
        images: images.length ? images : undefined,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Không thể gửi đánh giá. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-800 mb-4">Đánh giá sản phẩm</h2>

        {/* Product info */}
        <div className="flex items-center gap-3 mb-5">
          {resolvedImage ? (
            <img
              src={resolvedImage}
              alt={productName}
              className="w-14 h-14 rounded-xl border border-slate-100 object-contain p-1 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl border border-slate-100 bg-slate-50 shrink-0" />
          )}
          <p className="text-sm font-semibold text-slate-700 line-clamp-2">{productName}</p>
        </div>

        {/* Star rating */}
        <div className="flex flex-col items-center mb-5">
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => { setRating(star); setError(''); }}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    star <= (hovered || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200 fill-slate-200'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500 min-h-[20px]">
            {STAR_LABELS[hovered || rating]}
          </p>
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Nhận xét của bạn về sản phẩm (tuỳ chọn)..."
          rows={3}
          maxLength={1000}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />

        {/* Image upload */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Ảnh đính kèm</span>
            <span className="text-xs text-slate-400">{images.length}/{MAX_IMAGES} ảnh</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative w-16 h-16 shrink-0">
                <img
                  src={src}
                  alt={`ảnh ${i + 1}`}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors shrink-0"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Thêm</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1.5">
            Tối đa {MAX_IMAGES} ảnh, mỗi ảnh không quá {MAX_SIZE_MB}MB (jpg, png, webp...)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <p className="text-rose-500 text-xs mt-2">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Huỷ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>
  );
}
