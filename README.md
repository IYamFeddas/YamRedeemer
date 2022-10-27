Minimal contract change from TribeRedeemer.
Added a function to return all funds to Yam's treasury after 37days: 
    function returnToYam() external nonReentrant
    uint256 public deployTimestamp;
    uint256 public oneMonthInSeconds = 30 * 24 * 60 * 60;
    uint256 public oneWeekInSeconds = 7 * 24 * 60 * 60;
    address public returnToTreasury = 0x97990B693835da58A281636296D2Bf02787DEa17; // Yam.Finance Treasury

Tested using hardhat:
npx hardhat test

@notice tokens to receive when redeeming
All tokens must have a balance otherwise redeem fails
WETH 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
WBTC(8Decimals) 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
DPI 0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b
yvCURVE-stETH 0xdCD90C7f6324cfa40d7169ef80b12031770B4325
yvUSDC(6Decimals) 0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9

To do before sending funds to redeemer contract
1. Sell all Index token to wETH in Multisig
2. Send all funds in Multisig back to treasury, leave $5000 for misc upkeep and other payments. 
3. Unwind Yam/ETH LP and burn Yam
4. Get status of vesting pool
5. Complete any owed payouts prior to treasury redemption
6. Move Treasury UMA back to treasury
    function withdrawErc20(address erc20Address, uint256 amount) external onlyRoleHolder(roleId) {
        IERC20 erc20 = IERC20(erc20Address);
        erc20.safeTransfer(msg.sender, amount);
    }