## The Permissioned Decentralized Exchange (pDEX)

**This repo illustrates how a pDex can take orders offchain, which are matched by a licensed verifier, and broadcast them to the blockchain for execution.**

The pDex smart contract supports EIP-712 signed orders with embedded permit data, allowing users to trade tokens without prior on-chain approvals. This design minimizes gas costs and enhances user experience by enabling seamless token transfers during trade execution. Participants in the pDex ecosystem include sellers, licensed verifiers such as broker/dealers or alternate trading systems, and buyers, all operating within a permissioned framework to ensure compliance and security. Together, these components create an efficient and user-friendly decentralized trading environment for secondary markets of securitized assets.

The stack includes:

- Solidity smart contract implementing the pDex logic with EIP-712 order signing and permit integration.
- TypeScript utilities for constructing and signing EIP-712 orders.
- Test suite validating the pDex functionality and order execution flow.

### pDEX Offchain Signature Structure

The pDEX uses EIP-712 signatures from three entities to authorize and execute trades:

1. **Seller's Order Signature**: The seller signs an EIP-712 order that specifies the trade details, as well as permit data implementing EIP-2612. The payload to be signed includes three parts: the order, the rules, and the permit data.

orderTypes = {
Rule: [
{ name: "ruleType", type: "uint8" }, // enum to determine rule is CONTRACT_ENFORCEABLE or requires OFFCHAIN_VERIFIER
{ name: "key", type: "string" },
{ name: "value", type: "bytes" },
],
Permit: [ //used for EIP 712. Nonce taken from Order
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

2. **Verifier's Approval Signature**: A licensed verifier (e.g., broker/dealer) reviews the seller's order and signs an approval message, indicating that the order complies with regulatory requirements and meets the needs of buyer/ seller.

VerificationTypes = {
Verification: [
{ name: "orderHash", type: "bytes32" },
{ name: "verifier", type: "address" },
{ name: "expiry", type: "uint256" },
.
. //TBD
.
],
BuyerData: [
{ name: "buyer", type: "address" },
{ name: "additionalInfo", type: "string" },
.
. //TBD
.
],
};

3. **Buyer's Execution Transaction**: The buyer signs an EIP-712 payload to confirm their intent to execute the trade.
