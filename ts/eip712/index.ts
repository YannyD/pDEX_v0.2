// Order Types for EIP-712
export const orderTypes = {
  Rule: [
    { name: "ruleType", type: "uint8" },
    { name: "key", type: "string" },
    { name: "value", type: "bytes" },
  ],
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "v", type: "uint8" },
    { name: "r", type: "bytes32" },
    { name: "s", type: "bytes32" },
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
    { name: "rules", type: "Rule[]" }, // include rules here
    { name: "permit", type: "Permit" }, // include permit here
  ],
};

// --- EIP-712 Domain ---
export const domain = {
  name: "pDEXOrder",
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
