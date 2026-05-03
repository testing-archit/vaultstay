const _rawAddr = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;

if (!_rawAddr) {
  console.error(
    "[VaultStay] VITE_CONTRACT_ADDRESS is not set. " +
    "Add it to frontend/.env and restart the dev server."
  );
}

export const CONTRACT_ADDRESS = (_rawAddr ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
