## The Permissioned Decentralized Exchange (pDEX)

**This repo illustrates how a pDex can take orders offchain, which are matched by a licensed verifier, and broadcast them to the blockchain for execution.**

The pDex smart contract supports EIP-712 signed orders with embedded permit data, allowing users to trade tokens without prior on-chain approvals. This design minimizes gas costs and enhances user experience by enabling seamless token transfers during trade execution. Participants in the pDex ecosystem include sellers, licensed verifiers such as broker/dealers or alternate trading systems, and buyers, all operating within a permissioned framework to ensure compliance and security. Together, these components create an efficient and user-friendly decentralized trading environment for secondary markets of securitized assets.

The stack includes:

- Solidity smart contract built in foundry implementing the pDex logic with EIP-712 order signing and permit integration.
- TypeScript utilities for constructing and signing EIP-712 orders.
- Test suite validating the pDex functionality and order execution flow.

## Protocol Overview

The pDEX protocol is comprised of an offchain order signing standard, broad definitions for permissioned token implementation, and a smart contract that executes trades submitted by broker/dealer verifiers.

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

### Minimum Permissioned Token Interface

The pDEX protocol assumes that permissioned tokens implement the following minimum interface to support trade execution and compliance. It includes standard ERC-20Permit functions, as well as a whitelist management function.

```solidity
interface IPermissionedToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function addToWhitelist(address account) external;          // needs further design
    function isWhitelisted(address account) external view returns (bool);
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    function nonces(address owner) external view returns (uint256);
### pDEX Smart Contract Functionality

The pDEX smart contracts performs the following checks and operations during trade execution:

1. **Order Validation**: Validates the seller's EIP-712 order signature to ensure authenticity and integrity of the order details.

2. **Permit Verification**: Validates the permit data included in the order, allowing the pDEX contract to transfer tokens on behalf of the seller and buyer without prior on-chain approval.

3. **Add Buyer to permissioned token's whitelist**: The pDEX is given permission to add the buyer to the permissioned token's whitelist on the authority of the verifier's signature.

4. **Trade Execution**: Facilitates the transfer of tokens between the seller and buyer based on the order parameters, utilizing the permit data for seamless token transfers.

5. **Encrypted Data Transfer**: Handles any encrypted buyer information provided by the verifier, ensuring secure transmission to the asset manager as required.
```

### Current research topics

_How can we add the buyer on the authority of the verifier's signature?_

- How does a verifier get this authority?
- Do we need a hold period to confirm the verifier's actions by the permissioned token's admin?
- Do we need a massive database of verifiers and their public key?
- Should we expect permissioned tokens to include a separate whitelist just for verifiers? Perhaps, it doesnt need individual wallet whitelist, but only a verifier whitelist? In this case only transfers with a signature of a broker dealer can take place ever? We just make a standard for them to sign?
- Required transfer agents could be easier than whitelist holder addresses

_What mechanism for permission management is minimally required?_

- What is the current minimal interface for permissioned tokens to support pDEX operations?
  --> maybe each token needs to have a whitelist of verifiers? Any transaction requires a verifier signature?
  --> we make a reigstry that anyone can use, but the permissioned tokens can define whichever registry they want.

Token standard decides which list of people are trusted as a verifier.
We want to make a big registry that that our folks use.
The token issuer can get information about which verifiers conducted the trade.
But we dont want anyone with access to the registry to list all the trades by a single verifier.

Can we do both a holding period and objective verification?

Decision:

- v2 will be a system for a big registry that keeps trades secret
- for now, implement the holding period. Figure our how asset managers are told about cap table updates and make sure
  it can be done. Prob needs some data encryption for public events or run a DID.
- learn more about how traditional data is sent from broker to the AM

"Our objective is not to subvert regulation but to truly make it seamless and auditable"
