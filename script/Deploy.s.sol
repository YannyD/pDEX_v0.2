// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {pDEX} from "../src/pDEX.sol";

contract pDEXScript is Script {
    pDEX public pdex;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        pdex = new pDEX();

        vm.stopBroadcast();
    }
}
