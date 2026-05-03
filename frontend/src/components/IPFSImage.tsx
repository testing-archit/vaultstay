import { resolveIPFS } from "../lib/ipfs";

interface IPFSImageProps {
  cid: string;
  alt: string;
  className?: string;
}

export function IPFSImage({ cid, alt, className = "" }: IPFSImageProps) {
  const src = resolveIPFS(cid);

  if (!src) {
    return <div className={`bg-border animate-pulse ${className}`} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800";
      }}
    />
  );
}
