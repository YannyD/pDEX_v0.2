// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {pDEX} from "../src/pDEX.sol";
import "./tokens/index.sol";

contract DeployEnvironment is Script {
    pDEX public pdex;
    pERC20 public permissionedToken;
    MockERC20 public mockTokenA;
    MockERC20 public mockTokenB;
    address seller = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    uint256 sellerPrivateKey =
        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address buyer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    uint256 buyerPrivateKey =
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address verifier = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    uint256 verifierPrivateKey =
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    address pDexDeployer = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
    uint256 pDexDeployerPrivateKey =
        0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    function run() public {
        vm.startBroadcast(pDexDeployerPrivateKey);
        pdex = new pDEX();
        console.log("pDEX deployed at:", address(pdex));
        vm.stopBroadcast();

        vm.startBroadcast(sellerPrivateKey);
        permissionedToken = new pERC20("Permissioned Token", "pTOK", seller);
        console.log(
            "Permissioned Token deployed at:",
            address(permissionedToken)
        );
        vm.stopBroadcast();

        vm.startBroadcast(buyerPrivateKey);
        mockTokenA = new MockERC20("Mock Token A", "mTOKA", 10000000);
        console.log("Mock Token A deployed at:", address(mockTokenA));
        vm.stopBroadcast();
    }
}
