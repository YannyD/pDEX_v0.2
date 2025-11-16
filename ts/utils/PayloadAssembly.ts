import { WalletClient, createWalletClient } from "viem";
import { signTypedData } from "viem/actions";

import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as types from "../types/index";
import * as eip712Types from "../eip712/index";

export async function signSellerOrder(
  wallet: WalletClient,
  payload: types.OrderPayload
) {
  return await wallet.signTypedData({
    account: wallet.account!,
    domain: eip712Types.domain,
    types: eip712Types.orderTypes,
    primaryType: "Order",
    message: payload,
  });
}

//todo: make this a dynamic function for any erc to be permitted
export async function signPermit(wallet: WalletClient, permit: types.Permit) {
  console.log("Signing permit with wallet account: ", wallet);
  return await wallet.signTypedData({
    account: wallet.account!,
    domain: eip712Types.pERC20Domain,
    types: { Permit: eip712Types.orderTypes.Permit },
    primaryType: "Permit",
    message: permit,
  });
}
