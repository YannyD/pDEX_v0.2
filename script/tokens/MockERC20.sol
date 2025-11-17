pragma solidity ^0.8.26;
import {
    ERC20Permit,
    ERC20
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MockERC20Permit is ERC20Permit {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20Permit(name) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}
