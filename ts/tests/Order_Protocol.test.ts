import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  parseSignature,
} from "viem";

import { describe, it, expect, beforeAll } from "vitest";
import * as dotenv from "dotenv";
import { foundry } from "viem/chains";
import pDexAbi from "../../out/pDEX.sol/pDEX.json";
import MockERC20Abi from "../../out/MockERC20.sol/MockERC20.json";
import pERC20Abi from "../../out/pERC20.sol/pERC20.json";
import * as payloadAssembly from "../utils/PayloadAssembly";
import * as eip712Types from "../eip712/index";

dotenv.config();
const sellerPrivateKey = process.env.seller_private_key as `0x${string}`;
const buyerPrivateKey = process.env.buyer_private_key as `0x${string}`;
const verifierPrivateKey = process.env.verifier_private_key as `0x${string}`;
const pDexAdminPrivateKey = process.env.pDex_admin_private_key as `0x${string}`;

const pdexABI = pDexAbi.abi;
const mockERC20ABI = MockERC20Abi.abi;
const pERC20ABI = pERC20Abi.abi;

let seller: ReturnType<typeof createWalletClient>;
let buyer: ReturnType<typeof createWalletClient>;
let verifier: ReturnType<typeof createWalletClient>;
let pDexAdmin: ReturnType<typeof createWalletClient>;
let publicClient: ReturnType<typeof createPublicClient> = createPublicClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
});

beforeAll(() => {
  seller = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: sellerPrivateKey,
  });
  buyer = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: buyerPrivateKey,
  });
  verifier = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: verifierPrivateKey,
  });
  pDexAdmin = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: pDexAdminPrivateKey,
  });
});

const pDEXContract = getContract({
  address: "0x057ef64E23666F000b34aE31332854aCBd1c8544",
  abi: pdexABI,
  client: publicClient,
});

const mockERC20Contract = getContract({
  address: "0x8464135c8F25Da09e49BC8782676a84730C318bC",
  abi: mockERC20ABI,
  client: publicClient,
});

const pERC20Contract = getContract({
  address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  abi: pERC20ABI,
  client: publicClient,
});

describe("Sending transactions to pDEX protocol contracts", () => {
  // it("Should confirm contract deployments", async () => {});
  it("Should match order and successfully send to pDEX", async () => {
    //sign permit for meta-approval
    const permitPayload = {
      owner: process.env.sellerWalletAddress as `0x${string}`,
      spender: pDEXContract.address,
      value: "5000",
      nonce: (
        (await pERC20Contract.read.nonces([seller.account!])) as bigint
      ).toString(), // fetch from token
      deadline: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now
    };

    const sellerPermitSignature = await payloadAssembly.signPermit(
      seller,
      permitPayload
    );

    console.log("Permit Signature:", sellerPermitSignature);
    const { r, s, yParity } = parseSignature(sellerPermitSignature);
    const v = BigInt(yParity) + 27n; // Ethereum expects 27 or 28

    //construct and sign order
    //todo: add multiple volumes
    const orderPayload = {
      order: {
        seller: process.env.sellerWalletAddress as `0x${string}`,
        forSaleTokenAddress: pERC20Contract.address,
        paymentTokenAddress: mockERC20Contract.address,
        minVolume: "100",
        maxVolume: "500000",
        pricePerToken: "20000",
        expiry: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now
        nonce: 1n,
      },
      rules: [
        {
          ruleType: 1,
          key: "Location",
          value: "Houston, TX",
        },
      ],
      permit: {
        owner: permitPayload.owner,
        spender: permitPayload.spender,
        value: permitPayload.value,
        nonce: permitPayload.nonce,
        deadline: permitPayload.deadline,
        v: v,
        r: r,
        s: s,
      },
    };

    const orderSignature = await seller.signTypedData({
      account: seller.account!,
      domain: eip712Types.domain,
      types: eip712Types.orderTypes,
      primaryType: "Order",
      message: orderPayload,
    });
  });
});
