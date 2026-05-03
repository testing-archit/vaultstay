import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
  const [owner, landlord, tenant, other] = await ethers.getSigners();

  console.log("Attempting to connect to VaultStayEscrow at deployed address...");

  const EscrowFactory = await ethers.getContractFactory("VaultStayEscrow");
  
  // Since we don't have the address passed here, we'll assume the deploy script has been run 
  // on a local node and we deploy a NEW one for seeding, OR we read it. For local dev, a fresh deploy + seed is easier.
  // We will deploy a fresh contract for seeding if none is provided.
  const escrow = await EscrowFactory.deploy();
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();
  
  console.log(`\n======================================================`);
  console.log(`VaultStayEscrow automatically deployed to: ${address}`);
  console.log(`Use this address in your frontend .env.local file!`);
  console.log(`======================================================\n`);

  const MOCK_CID_1 = "bafkreifzjuqb5p3jthn3qszj5njybbmwhdptwwhff3m476ntm6e2b6pvyy";
  const MOCK_CID_2 = "bafkreihq5xjq6mjsm3gxw4u5i4p5z4x4v5h5h5p5r5z5x5v5h5";
  const MOCK_CID_3 = "bafkreigf3vqvf5k6b7a5p5h5x4u5i4p5z4x4v5h5h5p5r5z5x5v5";

  // 1. Created Listing
  const start1 = Math.floor(Date.now() / 1000) + 86400 * 5; // 5 days from now
  const end1 = start1 + 86400 * 3; // 3 days later
  await escrow.connect(landlord).createListing(
    ethers.parseEther("0.1"), 
    ethers.parseEther("0.05"), 
    start1, 
    end1, 
    MOCK_CID_1
  );
  console.log("Created Listing 1 (State: Created) by Landlord");

  // 2. Funded Listing
  const start2 = Math.floor(Date.now() / 1000) + 86400 * 10;
  const end2 = start2 + 86400 * 7;
  await escrow.connect(owner).createListing(
    ethers.parseEther("0.2"), 
    ethers.parseEther("0.1"), 
    start2, 
    end2, 
    MOCK_CID_2
  );
  await escrow.connect(tenant).fundRental(2, { value: ethers.parseEther("0.3") });
  console.log("Created Listing 2 (State: Funded by Tenant) by Owner");

  // 3. Active Listing (Start in past, End in future for local network)
  // Hardhat time needs manipulating if we want it past start time but for simplicity we'll just manipulate network time.
  const start3 = await time.latest() + 200; // start slightly in future
  const end3 = start3 + 86400 * 14;
  await escrow.connect(landlord).createListing(
    ethers.parseEther("0.5"), 
    ethers.parseEther("0.2"), 
    start3, 
    end3, 
    MOCK_CID_3
  );
  await escrow.connect(tenant).fundRental(3, { value: ethers.parseEther("0.7") });
  
  // Advance time so it's active
  await time.increase(300);
  await escrow.connect(landlord).activateRental(3);
  console.log("Created Listing 3 (State: Active) by Landlord, funded by Tenant");

  console.log("\nSeed completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
