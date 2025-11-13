// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract pDEX {
    event TradeExecuted(
        address indexed seller,
        address indexed buyer,
        address verifier,
        address tokenSold,
        address tokenBought,
        uint256 amountSold,
        uint256 amountBought,
        uint256 indexed tradeId
    );
    uint256 public tradesMade;

    function executeTrade(
        address seller,
        address buyer,
        address verifier,
        address tokenSold,
        address tokenBought,
        uint256 amountSold,
        uint256 amountBought,
        uint256 tradeId
    ) public {
        tradesMade++;
        emit TradeExecuted(
            seller,
            buyer,
            verifier,
            tokenSold,
            tokenBought,
            amountSold,
            amountBought,
            tradeId
        );
    }
}
