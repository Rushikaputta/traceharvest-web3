// Fill this in after running `npm run deploy:sepolia` (or amoy)
export const CONTRACT_ADDRESS = "0xPASTE_DEPLOYED_ADDRESS_HERE";

// Chain the frontend expects MetaMask to be on. Change to Polygon Amoy's
// chainId (80002) if you deployed there instead of Sepolia (11155111).
export const EXPECTED_CHAIN_ID = 11155111;

// Human-readable chain name for UI display
export const CHAIN_NAME = "Sepolia Testnet";

// Public RPC URL for read-only calls (so students can view batch history
// without MetaMask). Replace with your own Alchemy/Infura key for reliability.
export const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

export const STAGE_LABELS = ["Registered", "In Transit", "At Vendor", "Delivered"];
