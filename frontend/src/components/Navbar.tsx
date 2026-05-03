import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Home, Search, LayoutDashboard, PlusCircle } from "lucide-react";
import { WalletConnectButton } from "./WalletConnectButton";

const navLinks = [
  { href: "/listings", label: "Browse", icon: Search },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "List Property", icon: PlusCircle, accent: true },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      <nav className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center font-display font-bold text-white text-lg shadow-[0_0_12px_rgba(108,92,231,0.4)]">
            V
          </div>
          <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
            VaultStay
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon, accent }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  accent
                    ? "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50"
                    : isActive
                    ? "bg-surface text-text"
                    : "text-muted hover:text-text hover:bg-surface/50"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center">
          <WalletConnectButton />
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-3">
          <WalletConnectButton />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-muted hover:text-text transition-colors"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 backdrop-blur-xl md:hidden pt-20 px-6 flex flex-col space-y-2 animate-in">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 p-4 rounded-xl hover:bg-surface transition-colors text-xl font-display font-bold"
          >
            <Home size={20} className="text-accent" /> Home
          </Link>
          {navLinks.map(({ href, label, icon: Icon, accent }) => (
            <Link
              key={href}
              to={href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 p-4 rounded-xl transition-colors text-xl font-display font-bold ${
                accent ? "text-accent" : "hover:bg-surface"
              }`}
            >
              <Icon size={20} className={accent ? "text-accent" : ""} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
