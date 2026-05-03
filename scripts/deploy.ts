import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

function updateEnvFile(filePath: string, address: string, label: string) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  ${label} not found at ${filePath}, skipping.`);
    return;
  }
  let content = fs.readFileSync(filePath, "utf8");
  content = content.replace(/CONTRACT_ADDRESS=.*/g, `CONTRACT_ADDRESS=${address}`);
  content = content.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${address}`);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Updated ${label}: ${filePath}`);
}

async function main() {
  console.log("Deploying VaultStayEscrow...");

  const EscrowFactory = await ethers.getContractFactory("VaultStayEscrow");
  const escrow = await EscrowFactory.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`\nVaultStayEscrow deployed to: ${address}\n`);

  const rootEnv   = path.join(__dirname, "../.env");
  const frontendEnv = path.join(__dirname, "../frontend/.env");

  updateEnvFile(rootEnv,     address, "root .env");
  updateEnvFile(frontendEnv, address, "frontend/.env");

  console.log("\n🎉 Both env files are in sync. Restart your frontend dev server to pick up the new address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
