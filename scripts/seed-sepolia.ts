import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Seeds the deployed Sepolia VaultStayEscrow contract with 8 listings
 * that match the entries already in Supabase (rental_id 1-8).
 * Run: npx hardhat run scripts/seed-sepolia.ts --network sepolia
 */

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as string;

// IPFS CIDs matching listings_metadata in Supabase (image_cid column)
const LISTINGS = [
  { cid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco", rent: "0.1",  deposit: "0.05" }, // 1 - Lisbon
  { cid: "QmYD3oBfQvM1Pns68FbEW6E7TMDyCHdV71nT8pXZpDMUkP", rent: "0.2",  deposit: "0.1"  }, // 2 - Bern
  { cid: "QmZd6B2z8oE4vkSDhX4kQqHbNBTQKJMd3z5rVYMJqWk8p", rent: "0.3",  deposit: "0.15" }, // 3 - Tokyo
  { cid: "QmAB7yCwPpLqVwT8sXEeLbPzJ8WqcRnM2BvHQRGo7kP9qD", rent: "0.5",  deposit: "0.25" }, // 4 - Bali
  { cid: "QmCF4xKpW3A5ZjTkNJqsRsBm1LwY2VtnHEFXoQgP6s2cRZ", rent: "0.15", deposit: "0.07" }, // 5 - Amsterdam
  { cid: "QmDE9fLpZ5GcYqMx1aNJrKoVs8nH6RzWTLPqBfJFxYuDKE", rent: "0.25", deposit: "0.12" }, // 6 - Marrakech
  { cid: "QmEF1gMqN7HdZrQpWv9KwJE4oBLkQpRcUMPxnGe8YwTvLF", rent: "0.12", deposit: "0.06" }, // 7 - Cape Town
  { cid: "QmFG2hNrO8IeAsRqXw0LxKF5pCMkRpSdVNRyoHf9ZxUwMG", rent: "0.4",  deposit: "0.2"  }, // 8 - New York
];

async function main() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log(`\nSeeding contract: ${CONTRACT_ADDRESS}`);
  console.log(`Using signer:     ${deployer.address}\n`);

  const escrow = await ethers.getContractAt("VaultStayEscrow", CONTRACT_ADDRESS);

  // Check current count
  const currentCount = await escrow.rentalCount();
  console.log(`Current rental count on-chain: ${currentCount}`);
  
  if (Number(currentCount) >= 8) {
    console.log("✅ Contract already has 8+ listings. Nothing to seed.");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const startOffset = 7 * 86400; // 7 days from now
  const duration   = 7 * 86400; // 7 day rental

  for (let i = Number(currentCount); i < LISTINGS.length; i++) {
    const listing = LISTINGS[i];
    const start = now + startOffset + i * 3600; // stagger starts by 1 hour each
    const end   = start + duration;

    console.log(`Creating listing ${i + 1}: CID=${listing.cid}`);

    const tx = await escrow.createListing(
      ethers.parseEther(listing.rent),
      ethers.parseEther(listing.deposit),
      BigInt(start),
      BigInt(end),
      listing.cid,
      { gasLimit: 300_000 }
    );

    await tx.wait();
    console.log(`  ✅ Listing ${i + 1} confirmed — tx: ${tx.hash}`);
  }

  const finalCount = await escrow.rentalCount();
  console.log(`\n🎉 Done! Contract now has ${finalCount} listings.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
