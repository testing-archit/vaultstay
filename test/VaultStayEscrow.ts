import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { VaultStayEscrow } from "../typechain-types";

describe("VaultStayEscrow", function () {
  let escrow: VaultStayEscrow;
  let owner: any;
  let landlord: any;
  let tenant: any;
  let otherAccount: any;

  const RENT = ethers.parseEther("1.0");
  const DEPOSIT = ethers.parseEther("0.5");
  const TOTAL_FUNDING = RENT + DEPOSIT;
  const IPFS_CID = "QmTestCID";

  beforeEach(async function () {
    [owner, landlord, tenant, otherAccount] = await ethers.getSigners();

    const EscrowFactory = await ethers.getContractFactory("VaultStayEscrow");
    escrow = (await EscrowFactory.deploy()) as VaultStayEscrow;
    await escrow.waitForDeployment();
  });

  async function createStandardListing() {
    const start = (await time.latest()) + 3600; // 1 hour from now
    const end = start + 86400; // 1 day after start
    await escrow.connect(landlord).createListing(RENT, DEPOSIT, start, end, IPFS_CID);
    return { start, end, id: 1 };
  }

  describe("Creation", function () {
    it("landlord can create a listing", async function () {
      const { id, start, end } = await createStandardListing();
      const listing = await escrow.getListing(id);

      expect(listing.landlord).to.equal(landlord.address);
      expect(listing.rentAmount).to.equal(RENT);
      expect(listing.depositAmount).to.equal(DEPOSIT);
      expect(listing.startTimestamp).to.equal(start);
      expect(listing.endTimestamp).to.equal(end);
      expect(listing.state).to.equal(0); // Created
      expect(listing.ipfsCID).to.equal(IPFS_CID);
    });
  });

  describe("Funding", function () {
    it("tenant can fund a listing with exact amount", async function () {
      const { id } = await createStandardListing();
      await escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING });
      const listing = await escrow.getListing(id);
      expect(listing.tenant).to.equal(tenant.address);
      expect(listing.state).to.equal(1); // Funded
    });

    it("funding fails with wrong amount", async function () {
      const { id } = await createStandardListing();
      await expect(
        escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING - 1n })
      ).to.be.revertedWith("Incorrect ETH amount");
    });
  });

  describe("Completion (Pull Pattern)", function () {
    it("both parties confirming completion updates pending withdrawals", async function () {
      const { id } = await createStandardListing();
      await escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING });
      await time.increase(3601);
      await escrow.connect(landlord).activateRental(id);

      await escrow.connect(tenant).confirmCompletion(id);
      await escrow.connect(landlord).confirmCompletion(id);

      const listing = await escrow.getListing(id);
      expect(listing.state).to.equal(3); // Completed

      // Check pending balances
      expect(await escrow.pendingWithdrawals(landlord.address)).to.equal(RENT);
      expect(await escrow.pendingWithdrawals(tenant.address)).to.equal(DEPOSIT);
    });

    it("landlord can withdraw funds after completion", async function () {
      const { id } = await createStandardListing();
      await escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING });
      await time.increase(3601);
      await escrow.connect(landlord).activateRental(id);
      await escrow.connect(tenant).confirmCompletion(id);
      await escrow.connect(landlord).confirmCompletion(id);

      const balanceBefore = await ethers.provider.getBalance(landlord.address);
      
      const tx = await escrow.connect(landlord).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(landlord.address);
      
      expect(balanceAfter).to.equal(balanceBefore - gasUsed + RENT);
      expect(await escrow.pendingWithdrawals(landlord.address)).to.equal(0n);
    });
  });

  describe("Cancellation (Pull Pattern)", function () {
    it("tenant can cancel when Funded and withdraw refund", async function () {
      const { id } = await createStandardListing();
      await escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING });

      await escrow.connect(tenant).cancelRental(id);
      
      expect(await escrow.pendingWithdrawals(tenant.address)).to.equal(TOTAL_FUNDING);

      const balanceBefore = await ethers.provider.getBalance(tenant.address);
      const tx = await escrow.connect(tenant).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      expect(await ethers.provider.getBalance(tenant.address)).to.equal(balanceBefore - gasUsed + TOTAL_FUNDING);
    });
  });

  describe("Disputes (Pull Pattern)", function () {
    it("owner resolveDispute updates pending withdrawals for landlord", async function () {
      const { id } = await createStandardListing();
      await escrow.connect(tenant).fundRental(id, { value: TOTAL_FUNDING });
      await time.increase(3601);
      await escrow.connect(landlord).activateRental(id);
      await escrow.connect(tenant).raiseDispute(id);

      await escrow.connect(owner).resolveDispute(id, false); // pay landlord
      
      expect(await escrow.pendingWithdrawals(landlord.address)).to.equal(TOTAL_FUNDING);
    });
  });

  describe("Security Tests", function () {
    it("reentrancy attack on withdraw is blocked", async function () {
      const { id } = await createStandardListing();
      
      const AttackFactory = await ethers.getContractFactory("Attack", tenant);
      const attackContract = await AttackFactory.deploy(await escrow.getAddress());
      await attackContract.waitForDeployment();

      const attackAddress = await attackContract.getAddress();

      // Setup: get funds into the attack contract's pending balance in escrow
      await attackContract.connect(tenant).attackFund(id, { value: TOTAL_FUNDING });
      await attackContract.connect(tenant).initiateCancel();
      
      expect(await escrow.pendingWithdrawals(attackAddress)).to.equal(TOTAL_FUNDING);

      // Reentrancy on withdraw() should be blocked by ReentrancyGuard
      // manifested as "Withdrawal failed" because the outer call catches the inner revert.
      await expect(attackContract.attackWithdraw()).to.be.revertedWith("Withdrawal failed");
    });
  });
});
