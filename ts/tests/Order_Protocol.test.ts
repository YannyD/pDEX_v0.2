import {
  createPublicClient,
  http,
  getContract,
  createWalletClient,
  parseSignature,
  DeployContractReturnType,
  TypedDataDomain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { describe, it, expect, beforeAll } from "vitest";
import * as dotenv from "dotenv";
import { foundry } from "viem/chains";
import pDexAbiJson from "../../out/pDEX.sol/pDEX.json";
import MockERC20AbiJson from "../../out/MockERC20.sol/MockERC20Permit.json";
import pERC20AbiJson from "../../out/pERC20.sol/pERC20.json";
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
let pDexContract: DeployContractReturnType;
const mockERC20ABI = MockERC20AbiJson.abi;
let mockERC20Address: `0x${string}`;
let mockERC20Contract: DeployContractReturnType;
const pERC20ABI = pERC20AbiJson.abi;
let pERC20Address: `0x${string}`;
let pERC20Contract: DeployContractReturnType;

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
  console.log("pDexAddress:", pDexAddress);

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
    bytecode: pERC20AbiJson.bytecode.object as `0x${string}`,
    args: [
      "Permissioned Security Token",
      "PST",
      sellerAddress,
      BigInt(1000000),
    ],
  });
  const pERC20ContractReceipt = await publicClient.waitForTransactionReceipt({
    hash: pERC20ContractTx,
  });
  pERC20Address = pERC20ContractReceipt.contractAddress!;

  pDexContract = getContract({
    address: pDexAddress,
    abi: pdexABI,
    client: publicClient,
  });

  mockERC20Contract = getContract({
    address: mockERC20Address,
    abi: mockERC20ABI,
    client: publicClient,
  });

  pERC20Contract = getContract({
    address: pERC20Address,
    abi: pERC20ABI,
    client: publicClient,
  });
});

describe("Sending transactions to pDEX protocol contracts", () => {
  it("Should match order and successfully send to pDEX", async () => {
    console.log("Starting order submission test...");

    //sign permit for meta-approval
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60); // 1 hour from now
    console.log("pErc20 Address: ", pERC20Address);
    console.log("Seller Address: ", sellerAddress);

    const nonceBeforePermit = await publicClient.readContract({
      address: pERC20Address,
      abi: pERC20ABI,
      functionName: "nonces",
      args: [sellerAddress],
    });
    console.log("Nonce before permit:", nonceBeforePermit);
    //todo: make the permit value dynamic based on order size or purchase agreement
    //! Question for Sean:  will multiple signatures be sent and verifier has to choose the correct one?

    // todo when handling with and without approve note that a nonce may be needed again here or we can simplify with one nonce in order
    const permitPayload = {
      owner: sellerAddress,
      spender: pDexAddress,
      value: BigInt(5000),
      nonce: nonceBeforePermit,
      deadline: deadline,
    };

    const chainId = await publicClient.getChainId();

    const permitDomain = {
      name: "Permissioned Security Token",
      version: "1",
      chainId: chainId,
      verifyingContract: pERC20Address,
    };

    const sellerPermitSignature = await seller.signTypedData({
      account: seller.account!,
      domain: permitDomain,
      types: { Permit: eip712Types.orderTypes.Permit },
      primaryType: "Permit",
      message: permitPayload,
    });

    const { r, s, v } = parseSignature(sellerPermitSignature);

    //construct and sign order
    //todo: add multiple volumes
    const orderPayload = {
      order: {
        seller: sellerAddress,
        forSaleTokenAddress: pERC20Address,
        paymentTokenAddress: mockERC20Address,
        minVolume: BigInt("100"),
        maxVolume: BigInt("500000"),
        pricePerToken: BigInt("20000"),
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
        nonce: nonceBeforePermit, //reuse permit nonce for simplicity
      },
      rules: [
        {
          ruleType: 1,
          key: "Location",
          value: "0x" + Buffer.from("Houston, TX").toString("hex"),
        },
      ],
      permit: {
        owner: permitPayload.owner,
        spender: permitPayload.spender,
        value: permitPayload.value,
        deadline: permitPayload.deadline,
      },
    };

    const orderDomain: TypedDataDomain = {
      name: "pDEX",
      version: "1",
      chainId: chainId,
      verifyingContract: pDexAddress,
    };

    const orderSignature = await seller.signTypedData({
      account: seller.account!,
      domain: orderDomain,
      types: eip712Types.orderTypes,
      primaryType: "Order",
      message: {
        ...orderPayload.order,
        rules: orderPayload.rules,
        permit: orderPayload.permit,
      },
    });
    // const initialSellerBalance: any = await mockERC20Contract.read.balanceOf([
    //   seller.account!,
    // ]);

    const initialSellerPErc20Balance: any = await publicClient.readContract({
      address: pERC20Address,
      abi: pERC20ABI,
      functionName: "balanceOf",
      args: [sellerAddress],
    });

    console.log(
      "Initial Seller pERC20 Balance:",
      initialSellerPErc20Balance.toString()
    );

    // console.log("Initial Seller Balance:", initialSellerBalance);

    const transactionToDEX = await verifier.writeContract({
      address: pDexAddress,
      abi: pdexABI,
      functionName: "executeTrade",
      args: [
        {
          ...orderPayload.order,
          rules: orderPayload.rules,
          permit: orderPayload.permit,
        },
        orderSignature,
        v,
        r,
        s,
      ],
    });

    // Log the transaction hash for debugging
    console.log("Transaction hash: ", transactionToDEX);
    const finalResult = await publicClient.waitForTransactionReceipt({
      hash: transactionToDEX,
    });

    // const finalSellerBalance = (await mockERC20Contract.read.balanceOf([
    //   seller.account!,
    // ])) as bigint;
    // console.log("Final Seller Balance:", finalSellerBalance.toString());
    const finalSellerPErc20Balance = await publicClient.readContract({
      address: pERC20Address,
      abi: pERC20ABI,
      functionName: "balanceOf",
      args: [sellerAddress],
    });
    console.log(
      "Final Seller pERC20 Balance:",
      finalSellerPErc20Balance.toString()
    );

    expect(finalSellerPErc20Balance).toBe(
      initialSellerPErc20Balance - BigInt(orderPayload.permit.value)
    );
  });
});
