# TraceHarvest — Implementation Guide

A working starter kit: Solidity smart contract + Hardhat project + React/ethers.js
frontend with QR-code generation and scanning. Follow the steps in order.

---

## 0. Prerequisites

- Node.js 18+ and npm
- MetaMask browser extension
- A free RPC endpoint for a testnet, e.g. from [Alchemy](https://www.alchemy.com/)
  or [Infura](https://www.infura.io/) — pick **Sepolia** (Ethereum testnet) or
  **Polygon Amoy** (Polygon's current testnet; Mumbai was retired in 2024)
- Free testnet ETH/MATIC from a faucet:
  - Sepolia: https://sepoliafaucet.com or https://www.alchemy.com/faucets/ethereum-sepolia
  - Polygon Amoy: https://faucet.polygon.technology/

---

## 1. Smart contract layer

Files: `contracts/TraceHarvest.sol`, `hardhat.config.js`, `scripts/deploy.js`,
`test/TraceHarvest.test.js`

### What it does
- `registerBatch()` — farmer creates a batch (crop name, farmer name, optional
  IPFS hash of an organic certificate). Returns a `batchId`.
- `markInTransit()` — distributor logs pickup/transport.
- `markAtVendor()` — campus vendor logs arrival.
- `confirmDelivery()` — canteen/hostel logs final receipt.
- Stages are enforced to move strictly forward (`Registered → InTransit →
  AtVendor → Delivered`) so no one can skip or rewrite history.
- `getHistory(batchId)` returns the full immutable timeline — this is what
  powers the QR-scan page.
- Role checks (`isFarmer`, `isDistributor`, etc.) are a simple MVP-level
  permission system. For a real deployment, swap this for OpenZeppelin's
  `AccessControl` library.

### Install and compile

```bash
cd traceharvest-starter
npm install
npm run compile
```

### Run the test suite (no real network needed)

```bash
npm test
```

### Configure secrets

Create a `.env` file in the project root (never commit this):

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=your_wallet_private_key_without_0x_prefix
```

Get the private key from MetaMask: Account menu → Account details → Show
private key. Use a **throwaway/test wallet**, never your main wallet.

### Deploy to Sepolia (or swap for `deploy:amoy`)

```bash
npm run deploy:sepolia
```

This prints the deployed contract address and, for demo convenience, grants
the deployer wallet all four roles (farmer/distributor/vendor/canteen) so you
can walk through the whole flow with one MetaMask account before wiring up
separate accounts for each real role.

**Copy the printed address** — you'll need it in Step 2.

---

## 2. Frontend layer (React + ethers.js + MetaMask + QR)

Files: `frontend/`

### Install

```bash
cd frontend
npm install
```

### Wire up the contract address

Edit `frontend/src/config.js`:

```js
export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS";
export const EXPECTED_CHAIN_ID = 11155111; // Sepolia. Use 80002 for Polygon Amoy.
```

### Run it locally

```bash
npm run dev
```

Open the printed local URL, click **Connect MetaMask**, and:
1. Use the "Register New Batch" form (as the farmer role) to create batch #1.
2. Use "Update Stage" to move it through In Transit → At Vendor → Delivered.
3. Use "Generate QR for a Batch" to produce a scannable QR that links to
   `yourapp.com/?batch=1` — anyone who opens that link (or scans the QR with a
   phone camera) sees the read-only history page, **no wallet or MetaMask
   required**, since it only calls a `view` function.

### How the "student scans QR" flow works
The QR encodes a plain URL with `?batch=<id>`. When the app loads with that
query param, it renders `BatchHistoryView` directly and skips the
farmer/vendor forms — this is the page students actually see.

---

## 3. IPFS for certificates/photos (optional but in the original spec)

Any `ipfsHash` field in the contract is just a string — the contract never
touches IPFS itself, it just stores the pointer. To actually upload files:

1. Sign up for a pinning service (simplest options): [web3.storage](https://web3.storage)
   or [Pinata](https://www.pinata.cloud/) — both have free tiers.
2. In the frontend, before calling `registerBatch`/`markInTransit`, upload the
   file first:

```js
// Example with web3.storage's HTTP API (pseudo-code — check their current SDK docs)
async function uploadToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("https://api.web3.storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${WEB3_STORAGE_API_TOKEN}` },
    body: formData,
  });
  const { cid } = await res.json();
  return cid; // pass this into ipfsHash
}
```

3. Display uploaded docs later via `https://ipfs.io/ipfs/<hash>` (already
   wired up in `BatchHistoryView`).

**Never put an API token in client-side code for a real deployment** — proxy
the upload through a small backend or serverless function so the token stays
secret.

---

## 4. Deploying the frontend live

Any static host works since this is a Vite/React app:

- **Vercel**: `npm i -g vercel` → `vercel` inside `frontend/` → follow prompts.
- **Netlify**: drag-and-drop the `frontend/dist` folder (after `npm run
  build`) into Netlify's dashboard, or connect the GitHub repo.
- **Firebase Hosting** (matches the `hosted.app` link style in your existing
  project): `firebase init hosting` → `npm run build` → `firebase deploy`.

Whatever URL you get is what you print on your batch labels/QR codes.

---

## 5. Suggested demo script (for judges/video)

1. Show the deployed contract on a block explorer (Sepolia: etherscan.io,
   search your contract address) — prove it's really on-chain.
2. As "farmer," register a batch of tomatoes with an IPFS-linked organic cert.
3. As "distributor," mark it in transit with a note like "left cold storage,
   4°C."
4. As "vendor," mark it received at the campus store.
5. As "canteen," confirm delivery to a specific hostel mess.
6. Generate the QR code, then scan it with a phone (or open the URL) to show
   the full, tamper-proof timeline — emphasize that this page needed **no
   login and no trust in a database admin**, since it reads straight from the
   blockchain.
7. Optional: try to "edit" a past stage note in the contract via Etherscan's
   write-contract UI and show it reverts / there's no such function — this is
   the immutability pitch.

---

## 6. Known simplifications to mention in your writeup

- Role management (`grantFarmer`, etc.) is admin-controlled and centralized at
  the "who gets a role" layer — full decentralization would need a DAO or
  multi-sig for role grants. Worth stating explicitly as a limitation/future
  work item, since a judge may ask about it.
- Gas costs: each stage update is a real transaction. On mainnet this would
  cost real money — that's exactly why this is testnet/Polygon-first for an
  MVP; mention Polygon's low fees as the path to production.
- QR codes just encode a URL; nothing stops someone from printing a fake QR
  pointing to a fake batch ID. The trust guarantee is about the *data*,
  once you're looking at the real batch, not about physical label
  authenticity — a good one to preempt in Q&A.
