interface AddressDisplayProps {
  address: string;
  className?: string;
}

export function AddressDisplay({ address, className = "" }: AddressDisplayProps) {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copy = () => {
    navigator.clipboard.writeText(address).catch(() => {});
  };

  return (
    <button
      onClick={copy}
      title={`Copy: ${address}`}
      className={`font-mono text-sm text-muted hover:text-text transition-colors group flex items-center gap-1.5 ${className}`}
    >
      <span>{short}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">📋</span>
    </button>
  );
}
