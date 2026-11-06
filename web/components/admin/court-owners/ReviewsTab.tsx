import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { fetchOwnerReviews } from '../../../services/adminCourtOwners';
import type { OwnerReview, Paged } from '../../../services/adminCourtOwners';
import TablePagination, { type TablePageSize } from '../shared/TablePagination';
import { formatUserDate } from '../users/userDisplay';

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={14}
        className={index < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
      />
    ))}
  </span>
);

const ReviewsTab: React.FC<{ ownerId: string; averageRating: number | null; reviewCount: number }> = ({
  ownerId,
  averageRating,
  reviewCount,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(10);
  const [result, setResult] = useState<Paged<OwnerReview>>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const next = await fetchOwnerReviews(ownerId, page, pageSize);
      if (id !== requestId.current) return;
      setResult(next);
      setError(null);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err.message || 'Failed to load reviews');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [ownerId, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex items-center gap-6">
        <p className="text-5xl font-black text-slate-900 tracking-tighter">
          {averageRating != null ? averageRating.toFixed(1) : '—'}
        </p>
        <div>
          <Stars rating={averageRating ?? 0} />
          <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
            {reviewCount} review{reviewCount === 1 ? '' : 's'} across all courts
          </p>
        </div>
      </div>

      <div className={`bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden ${isLoading ? 'opacity-80' : ''}`}>
        {result.items.length === 0 ? (
          <p className="px-8 py-16 text-center text-sm font-medium text-slate-400">
            {isLoading ? 'Loading reviews...' : error || 'No reviews yet for this owner\'s courts.'}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.items.map((review) => (
              <li key={review.id} className="px-8 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{review.playerName}</p>
                    <p className="text-[11px] font-medium text-slate-400">
                      {review.courtName} · {formatUserDate(review.createdAt)}
                    </p>
                  </div>
                  <Stars rating={review.rating} />
                </div>
                {review.comment ? <p className="mt-3 text-sm font-medium text-slate-600">{review.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          isLoading={isLoading}
          noun="reviews"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};

export default ReviewsTab;
