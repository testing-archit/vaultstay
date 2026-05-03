import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, Wand2, Loader2, LayoutGrid, List, Heart } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { RentalCard } from "../components/RentalCard";
import { useAllListings } from "../hooks/useVaultStay";
import { createClient } from "../lib/supabase";
import { magicSearch } from "../lib/gemini";
import { useFavourites } from "../hooks/useFavourites";

const FILTER_OPTIONS = ["ALL", "CREATED", "BOOKED", "ACTIVE", "COMPLETED"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

export interface ListingMeta {
  rental_id: number;
  title: string;
  city: string | null;
  country: string | null;
  image_cid: string | null;
}

export default function ListingsPage() {
  const { data: listings, isLoading } = useAllListings();
  const [filter, setFilter] = useState<FilterOption>("ALL");
  const [search, setSearch] = useState("");
  const [magicMatchIds, setMagicMatchIds] = useState<number[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFavOnly, setShowFavOnly] = useState(false);
  // Single batch fetch of all metadata — avoids N+1 per-card queries
  const [metaMap, setMetaMap] = useState<Record<number, ListingMeta>>({});
  const { isFav, count: favCount } = useFavourites();

  const handleMagicSearch = async () => {
    if (!search.trim()) {
      setMagicMatchIds(null);
      return;
    }
    setIsSearching(true);
    try {
      const listingsData = JSON.stringify(
        Object.values(metaMap).map(m => ({
          id: m.rental_id,
          title: m.title,
          location: `${m.city}, ${m.country}`
        }))
      );
      const matchIds = await magicSearch(search, listingsData);
      setMagicMatchIds(matchIds);
    } catch (err) {
      console.error(err);
      setMagicMatchIds(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setMagicMatchIds(null);
  };

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("listings_metadata")
      .select("rental_id, title, city, country, image_cid")
      .then((res: any) => {
        const { data, error } = res;
        if (cancelled) return;
        if (error) {
          console.warn("[VaultStay] Could not load listing metadata from Supabase:", error.message);
          return;
        }
        if (!data) return;
        const map: Record<number, ListingMeta> = {};
        data.forEach((row: any) => { map[row.rental_id] = row; });
        setMetaMap(map);
      });
    return () => { cancelled = true; };
  }, []);

  const allListings = listings ?? [];

  const filteredListings = useMemo(() => {
    return allListings.filter((listing) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "CREATED" && listing.state === 0) ||
        (filter === "BOOKED" && listing.state === 1) ||
        (filter === "ACTIVE" && listing.state === 2) ||
        (filter === "COMPLETED" && listing.state === 3);

      const term = search.toLowerCase();
      const meta = metaMap[Number(listing.id)];
      const title = (meta?.title ?? "").toLowerCase();

      let matchesSearch = true;
      if (magicMatchIds !== null) {
        matchesSearch = magicMatchIds.includes(Number(listing.id));
      } else if (term) {
        matchesSearch = title.includes(term) || listing.ipfsCID.toLowerCase().includes(term);
      }

      const matchesFav = !showFavOnly || isFav(Number(listing.id));

      return matchesFilter && matchesSearch && matchesFav;
    });
  }, [allListings, filter, search, metaMap, showFavOnly, isFav]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Explore Escrows</h1>
            <p className="text-muted">
              {allListings.length > 0
                ? `${allListings.length} smart-contract rental${allListings.length !== 1 ? "s" : ""} on-chain`
                : "Browse decentralized smart-contract rentals."}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  id="search-listings"
                  placeholder="E.g. 'Beachfront in Malibu'"
                  className="input-field pl-9 py-2.5 text-sm w-full"
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleMagicSearch()}
                />
              </div>
              <button
                onClick={handleMagicSearch}
                disabled={isSearching || !search.trim()}
                className="bg-accent text-white p-2.5 rounded-lg hover:bg-accent2 disabled:opacity-50 transition-colors flex-shrink-0 flex items-center gap-1 shadow-md"
                title="AI Magic Search"
              >
                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              </button>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-surface border border-border rounded-xl p-1 gap-1">
              <button
                id="view-grid"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                id="view-list"
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-accent text-white" : "text-muted hover:text-text"}`}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border w-fit">
              <SlidersHorizontal size={13} className="text-muted ml-2 mr-1 flex-shrink-0" />
              {/* Favourites filter */}
              <button
                onClick={() => setShowFavOnly((v) => !v)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  showFavOnly
                    ? "bg-red-500/80 text-white shadow-sm"
                    : "text-muted hover:text-text hover:bg-border/50"
                }`}
                title="Show favourites only"
              >
                <Heart size={11} className={showFavOnly ? "fill-white" : ""} />
                {favCount > 0 && <span>{favCount}</span>}
              </button>
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                    filter === f
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted hover:text-text hover:bg-border/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active filter hints */}
        {(magicMatchIds !== null || showFavOnly) && (
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {magicMatchIds !== null && (
              <div className="flex items-center gap-2 text-xs bg-accent/10 text-accent border border-accent/20 px-3 py-1.5 rounded-full">
                <Wand2 size={12} />
                AI matched {magicMatchIds.length} result{magicMatchIds.length !== 1 ? "s" : ""} for "{search}"
                <button onClick={() => { setMagicMatchIds(null); setSearch(""); }} className="ml-1 hover:text-white">✕</button>
              </div>
            )}
            {showFavOnly && (
              <div className="flex items-center gap-2 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full">
                <Heart size={12} className="fill-red-400" />
                Showing {favCount} favourite{favCount !== 1 ? "s" : ""}
                <button onClick={() => setShowFavOnly(false)} className="ml-1 hover:text-white">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Grid / List */}
        {isLoading ? (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            : "flex flex-col gap-3"
          }>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`glass-panel animate-pulse bg-surface/30 ${viewMode === "grid" ? "h-96" : "h-36"}`} />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center border border-dashed border-border rounded-2xl">
            <span className="text-5xl mb-4">{showFavOnly ? "💔" : "🏜️"}</span>
            <h3 className="text-xl font-display font-bold mb-2">
              {showFavOnly ? "No favourites saved" : "No properties found"}
            </h3>
            <p className="text-muted mb-8 max-w-sm">
              {showFavOnly
                ? "Click the ❤️ on any listing to save it here."
                : search
                ? `No listings match "${search}". Try a different search term.`
                : "There are currently no listings matching your filter."}
            </p>
            {!showFavOnly && (
              <Link to="/create" className="btn-primary flex items-center gap-2">
                Create the First Listing
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted mb-4">
              Showing {filteredListings.length} of {allListings.length} listings
            </p>
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              : "flex flex-col gap-3"
            }>
              {filteredListings.map((rental) => (
                <RentalCard
                  key={rental.id.toString()}
                  rental={rental}
                  meta={metaMap[Number(rental.id)] ?? null}
                  listMode={viewMode === "list"}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
