// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    ERC20Permit
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract pERC20 is ERC20, ERC20Permit {
    error NotAccreditedInvestor(address investor);
    address public manager;
    mapping(address => bool) public accreditedInvestors;

    constructor(
        string memory name,
        string memory symbol,
        address managerAddress
    ) ERC20(name, symbol) ERC20Permit(name) {
        manager = managerAddress;
        accreditedInvestors[managerAddress] = true;
        _mint(manager, 1000000 * 10 ** decimals());
    }

    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (!_isAccredited(to)) {
            revert NotAccreditedInvestor(to);
        }
        super._update(from, to, amount);
    }

    function _isAccredited(address user) internal view returns (bool) {
        return accreditedInvestors[user];
    }
}
