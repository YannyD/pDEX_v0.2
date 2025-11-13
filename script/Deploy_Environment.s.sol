// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {pDEX} from "../src/pDEX.sol";
import "./tokens/index.sol";

contract pDEXScript is Script {
    pDEX public pdex;
    pERC20 public permissionedToken;
    MockERC20 public mockTokenA;
    MockERC20 public mockTokenB;
    address seller = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address buyer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address verifier = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address pDexDeployer = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    function setUp() public {
        vm.startPrank(pDexDeployer);
        pdex = new pDEX();
        vm.stopPrank();
        vm.startPrank(seller);
        permissionedToken = new pERC20(
            "Permissioned Token",
            "pTOK",
            msg.sender
        );
        vm.stopPrank();
        vm.startPrank(buyer);
        mockTokenA = new MockERC20("Mock Token A", "mTOKA", 10000000);
        vm.stopPrank();
        // mockTokenB = new MockERC20("Mock Token B", "mTOKB", 10000000);
    }

    function run() public {
        vm.startBroadcast();

        vm.stopBroadcast();
    }
}
