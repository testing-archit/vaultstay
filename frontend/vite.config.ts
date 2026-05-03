import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  envDir: "./", // reads VITE_* vars from frontend/.env (not the parent vaultstay/.env)
  plugins: [react()],
  resolve: {
    alias: {
      // Polyfill for viem / wagmi which need Node builtins in the browser
    },
  },
  define: {
    // Required by some WalletConnect / wagmi internals
    global: "globalThis",
  },
  optimizeDeps: {
    include: [
      "wagmi",
      "viem",
      "@rainbow-me/rainbowkit",
      "@tanstack/react-query",
    ],
  },
});
