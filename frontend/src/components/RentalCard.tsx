import { memo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { MapPin, Calendar, Coins, Heart, Star } from "lucide-react";
import { EthAmount } from "./EthAmount";
import { resolveIPFS, fetchMetadata } from "../lib/ipfs";
import type { Rental, PropertyMetadata } from "../lib/types";
import type { ListingMeta } from "../pages/ListingsPage";
import { useFavourites } from "../hooks/useFavourites";
import { createClient } from "../lib/supabase";

const STATE_CONFIG = [
  { label: "Available", color: "bg-surface text-text border border-border" },
  { label: "Booked", color: "bg-accent/20 text-accent border border-accent/30" },
  { label: "Active", color: "bg-accent2/20 text-accent2 border border-accent2/30" },
  { label: "Completed", color: "bg-green-500/20 text-green-400 border border-green-500/30" },
  { label: "Cancelled", color: "bg-danger/20 text-danger border border-danger/30" },
  { label: "Disputed", color: "bg-warning/20 text-warning border border-warning/30" },
];

interface RentalCardProps {
  rental: Rental;
  /** Pre-fetched Supabase metadata (passed from parent to avoid N+1 queries) */
  meta: ListingMeta | null;
  /** When true renders a horizontal list row instead of a vertical card */
  listMode?: boolean;
}

export const RentalCard = memo(function RentalCard({ rental, meta, listMode = false }: RentalCardProps) {
  const rentalId = Number(rental.id);
  const [ipfsMeta, setIpfsMeta] = useState<PropertyMetadata | null>(null);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const { toggle, isFav } = useFavourites();
  const fav = isFav(rentalId);

  useEffect(() => {
    if (!meta && rental.ipfsCID) {
      let isMounted = true;
      fetchMetadata(rental.ipfsCID).then((data) => {
        if (isMounted) setIpfsMeta(data);
      });
      return () => { isMounted = false; };
    }
  }, [meta, rental.ipfsCID]);

  // Fetch avg rating from Supabase (cheap aggregate)
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("reviews")
      .select("rating")
      .eq("rental_id", rentalId)
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;
        const avg = data.reduce((acc: number, r: any) => acc + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
        setReviewCount(data.length);
      });
    return () => { cancelled = true; };
  }, [rentalId]);

  const stateInfo = STATE_CONFIG[Number(rental.state)] ?? STATE_CONFIG[0];
  const startDate = new Date(Number(rental.startTimestamp) * 1000);
  const endDate = new Date(Number(rental.endTimestamp) * 1000);
  const nights = Math.ceil((Number(rental.endTimestamp) - Number(rental.startTimestamp)) / 86400);

  const imageUrl = meta?.image_cid
    ? resolveIPFS(meta.image_cid)
    : ipfsMeta?.imageCID
    ? resolveIPFS(ipfsMeta.imageCID)
    : null;

  const title = meta?.title ?? ipfsMeta?.name ?? `Property #${rentalId}`;
  const location = [meta?.city, meta?.country].filter(Boolean).join(", ");

  // ──────────────────────────── LIST MODE ──────────────────────────────────────
  if (listMode) {
    return (
      <div className="glass-card flex flex-row group h-36 overflow-hidden">
        {/* Thumbnail */}
        <div className="w-44 flex-shrink-0 relative overflow-hidden rounded-l-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-border/50 flex items-center justify-center">
              <span className="text-3xl opacity-30">🏠</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/30" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`badge ${stateInfo.color} text-[10px]`}>{stateInfo.label}</span>
                {avgRating !== null && (
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={11} className="fill-yellow-400" />
                    <span className="font-bold">{avgRating}</span>
                    <span className="text-muted">({reviewCount})</span>
                  </div>
                )}
              </div>
              <h3 className="font-display font-bold truncate">{title}</h3>
              {location && (
                <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                  <MapPin size={10} />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); toggle(rentalId); }}
              className="p-1.5 rounded-lg hover:bg-surface transition-colors flex-shrink-0"
            >
              <Heart
                size={16}
                className={`transition-colors ${fav ? "fill-red-500 text-red-500" : "text-muted"}`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="flex items-center gap-1">
                <Calendar size={10} />
                <span>{format(startDate, "MMM d")} → {format(endDate, "MMM d")}</span>
              </div>
              <span>{nights}n</span>
            </div>
            <div className="flex items-center gap-4">
              <EthAmount weiAmount={rental.rentAmount} className="text-accent2 text-sm font-bold" />
              <Link
                to={`/listings/${rental.id}`}
                className="text-xs font-bold text-accent hover:text-accent/80 transition-colors"
              >
                View →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────── GRID MODE ──────────────────────────────────────
  return (
    <div className="glass-card flex flex-col h-full group">
      {/* Image */}
      <div className="h-52 relative overflow-hidden rounded-t-xl flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-border/50 animate-pulse flex items-center justify-center">
            <span className="text-3xl opacity-30">🏠</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

        {/* State badge */}
        <div className="absolute top-3 left-3">
          <span className={`badge backdrop-blur-md ${stateInfo.color}`}>
            {stateInfo.label}
          </span>
        </div>

        {/* Fav + Night count */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={(e) => { e.preventDefault(); toggle(rentalId); }}
            className="p-1.5 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-colors"
            title={fav ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              size={14}
              className={`transition-all duration-200 ${fav ? "fill-red-500 text-red-500 scale-110" : "text-white"}`}
            />
          </button>
          {nights > 0 && (
            <span className="badge bg-black/50 text-white backdrop-blur-md border-0">
              {nights}n
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display text-lg font-bold truncate">{title}</h3>
        </div>

        {/* Rating */}
        {avgRating !== null ? (
          <div className="flex items-center gap-1.5 text-xs mb-2">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-yellow-400">{avgRating}</span>
            <span className="text-muted">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
          </div>
        ) : (
          <p className="text-xs text-muted mb-2">No reviews yet</p>
        )}

        {location && (
          <div className="flex items-center gap-1 text-xs text-muted mb-3">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted mb-4">
          <Calendar size={11} className="flex-shrink-0" />
          <span>
            {format(startDate, "MMM d")} → {format(endDate, "MMM d, yyyy")}
          </span>
        </div>

        {/* Pricing */}
        <div className="mt-auto pt-3 border-t border-border/50 flex justify-between items-end">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <Coins size={9} />Rent
            </p>
            <EthAmount weiAmount={rental.rentAmount} className="text-accent2" />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted uppercase tracking-widest mb-0.5">Deposit</p>
            <EthAmount weiAmount={rental.depositAmount} />
          </div>
        </div>
      </div>

      <Link
        to={`/listings/${rental.id}`}
        className="block p-3.5 border-t border-border/50 bg-accent/5 hover:bg-accent/15 transition-colors text-center text-sm font-semibold text-accent rounded-b-xl"
      >
        View Escrow Details →
      </Link>
    </div>
  );
});
