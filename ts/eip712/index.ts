import type { TypedDataDomain } from "viem";

// ERC20Permit type (used for signing token permit - includes nonce)
export const erc20PermitTypes = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// Order Types for EIP-712
export const orderTypes = {
  Rule: [
    { name: "ruleType", type: "uint8" }, // enum to determine rule is CONTRACT_ENFORCEABLE or requires OFFCHAIN_VERIFIER
    { name: "key", type: "string" },
    { name: "value", type: "bytes" },
  ],
  Permit: [
    //used for EIP 712. Nonce taken from Order
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  Order: [
    { name: "seller", type: "address" },
    { name: "forSaleTokenAddress", type: "address" },
    { name: "paymentTokenAddress", type: "address" },
    { name: "minVolume", type: "uint256" },
    { name: "maxVolume", type: "uint256" },
    { name: "pricePerToken", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "rules", type: "Rule[]" },
    { name: "permit", type: "Permit" },
  ],
};

// --- EIP-712 Domain ---
export const domain: TypedDataDomain = {
  name: "pDEX",
  version: "1",
  chainId: 31337, // Anvil default
  verifyingContract:
    "0x057ef64e23666f000b34ae31332854acbd1c8544" as `0x${string}`,
};

export const pERC20Domain = {
  name: "pERC20Permit",
  version: "1",
  chainId: 31337, // Anvil default
  verifyingContract:
    "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
};
