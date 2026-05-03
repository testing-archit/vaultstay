# VaultStay: The Theory of Decentralized Escrow

## 1. Executive Summary
VaultStay is a decentralized, non-custodial short-term rental platform that replaces centralized intermediaries (like Airbnb or Booking.com) with an automated, high-security smart contract state machine. It solves the "trust gap" between landlords and tenants without requiring a predatory 15-20% platform fee.

## 2. The Core Problem
Traditional rental platforms suffer from three systemic flaws:
*   **High Rent Extraction:** Centralized entities charge significant fees to both parties.
*   **Custodial Risk:** The platform holds the money, meaning they can freeze funds, delay payouts, or go bankrupt.
*   **Arbitrary Deplatforming:** Centralized moderators can remove listings or ban users without transparent due process.

## 3. The Technical Architecture

### A. The State Machine (On-Chain)
The heart of VaultStay is a Solidity-based state machine. Every rental follows a strict lifecycle:
1.  **Created:** Landlord lists property (rent + deposit).
2.  **Funded:** Tenant locks 100% of rent + deposit into the contract.
3.  **Active:** Landlord activates the stay (keys handed over).
4.  **Completed:** Both parties confirm, triggering automatic fund release.
5.  **Disputed:** If a conflict arises, funds are frozen until owner-mediated resolution.

### B. Security Pattern: The "Pull" Payment
Unlike traditional "Push" contracts that send money automatically (risking reentrancy attacks or gas-exhaustion DoS), VaultStay implements the **Pull Payment Pattern**. 
*   When a rental completes, the contract simply updates a `pendingWithdrawals` mapping.
*   Users must manually `withdraw()` their funds. 
*   This isolates every transaction, ensuring that one failed transfer cannot block the entire contract.

### C. Account Abstraction (The UX Layer)
VaultStay bridges the "Web3 UX Gap" using:
*   **Privy:** Enables social login (Email/Google). Users don't need to know what a "Seed Phrase" is to start.
*   **Safe Smart Accounts:** Every user is automatically assigned a Safe (ERC-4337) multi-sig wallet.
*   **Pimlico Paymaster:** Infrastructure is ready for **Gasless Transactions**. Landlords can list and tenants can book without ever buying ETH for gas fees.

## 4. Technology Stack
*   **Core:** Solidity ^0.8.20, OpenZeppelin (ReentrancyGuard, Ownable).
*   **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS.
*   **Web3:** Wagmi v2, Viem, Permissionless.js.
*   **Data:** IPFS (Decentralized metadata/images), Subsquid (High-speed indexing).
*   **PWA:** Serwist (Offline support, installable mobile app).

## 5. Why VaultStay is "The Best of Us"

### I. Zero-Knowledge Discovery
By using **IPFS** for property metadata and **Subsquid** for indexing, VaultStay is architected to be a permanent, censorship-resistant protocol. The UI is just one way to access the data; the properties exist forever on the blockchain.

### II. Trustless Security
Most "competitors" use basic multi-sigs or escrow bots. VaultStay uses a **hardened escrow logic** verified with 100% test coverage against reentrancy, unauthorized state transitions, and double-spending.

### III. The "Web2-Feel" Web3 App
We don't sacrifice UX for decentralization. With **Social Login** and **Account Abstraction**, a user can go from "Never used Crypto" to "Booked a Beach House" in under 60 seconds, all while maintaining 100% self-custody of their funds.

### IV. Mobile-First Execution
VaultStay is a **Progressive Web App (PWA)**. It can be installed on an iPhone or Android directly from the browser, bypassing App Store fees and restrictions, further embodying the spirit of true decentralization.

---
*VaultStay: Trust the Code, Not the Middleman.*
