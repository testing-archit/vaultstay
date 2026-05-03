import * as React from "react";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { http } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const sepoliaRpcUrl =
  import.meta.env.VITE_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia.publicnode.com";

const projectId = "3fcc6b4468bd93cb509748c187823813"; // fallback dummy ID

const wagmiConfig = getDefaultConfig({
  appName: "VaultStay",
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(sepoliaRpcUrl),
  },
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      retry: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#6C5CE7",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
