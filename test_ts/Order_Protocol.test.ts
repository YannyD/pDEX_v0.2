import { createPublicClient, http, getContract } from "viem";
import { foundry } from "viem/chains";
import { abi } from "../out/pDEX.sol/pDEX.json";

const client = createPublicClient({
  chain: foundry,
  transport: http(),
});

const contract = getContract({
  address: "0x1234...abcd",
  abi,
  client,
});

async function main() {
  // const value = await contract.read.myFunction();
  // console.log("Value:", value);
}

main();
