// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

//todo: add buyer order
//todo: add verifier signature
//todo: implement hold and approve period for pDEX transactions when verifier submits for the first time.  Add them to whitelist for all future txs.  Is the whitelist on the issuance layer or the pDEX?  I think it should be on the pdex level.
//todo: send private buyer data via DID
//todo: confirm all correct data being transfered and collected
//todo: implement multiple volume orders
//todo: sort rules to enforce onchain ones via dex
//todo: make verifier add accredited investors
//todo: add options for both erc20-permit and regular approve

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
        Permit permit;
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
    struct Permit {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
    }

    struct PurchaseAgreement {
        address buyer;
        uint256 volume;
    }
    // bytes buyerData; // Could be a hash or encrypted data

    // Could be a hash or encrypted data
    bytes32 public constant ORDER_TYPEHASH =
        keccak256(
            "Order(address seller,address forSaleTokenAddress,address paymentTokenAddress,uint256 minVolume,uint256 maxVolume,uint256 pricePerToken,uint256 expiry,uint256 nonce,Rule[] rules,Permit permit)"
            "Permit(address owner,address spender,uint256 value,uint256 deadline)"
            "Rule(uint8 ruleType,string key,bytes value)"
        );

    bytes32 public constant RULE_TYPEHASH =
        keccak256("Rule(uint8 ruleType,string key,bytes value)");

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

    function _hashPermit(Permit memory permit) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "Permit(address owner,address spender,uint256 value,uint256 deadline)"
                    ),
                    permit.owner,
                    permit.spender,
                    permit.value,
                    permit.deadline
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

    // Public view function for testing
    function computeOrderDigest(
        Order memory order
    ) public view returns (bytes32) {
        return _computeOrderDigest(order);
    }

    function _hashPurchaseAgreement(
        PurchaseAgreement memory agreement
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "PurchaseAgreement(address buyer,uint256 volume)"
                    ),
                    agreement.buyer,
                    agreement.volume
                )
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
        bytes calldata sellerSignature,
        uint8 sellerPermitV,
        bytes32 sellerPermitR,
        bytes32 sellerPermitS,
        PurchaseAgreement calldata purchaseAgreement,
        bytes calldata buyerSignature,
        uint8 buyerPermitV,
        bytes32 buyerPermitR,
        bytes32 buyerPermitS
    ) external {
        require(block.timestamp <= order.expiry, "expired"); //ensure order not expired
        require(
            !filledOrders[order.seller][order.nonce],
            "Order already filled"
        ); // Check if order is already filled

        // Verify order signature
        bytes32 digest = _computeOrderDigest(order);
        address signer = ECDSA.recover(digest, sellerSignature);
        require(signer == order.seller, "Invalid signature");

        // Mark order as filled
        filledOrders[order.seller][order.nonce] = true;

        //Call permit to allow DEX to transfer tokens on behalf of seller
        require(block.timestamp < order.permit.deadline, "Permit expired"); // Check if permit is expired

        IERC20Permit(order.forSaleTokenAddress).permit(
            order.permit.owner,
            order.permit.spender,
            order.permit.value,
            order.permit.deadline,
            sellerPermitV,
            sellerPermitR,
            sellerPermitS
        );

        // Add buyer to the whitelist of the permissioned token
        //? this is the main question, how can we be satisfied with this addition?  Who does it?
        bytes4 selector = bytes4(keccak256("addAccreditedInvestor(address)"));
        (bool ok, bytes memory data) = order.forSaleTokenAddress.call(
            abi.encodeWithSelector(selector, address(this))
        );

        IERC20(order.forSaleTokenAddress).transferFrom(
            order.seller,
            address(this),
            order.permit.value
        );
    }
}
