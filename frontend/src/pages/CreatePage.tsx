import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UploadCloud, X, Plus, Loader2, CheckCircle } from "lucide-react";
import { useCreateListing } from "../hooks/useVaultStay";
import { uploadMultipleToIPFS, uploadMetadata } from "../lib/ipfs";
import { Navbar } from "../components/Navbar";
import { useAccount, usePublicClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { decodeEventLog } from "viem";
import { VaultStayEscrowABI } from "../lib/abi";
import { createClient } from "../lib/supabase";
import { Sparkles, BrainCircuit, Wand2, Calculator } from "lucide-react";
import { 
  analyzePropertyImages, 
  generateListingDescription, 
  suggestPrice 
} from "../lib/gemini";

// Returns today's date string in YYYY-MM-DD format (local time)
const getToday = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split("T")[0];
};

// Extract the real revert reason from viem/wagmi nested errors
function extractRevertReason(err: unknown): string {
  if (!err) return "An unknown error occurred";
  // wagmi wraps the real cause in err.cause.cause
  const anyErr = err as Record<string, unknown>;
  const cause = anyErr.cause as Record<string, unknown> | undefined;
  const innerCause = cause?.cause as Record<string, unknown> | undefined;
  const reason =
    (innerCause?.reason as string) ||
    (cause?.reason as string) ||
    (anyErr.shortMessage as string) ||
    (anyErr.message as string) ||
    "Transaction failed";
  return reason.slice(0, 300);
}

const STEP_LABELS = [
  "Upload images to IPFS...",
  "Upload metadata to IPFS...",
  "Waiting for wallet approval...",
  "Transaction submitted — mining...",
  "Syncing metadata...",
];

export default function CreatePage() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const { create, isPending, isConfirming } = useCreateListing();

  const [form, setForm] = useState({
    title: "",
    description: "",
    city: "",
    country: "",
    rent: "0.1",
    deposit: "0.05",
    startDate: "",
    duration: "7",
    bedrooms: "",
    bathrooms: "",
    maxGuests: "",
    amenities: "",
    paymentToken: "0x0000000000000000000000000000000000000000",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [step, setStep] = useState(-1); // -1 = idle, 0-4 = uploading steps
  const [done, setDone] = useState(false);

  // AI Loading States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setFiles((f) => [...f, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((p) => [...p, ...newPreviews]);
    // Reset input so same file can be re-added
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((f) => f.filter((_, i) => i !== index));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  // ── AI Handlers ──
  
  const handleAIAnalyzeImages = async () => {
    if (files.length === 0) {
      alert("Please upload some images first!");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      // Convert files to base64
      const base64Promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      const base64Images = await Promise.all(base64Promises);
      
      const analysis = await analyzePropertyImages(base64Images);
      
      setForm(prev => ({
        ...prev,
        title: analysis.title || prev.title,
        bedrooms: analysis.bedrooms.toString() || prev.bedrooms,
        bathrooms: analysis.bathrooms.toString() || prev.bathrooms,
        amenities: analysis.amenities.join(", ") || prev.amenities,
      }));
    } catch (err) {
      console.error(err);
      alert("AI analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIGenerateDescription = async () => {
    if (!form.city || !form.country) {
      alert("Please enter city and country first for better context.");
      return;
    }

    setIsGeneratingDesc(true);
    try {
      const desc = await generateListingDescription({
        city: form.city,
        country: form.country,
        bedrooms: parseInt(form.bedrooms || "1"),
        bathrooms: parseInt(form.bathrooms || "1"),
        amenities: form.amenities.split(",").map(a => a.trim()).filter(Boolean),
      });
      setForm(prev => ({ ...prev, description: desc }));
    } catch (err) {
      console.error(err);
      alert("AI generation failed.");
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleAISuggestPrice = async () => {
    if (!form.city || !form.country) {
      alert("Please enter city and country first.");
      return;
    }

    setIsSuggestingPrice(true);
    try {
      const suggestion = await suggestPrice({
        city: form.city,
        country: form.country,
        bedrooms: parseInt(form.bedrooms || "1"),
        bathrooms: parseInt(form.bathrooms || "1"),
        amenities: form.amenities.split(",").map(a => a.trim()).filter(Boolean),
      });
      setForm(prev => ({ ...prev, rent: suggestion.rent, deposit: suggestion.deposit }));
    } catch (err) {
      console.error(err);
      alert("AI pricing failed.");
    } finally {
      setIsSuggestingPrice(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { alert("Please connect your wallet first!"); return; }
    if (files.length === 0) { alert("Please upload at least one property image"); return; }

    try {
      setStep(0);
      const imageCIDs = await uploadMultipleToIPFS(files);

      setStep(1);
      const metadataCID = await uploadMetadata({
        name: form.title,
        description: form.description,
        imageCID: imageCIDs[0],
        images: imageCIDs,
      });

      setStep(2);
      // Parse as UTC noon
      let startTs = Math.floor(new Date(form.startDate + "T12:00:00Z").getTime() / 1000);
      const nowTs = Math.floor(Date.now() / 1000);

      // If today is selected, ALWAYS use nowTs + 90 regardless of where noon UTC falls.
      // This avoids the case where noon UTC is still 90+ mins away, locking activation.
      const selectedDateStr = form.startDate; // YYYY-MM-DD in local time
      const isTodaySelected = selectedDateStr === getToday();
      if (isTodaySelected || startTs <= nowTs + 60) {
        startTs = nowTs + 90; // ~90s from now — enough for listing tx to confirm
      }

      const endTs = startTs + parseInt(form.duration) * 86400;
      if (endTs <= startTs) {
        throw new Error("Duration must be at least 1 day.");
      }

      const txHash = (await create(form.paymentToken, form.rent, form.deposit, startTs, endTs, metadataCID)) as `0x${string}`;

      setStep(3);

      if (publicClient && txHash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // ✅ Immediately bust the cache so /listings shows the new listing
        await queryClient.invalidateQueries({ queryKey: ["all-listings"] });

        let newRentalId: number | null = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({ abi: VaultStayEscrowABI, data: log.data, topics: log.topics });
            if (decoded.eventName === "RentalCreated") {
              newRentalId = Number((decoded.args as { id: bigint }).id);
              break;
            }
          } catch { /* skip non-matching logs */ }
        }

        if (newRentalId) {
          setStep(4);
          const supabase = createClient();
          await supabase.from("listings_metadata").insert({
            rental_id: newRentalId,
            title: form.title,
            description: form.description,
            city: form.city || null,
            country: form.country || null,
            image_cid: imageCIDs[0] || null,
            bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
            bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
            max_guests: form.maxGuests ? parseInt(form.maxGuests) : null,
            amenities: form.amenities ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean) : null,
          });
        }
      }

      setDone(true);
      // Navigate to /listings so the user sees their new listing immediately
      setTimeout(() => navigate("/listings"), 2000);
    } catch (err) {
      console.error(err);
      const message = extractRevertReason(err);
      alert(message);
      setStep(-1);
    }
  };

  const isWorking = step >= 0 || isPending || isConfirming;

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 md:py-14">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-surface text-muted hover:text-text transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">List Your Property</h1>
            <p className="text-muted text-sm mt-1">Create an on-chain escrow smart contract for your rental</p>
          </div>
        </div>

        {/* Success state */}
        {done && (
          <div className="glass-panel p-8 text-center border-accent2/30 bg-accent2/5 animate-in mb-6">
            <CheckCircle size={48} className="text-accent2 mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold mb-1">Listing Created!</h2>
            <p className="text-muted">Redirecting to browse listings...</p>
          </div>
        )}

        {/* Progress steps */}
        {isWorking && !done && (
          <div className="glass-panel p-4 mb-6 border-accent/30 bg-accent/5 animate-in">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-accent flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">
                  {step >= 0 ? STEP_LABELS[step] : "Processing..."}
                </p>
                <div className="flex gap-1 mt-2">
                  {STEP_LABELS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        i <= step ? "bg-accent" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="glass-panel p-6 md:p-8 space-y-8">
          {/* ── Images ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <span className="text-accent">01</span> Property Photos
              </h2>
              {files.length > 0 && (
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleAIAnalyzeImages}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-full border border-accent/20 transition-all"
                >
                  {isAnalyzing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <BrainCircuit size={12} />
                  )}
                  AI Analyze
                </button>
              )}
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={src} alt="preview" className="w-full h-full object-cover rounded-xl border border-border" />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-danger text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-2 left-2 bg-accent text-[10px] font-bold px-2 py-0.5 rounded text-white">Cover</span>
                    )}
                  </div>
                ))}
                {previews.length < 6 && (
                  <label className="relative border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center aspect-square hover:bg-surface transition-colors cursor-pointer">
                    <Plus size={22} className="text-muted mb-1" />
                    <span className="text-[10px] font-bold text-muted uppercase">Add</span>
                    <input type="file" className="sr-only" onChange={handleFiles} accept="image/*" multiple />
                  </label>
                )}
              </div>
            )}

            {previews.length === 0 && (
              <label className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-surface transition-colors flex flex-col items-center justify-center cursor-pointer">
                <UploadCloud size={44} className="text-muted mb-3 opacity-60" />
                <p className="font-semibold mb-1">Upload property images</p>
                <p className="text-xs text-muted italic">First image will be the cover photo · Max 6 images</p>
                <input type="file" className="sr-only" onChange={handleFiles} accept="image/*" multiple />
              </label>
            )}
          </section>

          <div className="border-t border-border" />

          {/* ── Details ── */}
          <section>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-accent">02</span> Property Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="title">Listing Title *</label>
                <div className="relative">
                  <input
                    id="title"
                    required
                    type="text"
                    className="input-field"
                    placeholder="e.g. Luxury Malibu Beach House"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                  {isAnalyzing && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="animate-spin text-accent opacity-50" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0" htmlFor="description">Description *</label>
                  <button
                    type="button"
                    disabled={isGeneratingDesc}
                    onClick={handleAIGenerateDescription}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent2 hover:text-accent2-hover transition-colors"
                  >
                    {isGeneratingDesc ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Magic Write
                  </button>
                </div>
                <textarea
                  id="description"
                  required
                  rows={4}
                  className="input-field resize-none"
                  placeholder="Describe the property, its highlights, and nearby attractions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="city">City</label>
                  <input id="city" type="text" className="input-field" placeholder="e.g. Malibu" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="country">Country</label>
                  <input id="country" type="text" className="input-field" placeholder="e.g. USA" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label" htmlFor="bedrooms">Bedrooms</label>
                  <input id="bedrooms" type="number" min="0" className="input-field" placeholder="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="bathrooms">Bathrooms</label>
                  <input id="bathrooms" type="number" min="0" className="input-field" placeholder="0" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="maxGuests">Max Guests</label>
                  <input id="maxGuests" type="number" min="1" className="input-field" placeholder="4" value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="amenities">Amenities (comma-separated)</label>
                <input
                  id="amenities"
                  type="text"
                  className="input-field"
                  placeholder="WiFi, Pool, Parking, Air Conditioning, Kitchen"
                  value={form.amenities}
                  onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                />
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          {/* ── Financials ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <span className="text-accent">03</span> Pricing
              </h2>
              <button
                type="button"
                disabled={isSuggestingPrice}
                onClick={handleAISuggestPrice}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-accent2/10 hover:bg-accent2/20 text-accent2 px-3 py-1.5 rounded-full border border-accent2/20 transition-all"
              >
                {isSuggestingPrice ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Calculator size={12} />
                )}
                AI Suggest
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label" htmlFor="paymentToken">Payment Token *</label>
                <select
                  id="paymentToken"
                  className="input-field bg-surface appearance-none text-muted"
                  value={form.paymentToken}
                  disabled
                  onChange={(e) => setForm({ ...form, paymentToken: e.target.value })}
                >
                  <option value="0x0000000000000000000000000000000000000000">Sepolia ETH</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="rent">Rent Amount *</label>
                <div className="relative">
                  <input
                    id="rent"
                    required
                    type="number"
                    step="0.001"
                    min="0"
                    className="input-field pr-14"
                    value={form.rent}
                    onChange={(e) => setForm({ ...form, rent: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono font-bold">
                    ETH
                  </span>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="deposit">Security Deposit *</label>
                <div className="relative">
                  <input
                    id="deposit"
                    required
                    type="number"
                    step="0.001"
                    min="0"
                    className="input-field pr-14"
                    value={form.deposit}
                    onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono font-bold">
                    ETH
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-accent2/5 border border-accent2/20 rounded-lg text-xs text-muted">
              💡 Tenant will pay <span className="font-mono text-accent2 font-bold">{(parseFloat(form.rent || "0") + parseFloat(form.deposit || "0")).toFixed(4)} ETH</span> total (rent + deposit). Deposit is returned on completion.
            </div>
          </section>

          <div className="border-t border-border" />

          {/* ── Dates ── */}
          <section>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-accent">04</span> Rental Period
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="startDate">Start Date *</label>
                <input
                  id="startDate"
                  required
                  type="date"
                  className="input-field"
                  min={getToday()}
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="duration">Duration (Days) *</label>
                <input
                  id="duration"
                  required
                  type="number"
                  min="1"
                  className="input-field"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={isWorking}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {isWorking ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{step >= 0 ? STEP_LABELS[step] : "Processing..."}</span>
              </>
            ) : (
              "🚀 Create Escrow Smart Contract"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
