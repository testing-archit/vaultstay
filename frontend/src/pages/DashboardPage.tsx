import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { PlusCircle, TrendingUp, Lock, Wand2, Loader2, Sparkles, Activity, ExternalLink } from "lucide-react";
import { useAllListings, usePendingWithdrawal, useWithdraw } from "../hooks/useVaultStay";
import { RentalCard } from "../components/RentalCard";
import { Navbar } from "../components/Navbar";
import { WalletConnectButton } from "../components/WalletConnectButton";
import { EthAmount } from "../components/EthAmount";
import type { Rental } from "../lib/types";
import { createClient } from "../lib/supabase";
import type { ListingMeta } from "./ListingsPage";
import { getDashboardInsights } from "../lib/gemini";

export default function DashboardPage() {
  const { data: listings, isLoading } = useAllListings();
  const { address } = useAccount();
  const [tab, setTab] = useState<"LISTINGS" | "BOOKINGS" | "ACTIVITY">("LISTINGS");
  const [metaMap, setMetaMap] = useState<Record<number, ListingMeta>>({});
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  const [isGettingInsights, setIsGettingInsights] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);

  const allListings = listings ?? [];
  const normalizedViewer = address ? address.toLowerCase() : "";

  const myListings = allListings.filter(
    (l) => l.landlord.toLowerCase() === normalizedViewer
  );
  const myBookings = allListings.filter(
    (l) =>
      l.tenant !== "0x0000000000000000000000000000000000000000" &&
      l.tenant.toLowerCase() === normalizedViewer
  );

  useEffect(() => {
    if (!address || !listings || listings.length === 0) return;

    const relevantIds = [
      ...myListings.map((l) => Number(l.id)),
      ...myBookings.map((l) => Number(l.id)),
    ];
    const uniqueIds = Array.from(new Set(relevantIds));

    if (uniqueIds.length === 0) return;

    let cancelled = false;
    createClient()
      .from("listings_metadata")
      .select("rental_id, title, city, country, image_cid")
      .in("rental_id", uniqueIds)
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
  }, [listings, address]);

  // Fetch activity timeline
  useEffect(() => {
    if (!address || !listings || listings.length === 0) return;
    const relevantIds = [
      ...myListings.map((l) => Number(l.id)),
      ...myBookings.map((l) => Number(l.id)),
    ];
    const uniqueIds = Array.from(new Set(relevantIds));
    if (uniqueIds.length === 0) return;

    let cancelled = false;
    setIsLoadingActivity(true);
    createClient()
      .from("rental_events")
      .select("rental_id, event_type, actor_addr, tx_hash, occurred_at")
      .in("rental_id", uniqueIds)
      .order("occurred_at", { ascending: false })
      .limit(50)
      .then((res: any) => {
        if (cancelled) return;
        setActivityEvents(res.data ?? []);
        setIsLoadingActivity(false);
      });
    return () => { cancelled = true; };
  }, [listings, address]);

  const handleGetInsights = async () => {
    if (myListings.length === 0) return;
    setIsGettingInsights(true);
    try {
      const stats = JSON.stringify(myListings.map(l => ({
        state: ["CREATED", "FUNDED", "ACTIVE", "COMPLETED"][l.state] || "UNKNOWN",
        rent_wei: l.rentAmount.toString(),
        deposit_wei: l.depositAmount.toString(),
      })));
      const result = await getDashboardInsights(stats);
      setInsights(result);
    } catch (err) {
      console.error(err);
      setInsights("Failed to load insights.");
    } finally {
      setIsGettingInsights(false);
    }
  };

  const { data: pendingWei } = usePendingWithdrawal(address);
  const { withdraw, isPending: isWithdrawing } = useWithdraw();
  const pendingBalance = pendingWei ?? 0n;

  if (!address) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-6">
          <div className="text-6xl mb-2">🔐</div>
          <h2 className="font-display text-3xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted max-w-sm">
            Connect your wallet to view your listings, bookings, and pending withdrawals.
          </p>
          <WalletConnectButton />
        </div>
      </div>
    );
  }

  const activeDisplay = tab === "LISTINGS" ? myListings : myBookings;

  const lockedWei = [...myListings, ...myBookings]
    .filter((l) => l.state === 1 || l.state === 2)
    .reduce<bigint>((acc, l) => acc + l.rentAmount + l.depositAmount, 0n);

  const totalEarned = myListings
    .filter((l) => l.state === 3) // Completed
    .reduce<bigint>((acc, l) => acc + l.rentAmount, 0n);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-1">My Dashboard</h1>
            <p className="text-muted">Manage your properties and active bookings.</p>
          </div>
          <Link to="/create" className="btn-primary flex items-center gap-2 w-fit">
            <PlusCircle size={16} /> New Listing
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="glass-panel p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-widest">Properties</p>
              <p className="font-display text-2xl font-bold">{myListings.length}</p>
            </div>
          </div>
          <div className="glass-panel p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent2/10 flex items-center justify-center flex-shrink-0">
              <Lock size={18} className="text-accent2" />
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-widest">ETH Locked</p>
              <EthAmount weiAmount={lockedWei} className="text-accent2 text-xl" />
            </div>
          </div>
          <div className="glass-panel p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-widest">Total Earned</p>
              <EthAmount weiAmount={totalEarned} className="text-green-400 text-xl" />
            </div>
          </div>
        </div>

        {/* AI Insights Banner */}
        {myListings.length > 0 && (
          <div className="mb-10 glass-panel p-5 md:p-6 border-accent/30 bg-accent/5">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-accent flex items-center gap-2 mb-1">
                  <Sparkles size={18} /> AI Portfolio Insights
                </h3>
                <p className="text-sm text-muted">Get actionable advice for your active rentals and overall portfolio.</p>
              </div>
              {!insights && (
                <button
                  onClick={handleGetInsights}
                  disabled={isGettingInsights}
                  className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent font-bold rounded-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isGettingInsights ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  Generate Insights
                </button>
              )}
            </div>
            {insights && (
              <div className="p-4 bg-surface/50 border border-border rounded-xl text-sm leading-relaxed text-gray-200">
                <div className="whitespace-pre-wrap">{insights}</div>
                <button onClick={() => setInsights(null)} className="mt-3 text-xs text-muted hover:text-white transition-colors">
                  Clear Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* Withdrawal Banner */}
        {pendingBalance > 0n && (
          <div className="mb-10 glass-panel p-5 md:p-6 border-accent2/30 bg-accent2/5 flex flex-col md:flex-row items-center justify-between gap-5 animate-in">
            <div>
              <h3 className="font-display text-lg font-bold text-accent2 mb-1">
                💰 Funds Available for Withdrawal
              </h3>
              <p className="text-sm text-muted">
                From completed or cancelled rentals — ready to claim.
              </p>
            </div>
            <div className="flex items-center gap-5 flex-shrink-0">
              <EthAmount weiAmount={pendingBalance} className="text-3xl font-mono text-text" />
              <button
                onClick={() => withdraw()}
                disabled={isWithdrawing}
                className="px-6 py-2.5 bg-accent2 hover:bg-accent2/90 text-background font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(0,212,170,0.3)] disabled:opacity-50 text-sm"
              >
                {isWithdrawing ? "Processing..." : "Withdraw ETH"}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-border mb-8">
          <div className="flex gap-0">
            {(["LISTINGS", "BOOKINGS", "ACTIVITY"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-bold transition-all relative ${
                  tab === t ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                {t === "LISTINGS"
                  ? `My Listings (${myListings.length})`
                  : t === "BOOKINGS"
                  ? `My Bookings (${myBookings.length})`
                  : "Activity"}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-accent" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {tab === "ACTIVITY" ? (
          isLoadingActivity ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-muted" />
            </div>
          ) : activityEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl">
              <Activity size={40} className="text-muted mb-4 opacity-40" />
              <h3 className="font-display text-xl font-bold mb-2">No activity yet</h3>
              <p className="text-muted">Your on-chain events will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityEvents.map((ev: any, i: number) => {
                const eventColors: Record<string, string> = {
                  Created: "text-blue-400 bg-blue-400/10 border-blue-400/20",
                  Funded: "text-accent bg-accent/10 border-accent/20",
                  Activated: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
                  Completed: "text-green-400 bg-green-400/10 border-green-400/20",
                  Cancelled: "text-danger bg-danger/10 border-danger/20",
                  Disputed: "text-warning bg-warning/10 border-warning/20",
                  Withdrawn: "text-accent2 bg-accent2/10 border-accent2/20",
                };
                const colors = eventColors[ev.event_type] ?? "text-muted bg-surface border-border";
                const metaTitle = metaMap[ev.rental_id]?.title;
                return (
                  <div key={i} className="glass-panel p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`badge border ${colors} flex-shrink-0`}>{ev.event_type}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {metaTitle ? metaTitle : `Rental #${ev.rental_id}`}
                        </p>
                        <p className="text-xs text-muted">
                          {new Date(ev.occurred_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {ev.tx_hash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${ev.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded hover:bg-accent/20 transition-colors flex-shrink-0"
                      >
                        {ev.tx_hash.slice(0, 6)}…{ev.tx_hash.slice(-4)}
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 glass-panel animate-pulse bg-surface/30" />
            ))}
          </div>
        ) : activeDisplay.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl">
            <span className="text-5xl mb-4">{tab === "LISTINGS" ? "🏠" : "🗝️"}</span>
            <h3 className="font-display text-xl font-bold mb-2">
              {tab === "LISTINGS" ? "No properties listed" : "No bookings found"}
            </h3>
            <p className="text-muted mb-6 max-w-xs">
              {tab === "LISTINGS"
                ? "You haven't listed any properties yet."
                : "You haven't booked any properties yet."}
            </p>
            {tab === "LISTINGS" ? (
              <Link to="/create" className="btn-primary flex items-center gap-2">
                <PlusCircle size={16} /> Create Listing
              </Link>
            ) : (
              <Link to="/listings" className="btn-primary">Browse Listings</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeDisplay.map((rental: Rental) => (
              <RentalCard key={rental.id.toString()} rental={rental} meta={metaMap[Number(rental.id)] ?? null} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
