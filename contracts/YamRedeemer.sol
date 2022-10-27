// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title contract used to redeem a list of tokens, by permanently
/// taking another token out of circulation.
/// @author IYamFeddas forked from TribeRedeemer

contract YamRedeemer is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice event to track redemptions
    event Redeemed(
        address indexed owner,
        address indexed receiver,
        uint256 amount,
        uint256 base
    );

    /// @notice final event triggered by funds returning to treasury
    event returnedToYam(address txSender);

    /// @notice $YAM token to redeem: 0x0AaCfbeC6a24756c20D41914F2caba817C0d8521
    address public immutable redeemedToken;

    /// @notice tokens to receive when redeeming
    //WETH 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
    //WBTC 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 / 8 * 10
    //DPI 0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b
    //yvCURVE-stETH 0xdCD90C7f6324cfa40d7169ef80b12031770B4325
    //yvUSDC 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9 / 6 * 10
    //USDC Maybe consolidate into yvUSDC? / 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 / 6 * 10
    //All tokens must have a balance otherwise redeem fails
    address[] private tokensReceived;

    /// @notice base used to compute the redemption amounts.
    /// For instance, if the base is 100, and a user provides 100 `redeemedToken`,
    /// they will receive all the balances of each `tokensReceived` held on this contract.
    // Max Total Supply - Treasury YAM and LP Yam/ETH Needs to be unwound and Yam burnt 0x97990B693835da58A281636296D2Bf02787DEa17
    // - Multisig (eth:0x744D16d200175d20E6D8e5f405AEfB4EB7A962d1) - Yam Vesting Pool (0xDCf613db29E4d0B35e7e15e93BF6cc6315eB0b82)
    uint256 public redeemBase;

    /// @notice the timstamp at deploy
    uint256 public deployTimestamp;

    uint256 public oneMonthInSeconds = 30 * 24 * 60 * 60;
    uint256 public oneWeekInSeconds = 7 * 24 * 60 * 60;

    address public returnToTreasury = 0x97990B693835da58A281636296D2Bf02787DEa17; // Yam.Finance Treasury

    constructor(
        address _redeemedToken,
        address[] memory _tokensReceived,
        uint256 _redeemBase
    ) {
        redeemedToken = _redeemedToken;
        tokensReceived = _tokensReceived;
        redeemBase = _redeemBase;
        deployTimestamp = block.timestamp;
    }

    /// @notice Public function to get `tokensReceived`
    function tokensReceivedOnRedeem() public view returns (address[] memory) {
        return tokensReceived;
    }

    /// @notice Return the balances of `tokensReceived` that would be
    /// transferred if redeeming `amountIn` of `redeemedToken`.
    function previewRedeem(uint256 amountIn)
        public
        view
        returns (address[] memory tokens, uint256[] memory amountsOut)
    {
        tokens = tokensReceivedOnRedeem();
        amountsOut = new uint256[](tokens.length);

        uint256 base = redeemBase;
        for (uint256 i = 0; i < tokensReceived.length; i++) {
            uint256 balance = IERC20(tokensReceived[i]).balanceOf(
                address(this)
            );
            require(balance != 0, "ZERO_BALANCE");
            uint256 redeemedAmount = (amountIn * balance) / base;
            amountsOut[i] = redeemedAmount;
        }
    }

    /// @notice Redeem `redeemedToken` for a pro-rata basket of `tokensReceived`
    function redeem(address to, uint256 amountIn) external nonReentrant {
        IERC20(redeemedToken).safeTransferFrom(
            msg.sender,
            address(this),
            amountIn
        );

        (address[] memory tokens, uint256[] memory amountsOut) = previewRedeem(
            amountIn
        );

        uint256 base = redeemBase;
        redeemBase = base - amountIn; 
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).safeTransfer(to, amountsOut[i]);
        }

        emit Redeemed(msg.sender, to, amountIn, base);
    }


    /// @notice returnToYam sends the all remaining funds back to treasury after 37 days
    function returnToYam() external nonReentrant {
        require(
            block.timestamp >= deployTimestamp + oneMonthInSeconds + oneWeekInSeconds,
            "not enough time"
        );

        (address[] memory tokens, uint256[] memory amountsOut) = previewRedeem(
            redeemBase
        );
        redeemBase = 0; 

        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).safeTransfer(returnToTreasury, amountsOut[i]);
        }
        IERC20(redeemedToken).safeTransfer(returnToTreasury, IERC20(redeemedToken).balanceOf(address(this)));

        emit returnedToYam(msg.sender);
    }
}