## The Permissioned Decentralized Exchange (pDEX)

**This repo illustrates how a pDex can take orders offchain, which are matched by a licensed verifier, and broadcast them to the blockchain for execution.**

The pDex smart contract supports EIP-712 signed orders with embedded permit data, allowing users to trade tokens without prior on-chain approvals. This design minimizes gas costs and enhances user experience by enabling seamless token transfers during trade execution. Participants in the pDex ecosystem include sellers, licensed verifiers such as broker/dealers or alternate trading systems, and buyers, all operating within a permissioned framework to ensure compliance and security. Together, these components create an efficient and user-friendly decentralized trading environment for secondary markets of securitized assets.

The stack includes:

- Solidity smart contract implementing the pDex logic with EIP-712 order signing and permit integration.
- TypeScript utilities for constructing and signing EIP-712 orders.
- Test suite validating the pDex functionality and order execution flow.
