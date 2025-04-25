const hre = require("hardhat");

async function main() {
   const feeRecipient = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Замени на твой адрес
   const feePercentage = 50; // 0.5% = 50 базисных пунктов

   const SimpleMixer = await hre.ethers.getContractFactory("SimpleMixer");
   const mixer = await SimpleMixer.deploy(feeRecipient, feePercentage);
   await mixer.waitForDeployment();
   console.log("Mixer deployed to:", mixer.target);
}

main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
});