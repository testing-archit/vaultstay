/**
 * A dedicated read-only public client pointed at Sepolia testnet.
 * Used for fetching on-chain state without requiring a connected wallet.
 */
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const sepoliaRpc =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia.publicnode.com";

export const readClient = createPublicClient({
  chain: sepolia,
  transport: http(sepoliaRpc),
});
