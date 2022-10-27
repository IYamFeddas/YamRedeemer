const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const ONE_ETHER = 1000000000000000000;
const SIXDECIMALS = 1000000;
const TREASURYRETURN = "0x97990B693835da58A281636296D2Bf02787DEa17";


describe("YamRedeemer Tests", function () {
  async function deployFixture() {
    const ONE_MONTH_AND_WEEK_IN_SECS = 37 * 24 * 60 * 60; 

    const [owner, user2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const yam = await Token.deploy((ONE_ETHER * 100).toString()); // 100 Yam token supply
    const token1 = await Token.deploy(ONE_ETHER.toString());
    const token2 = await Token.deploy((SIXDECIMALS * 2).toString());

    const YamRedeemer = await ethers.getContractFactory("YamRedeemer");
    const yamRedeemer = await YamRedeemer.deploy(yam.address, [token1.address, token2.address], yam.balanceOf(owner.address));


    return { owner, user2, yamRedeemer, yam, token1, token2, ONE_MONTH_AND_WEEK_IN_SECS };
  }

  describe("Token transfering", function () {
    it("Yam minted to owner", async function () {
      const { yam, owner } = await loadFixture(deployFixture);

      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 100).toString());
    });

    it("Token1 minted to owner", async function () {
      const { token1, owner } = await loadFixture(deployFixture);

      expect(await token1.balanceOf(owner.address)).to.equal(ONE_ETHER.toString());
    });

    it("Token2 minted to owner", async function () {
      const { token2, owner } = await loadFixture(deployFixture);

      expect(await token2.balanceOf(owner.address)).to.equal((SIXDECIMALS * 2).toString());
    });

    it("Token1 and Token2 transfered into YamRedeemer and can be redeemed", async function () {
      const { token1, token2, yam, owner, yamRedeemer } = await loadFixture(deployFixture);

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2).toString());

      // redeem 10% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 10).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 10).toString());

      // 10 Yam less
      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 90).toString());

      // yamRedeemer should have 10 yam
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 10).toString());

      // have 10% less treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 0.9).toString());
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal(((SIXDECIMALS * 2) * 0.9).toString());

      // redeeming addres should have 10% of the treasury tokens
      expect(await token1.balanceOf(owner.address)).to.equal((ONE_ETHER * 0.1).toString());
      expect(await token2.balanceOf(owner.address)).to.equal(((SIXDECIMALS * 2) * 0.1).toString());
    });

    it("Token1 and Token2 50% transfer, redeem, transfer rest token1 and token 2, redeem", async function () {
      const { token1, token2, yam, owner, yamRedeemer } = await loadFixture(deployFixture);

      // transfer in 50% balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, (ONE_ETHER * 0.5).toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2 * 0.5).toString());

      // redeem 10% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 10).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 10).toString());

      // transfer in 50% balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, (ONE_ETHER * 0.5).toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2 * 0.5).toString());

      // redeem 10% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 10).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 10).toString());

      // 20 Yam less
      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 80).toString());

      // yamRedeemer should have 20 yam
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 20).toString());

      // have ~14.5% less treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal("844444444444444445");
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal("1688889");

      // redeeming addres should have ~85.5% of the treasury tokens
      expect(await token1.balanceOf(owner.address)).to.equal("155555555555555555");
      expect(await token2.balanceOf(owner.address)).to.equal("311111");
    });


    it("2 addresses redeeming", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer } = await loadFixture(deployFixture);

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2).toString());

      // give user2 yam
      await yam.transfer(user2.address, (ONE_ETHER * 5).toString());

      // redeem 5% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 5).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 5).toString());

      // user2 redeem 5% of Yam supply
      await yam.connect(user2).approve(yamRedeemer.address, (ONE_ETHER * 5).toString());
      await yamRedeemer.connect(user2).redeem(user2.address, (ONE_ETHER * 5).toString());

      // 5 Yam less
      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 90).toString());
      expect(await yam.balanceOf(user2.address)).to.equal("0");

      // yamRedeemer should have 10 yam
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 10).toString());

      // have 10% less treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 0.9).toString());
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal(((SIXDECIMALS * 2) * 0.9).toString());

      // redeeming address should have 5% of the treasury tokens
      expect(await token1.balanceOf(owner.address)).to.equal((ONE_ETHER * 0.05).toString());
      expect(await token2.balanceOf(owner.address)).to.equal(((SIXDECIMALS * 2) * 0.05).toString());
      expect(await token1.balanceOf(user2.address)).to.equal((ONE_ETHER * 0.05).toString());
      expect(await token2.balanceOf(user2.address)).to.equal(((SIXDECIMALS * 2) * 0.05).toString());
    });

    it("Return remaining tokens to Yam Treasury", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer, ONE_MONTH_AND_WEEK_IN_SECS } = await loadFixture(deployFixture);

      const blockAroundStart = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const timeAroundStart = blockAroundStart.timestamp;

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2).toString());

      expect(await token1.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER).toString());
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal((SIXDECIMALS * 2).toString());


      // redeem 90% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 90).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 90).toString());

      await time.increaseTo(timeAroundStart + ONE_MONTH_AND_WEEK_IN_SECS);

      await yamRedeemer.returnToYam();

      // have 0 treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal('0');
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal('0');
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal('0');

      // redeeming address should have 10% of the treasury tokens
      expect(await token1.balanceOf(TREASURYRETURN)).to.equal((ONE_ETHER * 0.1).toString());
      expect(await token2.balanceOf(TREASURYRETURN)).to.equal((SIXDECIMALS * 2 * 0.1).toString());
    });

    it("Returning funds to treasury reverts if too soon", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer, ONE_MONTH_AND_WEEK_IN_SECS } = await loadFixture(deployFixture);

      const blockAroundStart = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const timeAroundStart = blockAroundStart.timestamp;

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (SIXDECIMALS * 2).toString());

      // give user2 yam
      await yam.transfer(user2.address, (ONE_ETHER * 5).toString());

      // redeem 90% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 90).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 90).toString());

      await time.increaseTo(timeAroundStart + ONE_MONTH_AND_WEEK_IN_SECS - 100);

      await expect(yamRedeemer.returnToYam()).to.be.revertedWith(
        "not enough time"
      );
    });

  });

  describe("Param Validation", function () {
    it("Value check: yam address redeemedToken", async function () {
      const { yamRedeemer, yam } = await loadFixture(deployFixture);

      expect(await yamRedeemer.redeemedToken()).to.equal(yam.address);
    });

    it("Value check: returnToTreasury", async function () {
      const { yamRedeemer } = await loadFixture(deployFixture);

      expect(await yamRedeemer.returnToTreasury()).to.equal("0x97990B693835da58A281636296D2Bf02787DEa17");
    });

  });
});
