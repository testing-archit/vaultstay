import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("CONTRACT_ADDRESS not found in .env");
  }

  const [owner, landlord, tenant] = await ethers.getSigners();
  console.log("Seeding contract at:", address);

  const escrow = await ethers.getContractAt("VaultStayEscrow", address);

  const MOCK_CID_1 = "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy";
  const MOCK_CID_2 = "bafkreihq5xjq6mjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5";

  console.log("Creating listings...");
  
  // Listing 1: Created
  const start1 = Math.floor(Date.now() / 1000) + 86400 * 5;
  const end1 = start1 + 86400 * 3;
  await escrow.connect(landlord).createListing(
    ethers.parseEther("0.1"), 
    ethers.parseEther("0.05"), 
    start1, 
    end1, 
    MOCK_CID_1,
    ethers.ZeroAddress
  );

  // Listing 2: Funded
  const start2 = Math.floor(Date.now() / 1000) + 86400 * 10;
  const end2 = start2 + 86400 * 7;
  await escrow.connect(landlord).createListing(
    ethers.parseEther("0.2"), 
    ethers.parseEther("0.1"), 
    start2, 
    end2, 
    MOCK_CID_2,
    ethers.ZeroAddress
  );
  await escrow.connect(tenant).fundRental(2, { value: ethers.parseEther("0.3") });

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
