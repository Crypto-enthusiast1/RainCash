const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleMixer", function () {
   let mixer;
   let owner;
   let otherAccount;

   beforeEach(async function () {
      [owner, otherAccount] = await ethers.getSigners();
      const Mixer = await ethers.getContractFactory("SimpleMixer");
      mixer = await Mixer.deploy();
      await mixer.waitForDeployment();
   });

   describe("Deposit", function () {
      it("should allow a deposit with a valid commitment", async function () {
         const secret = "mysecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));
         const depositAmount = ethers.parseEther("1");

         await expect(mixer.deposit(commitment, { value: depositAmount }))
            .to.emit(mixer, "Deposit")
            .withArgs(commitment);

         expect(await mixer.commitments(commitment)).to.equal(depositAmount);
      });

      it("should fail if deposit amount is 0", async function () {
         const secret = "mysecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));

         await expect(mixer.deposit(commitment, { value: 0 })).to.be.revertedWith(
            "Deposit amount must be greater than 0"
         );
      });

      it("should fail if commitment is already used", async function () {
         const secret = "mysecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));
         const depositAmount = ethers.parseEther("1");

         await mixer.deposit(commitment, { value: depositAmount });

         await expect(mixer.deposit(commitment, { value: depositAmount })).to.be.revertedWith(
            "Commitment already used"
         );
      });
   });

   describe("Withdraw", function () {
      it("should allow withdrawal with a valid secret", async function () {
         const secret = "mysecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));
         const depositAmount = ethers.parseEther("1");

         await mixer.deposit(commitment, { value: depositAmount });

         const initialBalance = await ethers.provider.getBalance(otherAccount.address);

         await expect(mixer.withdraw(commitment, otherAccount.address))
            .to.emit(mixer, "Withdrawal")
            .withArgs(otherAccount.address, depositAmount);

         const finalBalance = await ethers.provider.getBalance(otherAccount.address);
         // Используем оператор + для BigInt вместо .add()
         expect(finalBalance).to.equal(initialBalance + depositAmount);

         expect(await mixer.commitments(commitment)).to.equal(0);
      });

      it("should fail if commitment is invalid or already spent", async function () {
         const secret = "wrongsecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));

         await expect(mixer.withdraw(commitment, otherAccount.address)).to.be.revertedWith(
            "Invalid or already spent commitment"
         );
      });

      it("should fail if trying to withdraw twice", async function () {
         const secret = "mysecret";
         const commitment = ethers.keccak256(ethers.solidityPacked(["string"], [secret]));
         const depositAmount = ethers.parseEther("1");

         await mixer.deposit(commitment, { value: depositAmount });

         await mixer.withdraw(commitment, otherAccount.address);

         await expect(mixer.withdraw(commitment, otherAccount.address)).to.be.revertedWith(
            "Invalid or already spent commitment"
         );
      });
   });
});