import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  parseSignature,
  DeployContractReturnType,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { describe, it, expect, beforeAll } from "vitest";
import * as dotenv from "dotenv";
import { foundry } from "viem/chains";
import pDexAbiJson from "../../out/pDEX.sol/pDEX.json";
import MockERC20AbiJson from "../../out/MockERC20.sol/MockERC20.json";
import pERC20Abi from "../../out/pERC20.sol/pERC20.json";
import * as payloadAssembly from "../utils/PayloadAssembly";
import * as eip712Types from "../eip712/index";

//keys provided by anvil --mnemonic "test test test test test test test test test test test junk"
dotenv.config();
const sellerPrivateKey = process.env.seller_private_key as `0x${string}`;
const buyerPrivateKey = process.env.buyer_private_key as `0x${string}`;
const verifierPrivateKey = process.env.verifier_private_key as `0x${string}`;
const pDexAdminPrivateKey = process.env.pDex_admin_private_key as `0x${string}`;

//Contracts included in this test include:
// pDEX - the main protocol contract
// MockERC20 - a mock payment token implementing ERC20Permit standard
// pERC20 - a sample permissioned security token, which implements ERC20Permit and uses a whitelist
// to restrict transfers for only qualified investors

const pdexABI = pDexAbiJson.abi;
let pDexAddress: `0x${string}`;
const mockERC20ABI = MockERC20AbiJson.abi;
let mockERC20Address: `0x${string}`;
const pERC20ABI = pERC20Abi.abi;
let pERC20Address: `0x${string}`;

let seller: ReturnType<typeof createWalletClient>;
let sellerAddress: `0x${string}`;
let buyer: ReturnType<typeof createWalletClient>;
let buyerAddress: `0x${string}`;
let verifier: ReturnType<typeof createWalletClient>;
let verifierAddress: `0x${string}`;
let pDexAdmin: ReturnType<typeof createWalletClient>;
let pDexAdminAddress: `0x${string}`;
let publicClient: ReturnType<typeof createPublicClient> = createPublicClient({
  chain: foundry,
  transport: http("http://127.0.0.1:8545"),
});

beforeAll(async () => {
  //Initialize all wallet clients for test accounts
  const sellerAccount = privateKeyToAccount(sellerPrivateKey);
  seller = createWalletClient({
    account: sellerAccount,
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
  });
  buyer = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: privateKeyToAccount(buyerPrivateKey),
  });
  verifier = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: privateKeyToAccount(verifierPrivateKey),
  });
  pDexAdmin = createWalletClient({
    chain: foundry,
    transport: http("http://127.0.0.1:8545"),
    account: privateKeyToAccount(pDexAdminPrivateKey),
  });

  pDexAdminAddress = pDexAdmin.account!.address;
  sellerAddress = seller.account!.address;
  buyerAddress = buyer.account!.address;
  verifierAddress = verifier.account!.address;

  //Deploy contracts and set addresses
  // pDEX Deployment
  const pDexContractTx = await pDexAdmin.deployContract({
    abi: pdexABI,
    account: pDexAdminAddress,
    bytecode: pDexAbiJson.bytecode.object as `0x${string}`,
    args: [],
  });
  const pDexContractReceipt = await publicClient.waitForTransactionReceipt({
    hash: pDexContractTx,
  });
  pDexAddress = pDexContractReceipt.contractAddress!;

  //Mock Erc20 Deployment
  const mockERC20ContractTx = await buyer.deployContract({
    abi: mockERC20ABI,
    account: buyerAddress,
    bytecode: MockERC20AbiJson.bytecode.object as `0x${string}`,
    args: ["Mock USD Token", "MUSDT", BigInt(1000000)],
  });
  const mockERC20ContractReceipt = await publicClient.waitForTransactionReceipt(
    {
      hash: mockERC20ContractTx,
    }
  );
  mockERC20Address = mockERC20ContractReceipt.contractAddress!;

  // Permissioned ERC20 Deployment
  const pERC20ContractTx = await seller.deployContract({
    abi: pERC20ABI,
    account: sellerAddress,
    bytecode: pERC20Abi.bytecode.object as `0x${string}`,
    args: ["Permissioned Security Token", "PST", BigInt(1000000)],
  });
  const pERC20ContractReceipt = await publicClient.waitForTransactionReceipt({
    hash: pERC20ContractTx,
  });
  pERC20Address = pERC20ContractReceipt.contractAddress!;
});

const pDEXContract = getContract({
  address: pDexAddress,
  abi: pdexABI,
  client: publicClient,
});

const mockERC20Contract = getContract({
  address: mockERC20Address,
  abi: mockERC20ABI,
  client: publicClient,
});

const pERC20Contract = getContract({
  address: pERC20Address,
  abi: pERC20ABI,
  client: publicClient,
});

describe("Sending transactions to pDEX protocol contracts", () => {
  // it("Should confirm contract deployments", async () => {});
  it("Should match order and successfully send to pDEX", async () => {
    console.log("Starting order submission test...");

    const nonceBeforePermit = await pERC20Contract.read.nonces([
      seller.account!.address,
    ]);
    console.log("nonceBeforePermit:", nonceBeforePermit);
    console.log("nonce type: ", typeof nonceBeforePermit);

    //sign permit for meta-approval
    const permitPayload = {
      owner: seller.account!.address,
      spender: pDexAddress,
      value: "5000",
      nonce: (nonceBeforePermit as bigint).toString(), // viem requires a string
      deadline: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now
    };

    const sellerPermitSignature = await payloadAssembly.signPermit(
      seller,
      permitPayload
    );

    console.log("Permit Signature:", sellerPermitSignature);
    // const { r, s, yParity } = parseSignature(sellerPermitSignature);
    // const v = BigInt(yParity) + 27n; // Ethereum expects 27 or 28

    //construct and sign order
    console.log("pERC20Address: ", pERC20Address);
    console.log("mockERC20Address: ", mockERC20Address);
    //todo: add multiple volumes
    const orderPayload = {
      order: {
        seller: seller.account!.address,
        forSaleTokenAddress: pERC20Address,
        paymentTokenAddress: mockERC20Address,
        minVolume: "100",
        maxVolume: "500000",
        pricePerToken: "20000",
        expiry: (Math.floor(Date.now() / 1000) + 3600).toString(), // 1 hour from now
        nonce: "1",
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
      },
    };

    const orderSignature = await seller.signTypedData({
      account: seller.account!,
      domain: {
        ...eip712Types.domain,
        verifyingContract: pDexAddress,
        chainId: BigInt(foundry.id),
      },
      types: eip712Types.orderTypes,
      primaryType: "Order",
      message: {
        order: orderPayload.order,
        rules: orderPayload.rules,
        permit: orderPayload.permit,
      },
    });
    const initialSellerBalance = await mockERC20Contract.read.balanceOf([
      seller.account!,
    ]);
    //@ts-ignore
    console.log("Initial Seller Balance:", initialSellerBalance.toString());
    const transactionToDEX = await pDEXContract.write.executeOrder({
      //@ts-ignore
      args: [
        {
          ...orderPayload.order,
          rules: orderPayload.rules,
          permit: orderPayload.permit,
        },
        orderSignature,
      ],
      account: verifier.account!,
      gasLimit: 5_000_000n,
    });

    // Log the transaction hash for debugging
    console.log("Transaction hash: ", transactionToDEX);
    const finalResult = await publicClient.waitForTransactionReceipt({
      hash: transactionToDEX,
    });

    const finalSellerBalance = (await mockERC20Contract.read.balanceOf([
      seller.account!,
    ])) as bigint;
    console.log("Final Seller Balance:", finalSellerBalance.toString());
  });
});
