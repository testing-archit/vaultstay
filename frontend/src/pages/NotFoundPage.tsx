import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-6">
        <div className="font-mono text-8xl font-bold text-gradient mb-2">404</div>
        <h2 className="font-display text-3xl font-bold">Page Not Found</h2>
        <p className="text-muted max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3">
          <Link to="/" className="btn-primary">Go Home</Link>
          <Link to="/listings" className="btn-secondary">Browse Listings</Link>
        </div>
      </div>
    </div>
  );
}
