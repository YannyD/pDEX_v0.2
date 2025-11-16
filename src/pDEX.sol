// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
//todo: sort rules to enforce onchain ones via dex
//todo: send private buyer data
//todo: add options for both erc20-permit and regular approve

// uses eip 712 for orders
// uses eip 7702 for permission
// currently requires ERC20Permit tokens

contract pDEX {
    using ECDSA for bytes32;

    // EIP-712 Domain Separator ensures signature is unqiuely tied to this contract, conforming to the EIP-712 standard.
    bytes32 public DOMAIN_SEPARATOR;
    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("pDEX")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // The Order struct defines required details for a proposed token sale. It includes a nested array of Rules
    // as well as PermitData that enables token transfer for ERC20Permit compatible tokens.

    struct Order {
        address seller;
        address forSaleTokenAddress;
        address paymentTokenAddress;
        uint256 minVolume;
        uint256 maxVolume;
        uint256 pricePerToken;
        uint256 expiry;
        uint256 nonce;
        Rule[] rules;
        PermitData permit;
    }

    // The Rule struct defines conditions for limited partners holding regulated tokens.
    // the ruleType value represents an enum value that indicates whether the rule can be contract enforcable
    // or requires offchain verification.

    // enum RuleType {
    //   CONTRACT_ENFORCEABLE = 0,
    //   OFFCHAIN_VERIFIER = 1
    // }
    struct Rule {
        uint8 ruleType;
        string key;
        bytes value;
    }
    enum ruleType {
        CONTRACT_ENFORCEABLE,
        OFFCHAIN_VERIFIER
    }
    struct PermitData {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    bytes32 public constant ORDER_TYPEHASH =
        keccak256(
            "Order(address seller,address forSaleTokenAddress,address paymentTokenAddress,uint256 minVolume,uint256 maxVolume,uint256 pricePerToken,uint256 expiry,uint256 nonce,Rule[] rules,PermitData permit)"
            "Rule(uint8 ruleType,string key,bytes value)"
            "PermitData(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    bytes32 public constant RULE_TYPEHASH =
        keccak256("Rule(uint8 ruleType,string key,bytes value)");

    //required when NOT using ERC20Permit
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    mapping(address => mapping(uint256 => bool)) public filledOrders;

    //Internal hashing functions are used to recompute the EIP-712 struct hashes for Rules, Permits, and Orders.
    function _hashRule(Rule memory rule) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    RULE_TYPEHASH,
                    rule.ruleType,
                    keccak256(bytes(rule.key)),
                    keccak256(rule.value)
                )
            );
    }

    function _hashPermit(
        PermitData memory permit
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "Permit(address owner,address spender,uint256 value,uint256 deadline, uint8 v, bytes32 r, bytes32 s)"
                    ),
                    permit.owner,
                    permit.spender,
                    permit.value,
                    permit.deadline,
                    permit.v,
                    permit.r,
                    permit.s
                )
            );
    }

    //hash order with rules
    function _hashOrder(Order memory order) internal pure returns (bytes32) {
        bytes32[] memory ruleHashes = new bytes32[](order.rules.length);
        for (uint256 i = 0; i < order.rules.length; i++) {
            ruleHashes[i] = _hashRule(order.rules[i]);
        }
        return
            keccak256(
                abi.encode(
                    ORDER_TYPEHASH,
                    order.seller,
                    order.forSaleTokenAddress,
                    order.paymentTokenAddress,
                    order.minVolume,
                    order.maxVolume,
                    order.pricePerToken,
                    order.expiry,
                    order.nonce,
                    keccak256(abi.encodePacked(ruleHashes)),
                    _hashPermit(order.permit)
                )
            );
    }

    //compute order digest with eip-712
    function _computeOrderDigest(
        Order memory order
    ) internal view returns (bytes32) {
        bytes32 structHash = _hashOrder(order);
        return
            keccak256(
                abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
            );
    }

    // ----------------------------------------
    // Execute Orders
    // ----------------------------------------

    /**
     *@notice Execute a trade based on a signed order
     *@param order The order details
     *@param signature The seller's signature on the order
     */

    function executeTrade(
        Order calldata order,
        bytes calldata signature
    ) external {
        //todo confirm rules

        require(block.timestamp <= order.expiry, "expired"); //ensure order not expired
        require(
            !filledOrders[order.seller][order.nonce],
            "Order already filled"
        ); // Check if order is already filled

        // Verify order signature
        bytes32 digest = _computeOrderDigest(order);
        address signer = ECDSA.recover(digest, signature);
        require(signer == order.seller, "Invalid signature");

        // Mark order as filled
        filledOrders[order.seller][order.nonce] = true;

        //Call permit to allow DEX to transfer tokens on behalf of seller
        require(block.timestamp < order.permit.deadline, "Permit expired"); // Check if permit is expired
        //! confirm permit expiration works
        IERC20Permit(order.forSaleTokenAddress).permit(
            order.permit.owner,
            order.permit.spender,
            order.permit.value,
            order.permit.deadline,
            order.permit.v,
            order.permit.r,
            order.permit.s
        );
        IERC20(order.forSaleTokenAddress).transferFrom(
            order.seller,
            msg.sender,
            order.maxVolume
        );
        //todo: buyer permit
        //todo: transfer tokens
        //todo: display public information
    }
}
