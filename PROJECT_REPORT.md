# VaultStay Master Project Report: Decentralized Rental Escrow

## 1. Overview
VaultStay is a state-of-the-art Decentralized Rental Platform. It solves the trust issue between landlords and tenants by using an automated smart contract escrow. Funds are only released when both parties confirm completion, or through an owner-mediated dispute resolution process.

## 2. Smart Contract Function Reference (VaultStayEscrow.sol)
The following functions comprise the core logic of the VaultStay protocol:

| Function Name | Visibility | Description |
| :--- | :--- | :--- |
| `createListing` | External | Landlords create a new rental listing with rent, deposit, and timestamps. |
| `fundRental` | External (Payable) | Tenants deposit the total required amount (Rent + Deposit) to book a property. |
| `activateRental` | External | Landlord triggers the start of the stay (available after `startTimestamp`). |
| `confirmCompletion` | External | Either party confirms the stay is over. Requires both to trigger fund release. |
| `cancelRental` | External | Handles refunds for `Created` or `Funded` states before the stay starts. |
| `raiseDispute` | External | Transitions the rental to a `Disputed` state, locking funds for mediation. |
| `resolveDispute` | External (Owner Only) | Contract owner resolves a dispute by allocating funds to either party. |
| `withdraw` | External | Users claim their released ETH/Tokens via the Pull Payment Pattern. |
| `autoResolveTimeout` | External | Allows resolution if one party disappears 7 days after the end date. |
| `getListing` | External (View) | Fetches a single `Rental` struct by ID. |
| `getAllListings` | External (View) | Fetches the entire array of all rentals on-chain. |

## 3. Frontend Architecture (React & Wagmi)
The frontend is built for performance and user-centricity.

### Core Components:
- **Navbar:** Global navigation with wallet integration.
- **ActionPanel:** Context-aware control center for managing rental transitions.
- **RentalCard:** Reusable UI for displaying on-chain properties with Supabase metadata.
- **AIAssistant:** Global floating chatbot for user support and semantic search.
- **StateMachineProgress:** Visualizes the 6-stage lifecycle of an escrow.

### Custom React Hooks:
- `useAllListings`: Bypasses wallet connection to fetch listings via `readClient`.
- `useListing`: Fetches detailed state for a specific property.
- `useRentalEvents`: Queries on-chain logs to show the transaction history of a property.
- `useCreateListing`: Handles multi-step creation and IPFS pinning.
- `useWithdraw`: Manages the Pull Payment withdrawal process.

## 4. Data Integration Layer
### Supabase (PostgreSQL)
We use Supabase for off-chain performance optimization.
- **Table: `listings_metadata`**: Stores searchable titles, descriptions, and city data.
- **Table: `rental_events`**: Mirrors on-chain events for rapid dashboard rendering.

### AI Integration (Google Gemini 1.5 Flash)
VaultStay is an "AI-First" dApp.
- **Semantic Search:** Uses the `magicSearch` function to match natural language queries (e.g., "Quiet cabin in the woods") against listing data.
- **Automated Copywriting:** Generates property descriptions based on analyzed images and amenities.
- **Trust Scoring:** Analyzes on-chain landlord history to generate a trust score out of 100.

## 5. Security & Risk Mitigation
- **Non-Custodial:** VaultStay never holds user private keys.
- **Reentrancy Protection:** All financial state changes use `nonReentrant` modifiers.
- **Transparent History:** Every action (Created, Funded, Activated) is verifiable on Etherscan.
- **Pull Payment Security:** Eliminates the "DoS with Unexpected Revert" attack vector.

## 6. Project Roadmap & Future Enhancements
1.  **Arbitrum/Base Deployment:** Lowering gas fees via Layer 2 scaling.
2.  **NFT Keys:** Issuing temporary ERC-721 tokens as digital keys for smart locks.
3.  **Governance:** Transitioning dispute resolution to a DAO-voted jury.
