import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { createClient, normalizeAddress } from "../lib/supabase";

interface Review {
  id: string;
  reviewer_addr: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface ReviewsSectionProps {
  rentalId: number;
  /** Only completed rentals where the connected wallet is the tenant can submit */
  canReview: boolean;
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = readonly ? n <= value : n <= (hovered || value);
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => !readonly && setHovered(n)}
            onMouseLeave={() => !readonly && setHovered(0)}
            className={readonly ? "cursor-default" : "cursor-pointer"}
          >
            <Star
              size={size}
              className={`transition-colors ${
                filled ? "text-yellow-400 fill-yellow-400" : "text-border"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ReviewsSection({ rentalId, canReview }: ReviewsSectionProps) {
  const { address } = useAccount();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reviews")
        .select("id, reviewer_addr, rating, comment, created_at")
        .eq("rental_id", rentalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews(data ?? []);

      if (address) {
        const normalizedAddr = normalizeAddress(address);
        setHasReviewed(
          (data ?? []).some(
            (r) => r.reviewer_addr.toLowerCase() === normalizedAddr.toLowerCase()
          )
        );
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setIsLoading(false);
    }
  }, [rentalId, address]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reviews").insert({
        rental_id: rentalId,
        reviewer_addr: normalizeAddress(address),
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      setComment("");
      setRating(5);
      await loadReviews();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold flex items-center gap-2">
          <MessageSquare size={20} className="text-accent" />
          Reviews
          {reviews.length > 0 && (
            <span className="text-muted text-sm font-normal ml-1">
              ({reviews.length})
            </span>
          )}
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(avgRating)} readonly size={16} />
            <span className="font-bold text-sm">
              {avgRating.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Submit Form */}
      {canReview && !hasReviewed && (
        <form
          onSubmit={handleSubmit}
          className="border border-border rounded-xl p-4 space-y-3 bg-surface/50"
        >
          <p className="text-xs font-bold text-muted uppercase tracking-widest">
            Leave a Review
          </p>
          <StarRating value={rating} onChange={setRating} />
          <textarea
            rows={3}
            className="input-field resize-none text-sm"
            placeholder="Share your experience with this property..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {submitError && (
            <p className="text-xs text-danger">{submitError}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary py-2 text-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Star size={14} />
            )}
            Submit Review
          </button>
        </form>
      )}

      {hasReviewed && (
        <div className="text-xs text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
          ✓ You have already reviewed this property.
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-muted" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">
          No reviews yet. Be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="border border-border rounded-xl p-4 space-y-2 bg-surface/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    {r.reviewer_addr.slice(2, 4).toUpperCase()}
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {shortenAddr(r.reviewer_addr)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} readonly size={13} />
                  <span className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {r.comment && (
                <p className="text-sm text-gray-300 leading-relaxed pl-9">
                  {r.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
