// --- order typed data definition ---
// Rules require an enum to determine if they are contract enforceable or being affirmed by
// the verifier off-chain.

// enum RuleType {
//   CONTRACT_ENFORCEABLE = 0,
//   OFFCHAIN_VERIFIER = 1
// }
export interface Rule {
  ruleType: number; // uint8
  key: string;
  value: string; // bytes or hex string
}

export interface Permit extends Record<string, unknown> {
  owner: string; // address
  spender: string; // address
  value: string; // uint256 as string
  nonce: string; // uint256 as string
  deadline: string; // uint256 as string (timestamp)
  // v: number; // uint8
  // r: string; // bytes32 as hex string
  // s: string; // bytes32 as hex string
}

// Order type (uint256 fields as strings)
export interface Order {
  seller: string; // address
  forSaleTokenAddress: string; // address
  paymentTokenAddress: string; // address
  minVolume: string; // uint256 as string
  maxVolume: string; // uint256 as string
  pricePerToken: string; // uint256 as string
  expiry: string; // uint256 as string (timestamp)
  nonce: string; // uint256 as string
}

// Payload including order + rules
export interface OrderPayload extends Record<string, unknown> {
  order: Order;
  rules: Rule[];
  permit: Permit;
}

// Buyer data
export interface BuyerData {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO string
  residentialAddress: string;
  accreditation: number; // uint8
}

// Verification data
export interface Verification {
  entityType: number; // uint8
  confirmRulesMet: boolean;
  verificationEntityAddress: string; // address
  sellerPackageHash: string; // bytes
  buyerPackageHash: string; // bytes
  verifiersFINRAID: string;
}

// Combined payload
export interface VerificationPayload {
  verification: Verification;
  buyerData: BuyerData;
}

// --- verification typed data definition ---

// EntityType enum to define type of verification entity
// enum EntityType {
//   BROKER_DEALER = 0,
//   ALTERNATIVE_TRADING_SYSTEM = 1,
// }

// Accreditation enum to define buyer accreditation level
// enum Accreditation {
//   ACCREDITED_INVESTOR = 0,
//   QUALIFIED_PURCHASER = 1,
//   INSTITUTIONAL = 2,
// }
const verificationTypes = {
  Verification: [
    { name: "entityType", type: "uint8" },
    { name: "confirmRulesMet", type: "boolean" },
    { name: "verificationEntityAddress", type: "address" },
    { name: "sellerPackageHash", type: "bytes" },
    { name: "buyerPackageHash", type: "bytes" },
    { name: "verifiersFINRAID", type: "string" },
  ],
  Buyer_Data: [
    { name: "firstName", type: "string" },
    { name: "lastName", type: "string" },
    { name: "dateOfBirth", type: "string" },
    { name: "residentialAddress", type: "string" },
    { name: "accreditation", type: "uint8" },
  ],
};
