// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    ERC20Permit
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract pERC20 is ERC20, ERC20Permit {
    using ECDSA for bytes32;

    error NotAccreditedInvestor(address investor);
    address public manager;
    mapping(address => bool) public accreditedInvestors;

    constructor(
        string memory name,
        string memory symbol,
        address managerAddress,
        uint256 initialSupply
    ) ERC20(name, symbol) ERC20Permit(name) {
        manager = managerAddress;
        accreditedInvestors[managerAddress] = true;
        _mint(manager, initialSupply);
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

    function addAccreditedInvestor(address investor) external {
        // require(
        //     msg.sender == manager,
        //     "Only the manager can add accredited investors"
        // );
        accreditedInvestors[investor] = true;
    }
    //? Can the seller be trusted with admin privileges to add accredited investors?
    //? Do we need a delay or reversal mechanism allowing the asset manager to double check the verifier?
    //?  No need to send any buyer data on chain... simply make it so they have 3 days to send the info or it gets reversed.

    // bytes32 private constant ADD_TYPEHASH =
    //     keccak256("Add(address account,uint256 nonce,uint256 deadline)");
    //! Question for Sean: who should be permitted to call this function? Any token holder?  No, we should require verifiers to do it and force a confirmation that they did
    // how can we trust verifiers?
    // this is the whole shabang: how do we allow this?  What gives verifiers the right to do it?  Can we build a simple system or start with manual?
    // Or do we need a way to keep track of which verifier did what?
    // Do we need to define this at all?
    // function addAccreditedInvestorBySignature(
    //     address investorToAdd,
    //     uint256 nonce,
    //     uint256 deadline,
    //     bytes calldata signature
    // ) external {
    //     require(block.timestamp <= deadline, "signature expired");
    //     bytes32 structHash = keccak256(
    //         abi.encode(ADD_TYPEHASH, investorToAdd, nonce, deadline)
    //     );
    //     bytes32 digest = _hashTypedDataV4(structHash);
    //     address signer = ECDSA.recover(digest, signature);
    //     require(signer != address(0), "invalid signature");
    //     accreditedInvestors[investorToAdd] = true;
    // }

    //! maybe the seller just gives the pDex permission from the beggining.  Have a list of who can add to it as part of the standard?
    // the pDex can be trusted to do what?  It can be trusted to send verifier information to the seller/ asset manager and it
    // can be trusted to send buyer info to the asset manager.  (of course it makes a change as well)
}

//Summary of challenge: We are adding the buyer on the authority of the verifier's signature.
// How does a verifier get this authority?  Do we need a hold period to confirm the verifier's actions by the permissioned token's admin?
// Do we start a massive database of verifiers and their public key?
// Should we expect permissioned tokens to include a separate whitelist just for verifiers? Perhaps, it doesnt need individual wallet whitelist, but only a verifier whitelist?
// In this case only transfers with a signature of a broker dealer can take place ever? We just make a standard for them to sign?
