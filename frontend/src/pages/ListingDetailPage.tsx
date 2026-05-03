import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Bed, Bath, Users, MapPin, Wand2, Loader2, Shield, History, ExternalLink } from "lucide-react";
import { useListing, useRentalEvents } from "../hooks/useVaultStay";
import { Navbar } from "../components/Navbar";
import { EthAmount } from "../components/EthAmount";
import { IPFSImage } from "../components/IPFSImage";
import { AddressDisplay } from "../components/AddressDisplay";
import { StateMachineProgress } from "../components/StateMachineProgress";
import { ActionPanel } from "../components/ActionPanel";
import { fetchMetadata } from "../lib/ipfs";
import { createClient } from "../lib/supabase";
import type { PropertyMetadata } from "../lib/types";
import { AIAssistant } from "../components/AIAssistant";
import { explainEscrow, getLandlordTrustScore } from "../lib/gemini";
import { ReviewsSection } from "../components/ReviewsSection";
import { useAccount } from "wagmi";

interface SupabaseMeta {
  title: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  amenities: string[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  image_cid: string | null;
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const parsedId = Number(id);
  const listingId = Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;

  const { data: rental, isLoading, refetch } = useListing(listingId ?? undefined);
  const { data: events } = useRentalEvents(listingId ?? undefined);
  const [metadata, setMetadata] = useState<PropertyMetadata | null>(null);
  const [supabaseMeta, setSupabaseMeta] = useState<SupabaseMeta | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [isScoring, setIsScoring] = useState(false);
  const [trustScore, setTrustScore] = useState<{score: number; analysis: string} | null>(null);

  const handleTrustScore = async () => {
    if (!rental) return;
    setIsScoring(true);
    try {
      // Mocking past activity based on the current rental for demonstration
      const mockHistory = JSON.stringify([{ id: rental.id.toString(), state: rental.state, rent: rental.rentAmount.toString() }]);
      const scoreData = await getLandlordTrustScore(rental.landlord, mockHistory);
      setTrustScore(scoreData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScoring(false);
    }
  };

  const handleExplainEscrow = async () => {
    if (!rental) return;
    setIsExplaining(true);
    try {
      const escrowContext = JSON.stringify({
        state: ["CREATED (Waiting for tenant)", "FUNDED (Tenant deposited)", "ACTIVE (Tenant checked in)", "COMPLETED (Funds released)"][rental.state],
        rent_wei: rental.rentAmount.toString(),
        deposit_wei: rental.depositAmount.toString(),
        landlord: rental.landlord,
        tenant: rental.tenant,
      }, null, 2);
      const text = await explainEscrow(escrowContext);
      setExplanation(text);
    } catch (err) {
      console.error(err);
      setExplanation("Could not load AI explanation.");
    } finally {
      setIsExplaining(false);
    }
  };

  useEffect(() => {
    if (!listingId) return;
    setSupabaseMeta(null); // Clear stale meta from previous listing
    let cancelled = false;
    createClient()
      .from("listings_metadata")
      .select("title, description, city, country, amenities, bedrooms, bathrooms, max_guests, image_cid")
      .eq("rental_id", listingId)
      .maybeSingle()
      .then((res: any) => {
        const { data, error } = res;
        if (cancelled) return;
        if (error) {
          console.warn("[VaultStay] Could not load listing metadata from Supabase:", error.message);
          return;
        }
        if (data) setSupabaseMeta(data);
      });
    return () => { cancelled = true; };
  }, [listingId]);

  const ipfsCID = rental?.ipfsCID;
  useEffect(() => {
    if (!ipfsCID) { setMetadata(null); return; }
    let isMounted = true;
    fetchMetadata(ipfsCID).then((data) => { if (isMounted) setMetadata(data); });
    return () => { isMounted = false; };
  }, [ipfsCID]);

  if (isLoading || listingId === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent" />
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="text-5xl">🔍</span>
          <h2 className="text-2xl font-display font-bold">Listing Not Found</h2>
          <Link to="/listings" className="text-accent hover:underline flex items-center gap-1">
            <ArrowLeft size={16} /> Return to browse
          </Link>
        </div>
      </div>
    );
  }

  const startDate = new Date(Number(rental.startTimestamp) * 1000);
  const endDate = new Date(Number(rental.endTimestamp) * 1000);
  const nights = Math.ceil((Number(rental.endTimestamp) - Number(rental.startTimestamp)) / 86400);
  const totalWei = rental.rentAmount + rental.depositAmount;

  const supabaseImageCid = supabaseMeta?.image_cid;
  const images: string[] = metadata?.images?.length
    ? metadata.images
    : (supabaseImageCid ? [supabaseImageCid] : []);

  const displayTitle = metadata?.name ?? supabaseMeta?.title ?? (rental.ipfsCID ? `Property #${rental.id}` : "Unnamed Property");
  const displayDesc = metadata?.description ?? supabaseMeta?.description ?? "";
  const location = [supabaseMeta?.city, supabaseMeta?.country].filter(Boolean).join(", ");

  const nextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  const propertyContext = JSON.stringify({
    title: displayTitle,
    description: displayDesc,
    location,
    amenities: supabaseMeta?.amenities,
    bedrooms: supabaseMeta?.bedrooms,
    bathrooms: supabaseMeta?.bathrooms,
    max_guests: supabaseMeta?.max_guests,
    rent_wei: rental.rentAmount.toString(),
    deposit_wei: rental.depositAmount.toString(),
  }, null, 2);

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-6 md:mt-10 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* ── Left Column ── */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Gallery */}
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden glass-panel group">
            {images.length > 0 ? (
              <>
                <IPFSImage
                  cid={images[currentImageIndex]}
                  alt={displayTitle}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`rounded-full transition-all duration-300 ${
                            i === currentImageIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-border animate-pulse flex items-center justify-center">
                <span className="text-4xl opacity-20">🏠</span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`relative flex-shrink-0 w-20 aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    i === currentImageIndex
                      ? "border-accent scale-95"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <IPFSImage cid={img} alt={`${displayTitle} photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-2">
              {displayTitle}
            </h1>
            {location && (
              <div className="flex items-center gap-1 text-muted text-sm mb-4">
                <MapPin size={14} />
                <span>{location}</span>
              </div>
            )}
            {displayDesc && (
              <p className="text-muted text-base md:text-lg leading-relaxed">{displayDesc}</p>
            )}
          </div>

          {/* Property stats */}
          {supabaseMeta && (supabaseMeta.bedrooms || supabaseMeta.bathrooms || supabaseMeta.max_guests) && (
            <div className="flex flex-wrap gap-3">
              {supabaseMeta.bedrooms && (
                <div className="glass-panel px-4 py-3 flex items-center gap-2">
                  <Bed size={16} className="text-accent" />
                  <span className="font-bold">{supabaseMeta.bedrooms}</span>
                  <span className="text-muted text-sm">Bedroom{supabaseMeta.bedrooms !== 1 ? "s" : ""}</span>
                </div>
              )}
              {supabaseMeta.bathrooms && (
                <div className="glass-panel px-4 py-3 flex items-center gap-2">
                  <Bath size={16} className="text-accent" />
                  <span className="font-bold">{supabaseMeta.bathrooms}</span>
                  <span className="text-muted text-sm">Bath{supabaseMeta.bathrooms !== 1 ? "s" : ""}</span>
                </div>
              )}
              {supabaseMeta.max_guests && (
                <div className="glass-panel px-4 py-3 flex items-center gap-2">
                  <Users size={16} className="text-accent" />
                  <span className="font-bold">{supabaseMeta.max_guests}</span>
                  <span className="text-muted text-sm">Max Guests</span>
                </div>
              )}
            </div>
          )}

          {/* Amenities */}
          {supabaseMeta?.amenities && supabaseMeta.amenities.length > 0 && (
            <div className="glass-panel p-5">
              <h3 className="font-display text-lg font-bold mb-3">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {supabaseMeta.amenities.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full text-xs font-semibold"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Escrow Parties */}
          <div className="glass-panel p-6 space-y-5">
            <h3 className="font-display text-xl font-bold">Escrow Parties</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="label mb-0">Landlord</span>
                  <button
                    onClick={handleTrustScore}
                    disabled={isScoring}
                    className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-accent/30 transition-colors disabled:opacity-50"
                  >
                    {isScoring ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    AI Trust Check
                  </button>
                </div>
                <AddressDisplay address={rental.landlord} />
                
                {trustScore && (
                  <div className="mt-2 p-2 bg-surface border border-border rounded text-xs text-muted relative">
                    <button onClick={() => setTrustScore(null)} className="absolute top-1 right-1 hover:text-white">✕</button>
                    <div className="font-bold text-accent mb-1 flex items-center gap-1">
                      <Shield size={12} /> Score: {trustScore.score}/100
                    </div>
                    {trustScore.analysis}
                  </div>
                )}
              </div>
              <div>
                <span className="label">Tenant</span>
                {rental.tenant === "0x0000000000000000000000000000000000000000" ? (
                  <span className="text-sm text-warning italic">Waiting for funding...</span>
                ) : (
                  <AddressDisplay address={rental.tenant} />
                )}
              </div>
            </div>
          </div>

          {/* Transaction History */}
          {events && events.length > 0 && (
            <div className="glass-panel p-6 space-y-5">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <History size={20} className="text-accent" />
                Transaction History
              </h3>
              <div className="space-y-3">
                {events.map((ev, i) => {
                  const eventInfo = {
                    RentalCreated: { label: "Property Listed", color: "text-blue-400" },
                    RentalFunded: { label: "Funds Collected", color: "text-accent" },
                    RentalActivated: { label: "Check-in (Active)", color: "text-yellow-400" },
                    RentalCompleted: { label: "Completed (Funds Released)", color: "text-green-400" },
                    RentalCancelled: { label: "Cancelled", color: "text-red-400" },
                    DisputeRaised: { label: "Dispute On Hold", color: "text-orange-400" },
                    DisputeResolved: { label: "Dispute Resolved", color: "text-purple-400" },
                  }[ev.eventName] || { label: ev.eventName, color: "text-gray-400" };

                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface/50 border border-border rounded-lg gap-3">
                      <div>
                        <div className={`font-bold text-sm ${eventInfo.color}`}>
                          {eventInfo.label}
                        </div>
                        <div className="text-xs text-muted mt-1 font-mono">
                          Block: {ev.blockNumber.toString()}
                        </div>
                      </div>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${ev.transactionHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded hover:bg-accent/20 transition-colors w-fit"
                      >
                        {ev.transactionHash.slice(0, 6)}...{ev.transactionHash.slice(-4)}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection
            rentalId={listingId!}
            canReview={
              rental.state === 3 /* Completed */ &&
              !!address &&
              rental.tenant.toLowerCase() === address.toLowerCase()
            }
          />
        </div>

        {/* ── Right Column — Booking Card ── */}
        <div className="w-full lg:w-[400px] shrink-0">
          <div className="glass-panel sticky top-24 flex flex-col border-accent/20 bg-accent/5">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-2xl font-bold mb-5">Booking Details</h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center bg-surface/50 p-3 rounded-lg border border-border">
                  <span className="text-muted text-sm">Stay Duration</span>
                  <span className="font-bold text-sm">
                    {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-surface/50 p-3 rounded-lg border border-border">
                  <span className="text-muted text-sm">Nights</span>
                  <span className="font-bold">{nights}</span>
                </div>
                <div className="flex justify-between items-center text-sm px-1">
                  <span className="text-muted">Rent Amount</span>
                  <EthAmount weiAmount={rental.rentAmount} />
                </div>
                <div className="flex justify-between items-center text-sm px-1">
                  <span className="text-muted">Security Deposit</span>
                  <EthAmount weiAmount={rental.depositAmount} />
                </div>
                <div className="flex justify-between items-center font-bold pt-3 border-t border-border px-1">
                  <span>Total Required</span>
                  <EthAmount weiAmount={totalWei} className="text-accent2 text-xl" />
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-3 block">
                  Escrow Lifecycle
                </span>
                <StateMachineProgress currentState={rental.state} />
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={handleExplainEscrow}
                  disabled={isExplaining}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface hover:bg-surface/80 border border-border text-sm font-semibold text-accent transition-colors disabled:opacity-50"
                >
                  {isExplaining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Explain Escrow Terms
                </button>
                {explanation && (
                  <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg text-sm text-gray-200 leading-relaxed relative">
                    <button onClick={() => setExplanation(null)} className="absolute top-2 right-2 text-muted hover:text-white">
                      ✕
                    </button>
                    {explanation}
                  </div>
                )}
              </div>
            </div>

            <ActionPanel rental={rental} onTxSuccess={() => refetch()} />
          </div>
        </div>
      </main>

      <AIAssistant propertyContext={propertyContext} />
    </div>
  );
}
