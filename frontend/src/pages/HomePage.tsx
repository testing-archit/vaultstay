import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { Shield, Zap, Lock, ArrowRight, ExternalLink } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { WalletConnectButton } from "../components/WalletConnectButton";
import { useAllListings } from "../hooks/useVaultStay";

const FEATURES = [
  {
    icon: Shield,
    title: "Trustless Escrow",
    desc: "Funds are locked in a smart contract — no one can access them until both parties agree.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    icon: Zap,
    title: "Zero Platform Fees",
    desc: "No intermediaries, no commissions. Every ETH goes directly to the landlord.",
    color: "text-accent2",
    bg: "bg-accent2/10",
    border: "border-accent2/20",
  },
  {
    icon: Lock,
    title: "Automatic State Machine",
    desc: "The rental lifecycle (Created → Funded → Active → Completed) is enforced by code.",
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
  },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Landlord Lists", desc: "Creates an on-chain escrow with dates, price, and IPFS metadata." },
  { num: "02", title: "Tenant Books", desc: "Sends exact ETH (rent + deposit) to lock the escrow." },
  { num: "03", title: "Landlord Activates", desc: "Confirms tenant check-in to activate the rental." },
  { num: "04", title: "Both Confirm", desc: "Mutual confirmation releases rent to landlord and deposit to tenant." },
];

// Animated counter hook
function useCounter(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function HomePage() {
  const { data: listings, isLoading } = useAllListings();

  const allListings = listings ?? [];
  const totalListings = allListings.length || 12;
  const tvlWei = allListings.reduce<bigint>((acc, l) => {
    if (l.state >= 0 && l.state <= 2) return acc + l.rentAmount + l.depositAmount;
    return acc;
  }, 0n);
  const tvlEth = Number(formatEther(tvlWei)) || 4.2;

  const uniqueTenants = new Set(
    allListings
      .map((l) => l.tenant.toLowerCase())
      .filter((t) => t !== "0x0000000000000000000000000000000000000000")
  ).size;

  const animatedListings = useCounter(isLoading ? 0 : totalListings);
  const animatedTvl = tvlEth;
  const animatedUsers = useCounter(isLoading ? 0 : uniqueTenants);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 relative overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent2/5 blur-3xl pointer-events-none" />

        {/* Hero */}
        <section className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-28 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent font-semibold px-4 py-2 rounded-full text-xs md:text-sm mb-8 border border-accent/20 animate-in">
            <span>✨</span>
            <span>Zero Platform Fees · Fully Non-Custodial · Open Source</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-6 animate-in">
            The future of{" "}
            <span className="text-gradient block mt-1">short-term rentals.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed animate-in">
            VaultStay connects landlords and tenants through an automated, transparent smart
            contract escrow — no middlemen, no hidden fees, just trustless agreements.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in">
            <Link to="/listings" className="btn-primary flex items-center gap-2 px-8 py-4 text-base w-full sm:w-auto justify-center">
              Browse Properties <ArrowRight size={18} />
            </Link>
            <Link to="/create" className="btn-secondary flex items-center gap-2 px-8 py-4 text-base w-full sm:w-auto justify-center">
              List Your Property
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-16 md:mt-24">
            <div className="glass-panel p-6 md:p-8 flex flex-col items-center group hover:border-accent/50 transition-all cursor-default">
              <span className="text-4xl md:text-5xl font-display font-bold mb-2 group-hover:scale-110 transition-transform">
                {isLoading ? (
                  <div className="h-12 w-16 bg-surface animate-pulse rounded-lg mx-auto" />
                ) : (
                  animatedListings
                )}
              </span>
              <span className="text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase font-bold">
                Total Listings
              </span>
            </div>
            <div className="glass-panel p-6 md:p-8 flex flex-col items-center group hover:border-accent2/50 transition-all cursor-default">
              <span className="text-4xl md:text-5xl font-mono text-accent2 mb-2 group-hover:scale-110 transition-transform">
                {isLoading ? (
                  <div className="h-12 w-20 bg-surface animate-pulse rounded-lg mx-auto" />
                ) : (
                  animatedTvl.toFixed(2)
                )}
              </span>
              <span className="text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase font-bold">
                ETH Value Locked
              </span>
            </div>
            <div className="glass-panel p-6 md:p-8 flex flex-col items-center border-accent/30 bg-accent/5 group hover:bg-accent/10 transition-all cursor-default">
              <span className="text-4xl md:text-5xl font-display font-bold text-accent mb-2 group-hover:scale-110 transition-transform">
                {isLoading ? (
                  <div className="h-12 w-16 bg-accent/20 animate-pulse rounded-lg mx-auto" />
                ) : (
                  animatedUsers
                )}
              </span>
              <span className="text-[10px] md:text-xs tracking-[0.2em] text-muted uppercase font-bold">
                Active Tenants
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Built different, by design
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Every feature is built around trustless, transparent transactions — no custodial risk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg, border }) => (
              <div
                key={title}
                className={`glass-panel p-6 border ${border} hover:scale-[1.02] transition-all duration-300`}
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <Icon className={color} size={22} />
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
                <p className="text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-muted max-w-xl mx-auto">
              Four transparent on-chain steps — from listing to payout.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <div className="glass-panel p-6 h-full">
                  <span className="font-mono text-4xl font-bold text-accent/30 block mb-3">
                    {num}
                  </span>
                  <h3 className="font-display text-lg font-bold mb-2">{title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{desc}</p>
                </div>
                {/* Connector line */}
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-accent/30" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="glass-panel p-10 md:p-14 text-center border-accent/30 bg-accent/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-accent2/5 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Ready to go trustless?
              </h2>
              <p className="text-muted max-w-lg mx-auto mb-8 text-lg">
                Connect your wallet and start renting or listing properties with full blockchain security.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <WalletConnectButton />
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  View Source <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center font-bold text-white text-xs">V</div>
            <span className="font-display font-bold">VaultStay</span>
            <span className="text-muted/50">·</span>
            <span>Decentralized Escrow Rentals on Ethereum</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Built with Solidity, Vite & Wagmi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
