import { formatEther } from "viem";

interface EthAmountProps {
  weiAmount: bigint;
  className?: string;
}

export function EthAmount({ weiAmount, className = "" }: EthAmountProps) {
  const eth = parseFloat(formatEther(weiAmount));
  const formatted =
    eth === 0
      ? "0 ETH"
      : eth < 0.001
      ? `${eth.toFixed(6)} ETH`
      : `${eth.toFixed(4)} ETH`;

  return (
    <span className={`font-mono font-semibold text-text ${className}`}>
      {formatted}
    </span>
  );
}
