import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ListingsPage from "./pages/ListingsPage";
import ListingDetailPage from "./pages/ListingDetailPage";
import CreatePage from "./pages/CreatePage";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/listings" element={<ListingsPage />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
